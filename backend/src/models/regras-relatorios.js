/**
 * Regra de negocio pura dos relatorios.
 *
 * Recebe lancamentos ja normalizados (em centavos) e devolve as agregacoes
 * prontas para a resposta da API. Nenhuma soma e feita no front-end.
 *
 * Formato de entrada dos lancamentos:
 *   { tipo: 'entrada' | 'saida', valorCentavos: number, categoriaId: number,
 *     categoriaNome: string, fonteDestinoId: number }
 */

import { somarCentavos } from './regras-parcelamento.js';

/** Arredonda para o numero de casas informado, sem erro de representacao. */
export function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

/** Percentual de uma parte sobre o total, com duas casas decimais. */
export function calcularPercentual(parteCentavos, totalCentavos) {
  if (!Number.isInteger(parteCentavos) || !Number.isInteger(totalCentavos)) {
    throw new TypeError('calcularPercentual espera inteiros de centavos.');
  }
  if (totalCentavos <= 0) return 0;
  return arredondar((parteCentavos * 100) / totalCentavos, 2);
}

/**
 * Compara um total com o do periodo anterior.
 * Quando o periodo anterior era zero e o atual nao e, a variacao percentual nao
 * existe (divisao por zero) e a categoria e tratada como nova: tendencia
 * 'aumento' com variacaoPercentual null.
 */
export function variacaoPercentual(atualCentavos, anteriorCentavos) {
  if (!Number.isInteger(atualCentavos) || !Number.isInteger(anteriorCentavos)) {
    throw new TypeError('variacaoPercentual espera inteiros de centavos.');
  }
  if (anteriorCentavos === 0) {
    if (atualCentavos === 0) {
      return { variacaoPercentual: 0, tendencia: 'estavel', nova: false };
    }
    return { variacaoPercentual: null, tendencia: 'aumento', nova: true };
  }

  const variacao = arredondar(((atualCentavos - anteriorCentavos) * 100) / anteriorCentavos, 2);
  let tendencia = 'estavel';
  if (variacao > 0) tendencia = 'aumento';
  else if (variacao < 0) tendencia = 'reducao';

  return { variacaoPercentual: variacao, tendencia, nova: false };
}

/** Agrupa lancamentos por categoria e tipo, somando em centavos. */
export function agruparPorCategoria(lancamentos, tipo) {
  if (!Array.isArray(lancamentos)) throw new TypeError('agruparPorCategoria espera um array.');

  const mapa = new Map();
  for (const lancamento of lancamentos) {
    if (lancamento.tipo !== tipo) continue;
    if (!Number.isInteger(lancamento.valorCentavos)) {
      throw new TypeError('valorCentavos deve ser inteiro.');
    }
    const chave = lancamento.categoriaId;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        categoriaId: lancamento.categoriaId,
        nome: lancamento.categoriaNome,
        totalCentavos: 0,
      });
    }
    mapa.get(chave).totalCentavos += lancamento.valorCentavos;
  }

  return [...mapa.values()].sort((a, b) => b.totalCentavos - a.totalCentavos || a.nome.localeCompare(b.nome));
}

/** Totais de entradas, saidas e saldo de uma lista de lancamentos. */
export function calcularTotais(lancamentos) {
  if (!Array.isArray(lancamentos)) throw new TypeError('calcularTotais espera um array.');

  const entradas = somarCentavos(
    lancamentos.filter((lancamento) => lancamento.tipo === 'entrada').map((lancamento) => lancamento.valorCentavos),
  );
  const saidas = somarCentavos(
    lancamentos.filter((lancamento) => lancamento.tipo === 'saida').map((lancamento) => lancamento.valorCentavos),
  );

  return { entradasCentavos: entradas, saidasCentavos: saidas, saldoCentavos: entradas - saidas };
}

/**
 * Relatorio por categoria (RF7).
 *
 * @param {object} entrada
 * @param {Array} entrada.lancamentosAtual Lancamentos do periodo consultado.
 * @param {Array} [entrada.lancamentosAnterior] Lancamentos do periodo anterior de mesmo tamanho.
 * @param {object} [entrada.periodo] Metadados do periodo, devolvidos como vieram.
 * @param {object} [entrada.periodoAnterior] Metadados do periodo anterior.
 */
