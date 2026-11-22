/**
 * Consultas agregadas dos relatorios.
 *
 * As somas sao feitas no banco com GROUP BY e SUM, nunca no front-end.
 * Percentuais, variacoes e ordenacao usam as funcoes puras de
 * regras-relatorios, que ja tem teste automatizado.
 */

import { consultar } from '../config/db.js';
import { centavosParaReais, valorParaCentavos } from '../middlewares/validadores.js';
import { calcularPercentual, variacaoPercentual } from './regras-relatorios.js';
import { somarCentavos } from './regras-parcelamento.js';

async function somasPorCategoria({ usuarioId, inicio, fim, tipo }) {
  const { rows } = await consultar(
    `SELECT c.id AS categoria_id, c.nome, SUM(l.valor)::text AS total
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.tipo = $4
        AND l.data >= $2
        AND l.data <= $3
      GROUP BY c.id, c.nome
      ORDER BY SUM(l.valor) DESC, c.nome`,
    [usuarioId, inicio, fim, tipo],
  );

  return rows.map((linha) => ({
    categoriaId: linha.categoria_id,
    nome: linha.nome,
    totalCentavos: valorParaCentavos(linha.total),
  }));
}

/** RF7 — relatorio por categoria com comparacao ao periodo anterior. */
export async function relatorioPorCategoria({ usuarioId, inicio, fim, inicioAnterior, fimAnterior, periodo, periodoAnteriorMetadados }) {
  const [saidas, entradas, saidasAnteriores] = await Promise.all([
    somasPorCategoria({ usuarioId, inicio, fim, tipo: 'saida' }),
    somasPorCategoria({ usuarioId, inicio, fim, tipo: 'entrada' }),
    somasPorCategoria({ usuarioId, inicio: inicioAnterior, fim: fimAnterior, tipo: 'saida' }),
  ]);

  const totalSaidas = somarCentavos(saidas.map((item) => item.totalCentavos));
  const totalEntradas = somarCentavos(entradas.map((item) => item.totalCentavos));
  const totalSaidasAnterior = somarCentavos(saidasAnteriores.map((item) => item.totalCentavos));

  const anterioresPorCategoria = new Map(saidasAnteriores.map((item) => [item.categoriaId, item.totalCentavos]));

  const saidasPorCategoria = saidas.map((item) => {
    const totalAnterior = anterioresPorCategoria.get(item.categoriaId) ?? 0;
    const comparacao = variacaoPercentual(item.totalCentavos, totalAnterior);

    return {
      categoriaId: item.categoriaId,
      nome: item.nome,
      totalCentavos: item.totalCentavos,
      total: centavosParaReais(item.totalCentavos),
      percentual: calcularPercentual(item.totalCentavos, totalSaidas),
      totalPeriodoAnteriorCentavos: totalAnterior,
      totalPeriodoAnterior: centavosParaReais(totalAnterior),
      variacaoPercentual: comparacao.variacaoPercentual,
      tendencia: comparacao.tendencia,
      categoriaNova: comparacao.nova,
    };
  });

  const entradasPorCategoria = entradas.map((item) => ({
    categoriaId: item.categoriaId,
    nome: item.nome,
    totalCentavos: item.totalCentavos,
    total: centavosParaReais(item.totalCentavos),
    percentual: calcularPercentual(item.totalCentavos, totalEntradas),
  }));

  return {
    periodo,
    periodoAnterior: periodoAnteriorMetadados,
    totalSaidas: centavosParaReais(totalSaidas),
    totalEntradas: centavosParaReais(totalEntradas),
    saldo: centavosParaReais(totalEntradas - totalSaidas),
    totalSaidasCentavos: totalSaidas,
    totalEntradasCentavos: totalEntradas,
    variacaoTotalSaidas: variacaoPercentual(totalSaidas, totalSaidasAnterior),
    saidasPorCategoria,
    entradasPorCategoria,
  };
}

/** RF8 — relatorio por fonte/destino. */
export async function relatorioPorFonteDestino({ usuarioId, inicio, fim, periodo }) {
  const { rows } = await consultar(
    `SELECT f.id AS fonte_destino_id,
            f.nome,
            f.tipo,
            l.tipo AS tipo_lancamento,
            SUM(l.valor)::text AS total
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = $1
        AND l.data >= $2
        AND l.data <= $3
      GROUP BY f.id, f.nome, f.tipo, l.tipo
      ORDER BY SUM(l.valor) DESC`,
    [usuarioId, inicio, fim],
  );

  const entradasPorFonte = [];
  const saidasPorDestino = [];
  const acumulado = new Map();

  for (const linha of rows) {
    const totalCentavos = valorParaCentavos(linha.total);

    if (linha.tipo_lancamento === 'entrada') {
      entradasPorFonte.push({
        fonteDestinoId: linha.fonte_destino_id,
        nome: linha.nome,
        tipo: linha.tipo,
        totalCentavos,
        total: centavosParaReais(totalCentavos),
      });
    } else {
      saidasPorDestino.push({
        fonteDestinoId: linha.fonte_destino_id,
        nome: linha.nome,
        tipo: linha.tipo,
        totalCentavos,
        total: centavosParaReais(totalCentavos),
      });
    }

    if (!acumulado.has(linha.fonte_destino_id)) {
      acumulado.set(linha.fonte_destino_id, {
        fonteDestinoId: linha.fonte_destino_id,
        nome: linha.nome,
        tipo: linha.tipo,
        entradasCentavos: 0,
        saidasCentavos: 0,
      });
    }

    const item = acumulado.get(linha.fonte_destino_id);
    if (linha.tipo_lancamento === 'entrada') item.entradasCentavos += totalCentavos;
    else item.saidasCentavos += totalCentavos;
  }

  const saldoPorConta = [...acumulado.values()]
    .filter((item) => item.tipo === 'conta')
    .map((item) => ({
      fonteDestinoId: item.fonteDestinoId,
      nome: item.nome,
      entradas: centavosParaReais(item.entradasCentavos),
      saidas: centavosParaReais(item.saidasCentavos),
      saldo: centavosParaReais(item.entradasCentavos - item.saidasCentavos),
      saldoCentavos: item.entradasCentavos - item.saidasCentavos,
    }))
    .sort((a, b) => b.saldoCentavos - a.saldoCentavos);

  return { periodo, entradasPorFonte, saidasPorDestino, saldoPorConta };
}
