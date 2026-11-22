/**
 * Acesso ao banco para lancamentos.
 *
 * Toda consulta filtra por usuario_id vindo do token. O parcelamento e gravado
 * dentro de uma transacao: ou todas as parcelas entram, ou nenhuma entra.
 */

import { randomUUID } from 'node:crypto';
import { comTransacao, consultar } from '../config/db.js';
import { centavosParaReais, valorParaCentavos } from '../middlewares/validadores.js';
import { gerarParcelas } from './regras-parcelamento.js';
import { calcularPaginacao } from './regras-consulta.js';

const COLUNAS = `l.id,
  l.tipo,
  l.descricao,
  l.valor::text AS valor,
  l.data::text AS data,
  l.parcela_atual,
  l.total_parcelas,
  l.grupo_parcelamento,
  c.id AS categoria_id,
  c.nome AS categoria_nome,
  f.id AS fonte_id,
  f.nome AS fonte_nome,
  f.tipo AS fonte_tipo`;

function mapear(linha) {
  return {
    id: linha.id,
    tipo: linha.tipo,
    descricao: linha.descricao,
    valor: linha.valor,
    valorCentavos: valorParaCentavos(linha.valor),
    data: linha.data,
    categoria: { id: linha.categoria_id, nome: linha.categoria_nome },
    fonteDestino: { id: linha.fonte_id, nome: linha.fonte_nome, tipo: linha.fonte_tipo },
    parcelaAtual: linha.parcela_atual,
    totalParcelas: linha.total_parcelas,
    grupoParcelamento: linha.grupo_parcelamento,
  };
}