export function montarRelatorioCategorias({
  lancamentosAtual,
  lancamentosAnterior = [],
  periodo = null,
  periodoAnterior: metadadosPeriodoAnterior = null,
} = {}) {
  const totaisAtuais = calcularTotais(lancamentosAtual);
  const totaisAnteriores = calcularTotais(lancamentosAnterior);

  const saidasAtuais = agruparPorCategoria(lancamentosAtual, 'saida');
  const saidasAnteriores = new Map(
    agruparPorCategoria(lancamentosAnterior, 'saida').map((item) => [item.categoriaId, item.totalCentavos]),
  );

  const saidasPorCategoria = saidasAtuais.map((item) => {
    const totalAnterior = saidasAnteriores.get(item.categoriaId) ?? 0;
    const comparacao = variacaoPercentual(item.totalCentavos, totalAnterior);
    return {
      categoriaId: item.categoriaId,
      nome: item.nome,
      totalCentavos: item.totalCentavos,
      percentual: calcularPercentual(item.totalCentavos, totaisAtuais.saidasCentavos),
      totalPeriodoAnteriorCentavos: totalAnterior,
      variacaoPercentual: comparacao.variacaoPercentual,
      tendencia: comparacao.tendencia,
      categoriaNova: comparacao.nova,
    };
  });

  const entradasPorCategoria = agruparPorCategoria(lancamentosAtual, 'entrada').map((item) => ({
    categoriaId: item.categoriaId,
    nome: item.nome,
    totalCentavos: item.totalCentavos,
    percentual: calcularPercentual(item.totalCentavos, totaisAtuais.entradasCentavos),
  }));

  return {
    periodo,
    periodoAnterior: metadadosPeriodoAnterior,
    totalSaidasCentavos: totaisAtuais.saidasCentavos,
    totalEntradasCentavos: totaisAtuais.entradasCentavos,
    saldoCentavos: totaisAtuais.saldoCentavos,
    variacaoTotalSaidas: variacaoPercentual(totaisAtuais.saidasCentavos, totaisAnteriores.saidasCentavos),
    saidasPorCategoria,
    entradasPorCategoria,
  };
}

/**
 * Relatorio por fonte/destino (RF8).
 *
 * @param {object} entrada
 * @param {Array} entrada.lancamentos Lancamentos do periodo.
 * @param {Array<{id:number, nome:string, tipo:string}>} entrada.fontesDestinos Cadastro de fontes/destinos do usuario.
 * @param {object} [entrada.periodo] Metadados do periodo.
 */
export function montarRelatorioFontesDestinos({ lancamentos, fontesDestinos, periodo = null } = {}) {
  const cadastro = new Map(fontesDestinos.map((fonte) => [fonte.id, fonte]));
  const acumulado = new Map();

  for (const lancamento of lancamentos) {
    if (!Number.isInteger(lancamento.valorCentavos)) throw new TypeError('valorCentavos deve ser inteiro.');
    const chave = lancamento.fonteDestinoId;
    if (!acumulado.has(chave)) {
      acumulado.set(chave, { entradasCentavos: 0, saidasCentavos: 0 });
    }
    const item = acumulado.get(chave);
    if (lancamento.tipo === 'entrada') item.entradasCentavos += lancamento.valorCentavos;
    else item.saidasCentavos += lancamento.valorCentavos;
  }

  const nomeDe = (id) => cadastro.get(id)?.nome ?? 'Origem removida';
  const tipoDe = (id) => cadastro.get(id)?.tipo ?? 'desconhecido';

  const entradasPorFonte = [...acumulado.entries()]
    .filter(([, item]) => item.entradasCentavos > 0)
    .map(([id, item]) => ({
      fonteDestinoId: id,
      nome: nomeDe(id),
      tipo: tipoDe(id),
      totalCentavos: item.entradasCentavos,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);

  const saidasPorDestino = [...acumulado.entries()]
    .filter(([, item]) => item.saidasCentavos > 0)
    .map(([id, item]) => ({
      fonteDestinoId: id,
      nome: nomeDe(id),
      tipo: tipoDe(id),
      totalCentavos: item.saidasCentavos,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);

  const saldoPorConta = fontesDestinos
    .filter((fonte) => fonte.tipo === 'conta')
    .map((fonte) => {
      const item = acumulado.get(fonte.id) ?? { entradasCentavos: 0, saidasCentavos: 0 };
      return {
        fonteDestinoId: fonte.id,
        nome: fonte.nome,
        entradasCentavos: item.entradasCentavos,
        saidasCentavos: item.saidasCentavos,
        saldoCentavos: item.entradasCentavos - item.saidasCentavos,
      };
    })
    .sort((a, b) => b.saldoCentavos - a.saldoCentavos);

  return { periodo, entradasPorFonte, saidasPorDestino, saldoPorConta };
}
