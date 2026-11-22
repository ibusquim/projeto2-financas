/**
 * Acesso ao banco para fontes/destinos (renda, conta e cartao de credito).
 */

import { consultar } from '../config/db.js';
import { centavosParaReais, valorParaCentavos } from '../middlewares/validadores.js';

function mapear(linha) {
  const base = { id: linha.id, nome: linha.nome, tipo: linha.tipo };

  if (linha.tipo === 'cartao_credito') {
    return {
      ...base,
      diaFechamento: linha.dia_fechamento,
      diaVencimento: linha.dia_vencimento,
      limite: linha.limite,
      limiteCentavos: valorParaCentavos(linha.limite),
    };
  }

  return base;
}

export async function listar(usuarioId, tipo) {
  const parametros = [usuarioId];
  let filtroTipo = '';
  if (tipo) {
    parametros.push(tipo);
    filtroTipo = ' AND tipo = $2';
  }

  const { rows } = await consultar(
    `SELECT id, nome, tipo, dia_fechamento, dia_vencimento, limite::text AS limite
       FROM fontes_destinos
      WHERE usuario_id = $1${filtroTipo}
      ORDER BY tipo, nome`,
    parametros,
  );

  return rows.map(mapear);
}

export async function criar(usuarioId, { nome, tipo, diaFechamento, diaVencimento, limiteCentavos }) {
  const ehCartao = tipo === 'cartao_credito';
  const { rows } = await consultar(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nome, tipo, dia_fechamento, dia_vencimento, limite::text AS limite`,
    [
      usuarioId,
      nome,
      tipo,
      ehCartao ? diaFechamento : null,
      ehCartao ? diaVencimento : null,
      ehCartao ? centavosParaReais(limiteCentavos) : null,
    ],
  );
  return mapear(rows[0]);
}

export async function atualizar(usuarioId, id, { nome, tipo, diaFechamento, diaVencimento, limiteCentavos }) {
  const ehCartao = tipo === 'cartao_credito';
  const { rows } = await consultar(
    `UPDATE fontes_destinos
        SET nome = $3,
            tipo = $4,
            dia_fechamento = $5,
            dia_vencimento = $6,
            limite = $7
      WHERE id = $2 AND usuario_id = $1
      RETURNING id, nome, tipo, dia_fechamento, dia_vencimento, limite::text AS limite`,
    [
      usuarioId,
      id,
      nome,
      tipo,
      ehCartao ? diaFechamento : null,
      ehCartao ? diaVencimento : null,
      ehCartao ? centavosParaReais(limiteCentavos) : null,
    ],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

export async function excluir(usuarioId, id) {
  const { rows } = await consultar(
    'DELETE FROM fontes_destinos WHERE id = $2 AND usuario_id = $1 RETURNING id',
    [usuarioId, id],
  );
  return rows[0] ?? null;
}

export async function buscarPorIdDoUsuario(usuarioId, id) {
  const { rows } = await consultar(
    `SELECT id, nome, tipo, dia_fechamento, dia_vencimento, limite::text AS limite
       FROM fontes_destinos
      WHERE id = $2 AND usuario_id = $1`,
    [usuarioId, id],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

export async function contarLancamentos(usuarioId, id) {
  const { rows } = await consultar(
    'SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1 AND fonte_destino_id = $2',
    [usuarioId, id],
  );
  return rows[0].total;
}