/** Lista com filtros, paginacao e totais do periodo (nao so da pagina). */
export async function listar({ usuarioId, inicio, fim, tipo, categoriaId, fonteDestinoId, pagina, porPagina }) {
  const condicoes = ['l.usuario_id = $1', 'l.data >= $2', 'l.data <= $3'];
  const parametros = [usuarioId, inicio, fim];

  const adicionarFiltro = (coluna, valor) => {
    parametros.push(valor);
    condicoes.push(`${coluna} = $${parametros.length}`);
  };

  if (tipo) adicionarFiltro('l.tipo', tipo);
  if (categoriaId) adicionarFiltro('l.categoria_id', categoriaId);
  if (fonteDestinoId) adicionarFiltro('l.fonte_destino_id', fonteDestinoId);

  const onde = condicoes.join(' AND ');

  const { rows: contagem } = await consultar(
    `SELECT COUNT(*)::int AS total FROM lancamentos l WHERE ${onde}`,
    parametros,
  );

  const paginacao = calcularPaginacao({
    totalItens: contagem[0].total,
    pagina,
    porPagina,
  });

  const { rows } = await consultar(
    `SELECT ${COLUNAS}
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE ${onde}
      ORDER BY l.data DESC, l.id DESC
      LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
    [...parametros, paginacao.porPagina, paginacao.offset],
  );

  const { rows: soma } = await consultar(
    `SELECT COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor END), 0)::text AS entradas,
            COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor END), 0)::text AS saidas
       FROM lancamentos l
      WHERE ${onde}`,
    parametros,
  );

  const entradas = valorParaCentavos(soma[0].entradas) ?? 0;
  const saidas = valorParaCentavos(soma[0].saidas) ?? 0;

  return {
    itens: rows.map(mapear),
    paginacao: {
      pagina: paginacao.pagina,
      porPagina: paginacao.porPagina,
      totalItens: paginacao.totalItens,
      totalPaginas: paginacao.totalPaginas,
    },
    totais: {
      entradas: centavosParaReais(entradas),
      saidas: centavosParaReais(saidas),
      saldo: centavosParaReais(entradas - saidas),
    },
    totaisCentavos: { entradas, saidas, saldo: entradas - saidas },
  };
}

export async function buscarPorId(usuarioId, id) {
  const { rows } = await consultar(
    `SELECT ${COLUNAS}
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.id = $2 AND l.usuario_id = $1`,
    [usuarioId, id],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

/** Cria um lancamento simples (uma parcela). */
export async function criar({ usuarioId, tipo, descricao, valorCentavos, data, categoriaId, fonteDestinoId }) {
  const { rows } = await consultar(
    `INSERT INTO lancamentos
       (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1, NULL)
     RETURNING id`,
    [usuarioId, tipo, descricao, centavosParaReais(valorCentavos), data, categoriaId, fonteDestinoId],
  );
  return buscarPorId(usuarioId, rows[0].id);
}

/**
 * Cria todas as parcelas em uma unica transacao.
 * A divisao dos centavos vem de regras-parcelamento, ja testada.
 */
export async function criarParcelado({
  usuarioId,
  tipo,
  descricao,
  valorCentavos,
  data,
  categoriaId,
  fonteDestinoId,
  totalParcelas,
}) {
  const parcelas = gerarParcelas({
    valorCentavos,
    totalParcelas,
    dataPrimeiraParcela: data,
  });

  const grupoParcelamento = randomUUID();

  const criadas = await comTransacao(async (cliente) => {
    const resultado = [];

    for (const parcela of parcelas) {
      const { rows } = await cliente.query(
        `INSERT INTO lancamentos
           (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, parcela_atual, total_parcelas, valor::text AS valor, data::text AS data`,
        [
          usuarioId,
          tipo,
          descricao,
          centavosParaReais(parcela.valorCentavos),
          parcela.data,
          categoriaId,
          fonteDestinoId,
          parcela.parcelaAtual,
          totalParcelas,
          grupoParcelamento,
        ],
      );

      const linha = rows[0];
      resultado.push({
        id: linha.id,
        parcelaAtual: linha.parcela_atual,
        totalParcelas: linha.total_parcelas,
        valor: linha.valor,
        valorCentavos: valorParaCentavos(linha.valor),
        data: linha.data,
      });
    }

    return resultado;
  });

  return {
    grupoParcelamento,
    totalParcelas,
    valorTotal: centavosParaReais(valorCentavos),
    parcelas: criadas,
  };
}

export async function atualizar(usuarioId, id, { tipo, descricao, valorCentavos, data, categoriaId, fonteDestinoId }) {
  const { rows } = await consultar(
    `UPDATE lancamentos
        SET tipo = $3,
            descricao = $4,
            valor = $5,
            data = $6,
            categoria_id = $7,
            fonte_destino_id = $8
      WHERE id = $2 AND usuario_id = $1
      RETURNING id`,
    [
      usuarioId,
      id,
      tipo,
      descricao,
      centavosParaReais(valorCentavos),
      data,
      categoriaId,
      fonteDestinoId,
    ],
  );

  if (!rows[0]) return null;
  return buscarPorId(usuarioId, id);
}

/**
 * Exclui uma parcela ou todas as parcelas do grupo.
 * Retorna null quando o lancamento nao existe para o usuario.
 */
export async function excluir({ usuarioId, id, escopo }) {
  const { rows: alvo } = await consultar(
    'SELECT id, grupo_parcelamento FROM lancamentos WHERE id = $2 AND usuario_id = $1',
    [usuarioId, id],
  );

  if (!alvo[0]) return null;

  if (escopo === 'grupo' && alvo[0].grupo_parcelamento) {
    const { rowCount } = await consultar(
      'DELETE FROM lancamentos WHERE usuario_id = $1 AND grupo_parcelamento = $2',
      [usuarioId, alvo[0].grupo_parcelamento],
    );
    return { excluidos: rowCount };
  }

  await consultar('DELETE FROM lancamentos WHERE id = $2 AND usuario_id = $1', [usuarioId, id]);
  return { excluidos: 1 };
}

/** Soma de entradas e saidas no periodo, usada por dashboard e relatorios. */
export async function totaisDoPeriodo({ usuarioId, inicio, fim }) {
  const { rows } = await consultar(
    `SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0)::text AS entradas,
            COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0)::text AS saidas
       FROM lancamentos
      WHERE usuario_id = $1 AND data >= $2 AND data <= $3`,
    [usuarioId, inicio, fim],
  );

  const entradas = valorParaCentavos(rows[0].entradas) ?? 0;
  const saidas = valorParaCentavos(rows[0].saidas) ?? 0;

  return {
    entradas: centavosParaReais(entradas),
    saidas: centavosParaReais(saidas),
    saldo: centavosParaReais(entradas - saidas),
    entradasCentavos: entradas,
    saidasCentavos: saidas,
    saldoCentavos: entradas - saidas,
  };
}
