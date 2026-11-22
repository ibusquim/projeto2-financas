/**
 * Regra de negocio pura da previsao de faturas de cartao de credito.
 *
 * Regras implementadas, conforme o enunciado e o contrato da API:
 *  1. Compra ANTES do dia de fechamento entra na fatura que fecha no mesmo mes.
 *  2. Compra NO dia do fechamento ou DEPOIS entra na fatura do mes seguinte.
 *  3. A parcela k cai k - 1 meses depois da fatura da primeira parcela.
 *  4. Se o dia de vencimento for maior que o dia de fechamento, o vencimento cai
 *     no mesmo mes do fechamento; caso contrario, no mes seguinte.
 *  5. Dias inexistentes no mes sao ajustados para o ultimo dia do mes.
 *  6. O mes de referencia da fatura e o mes do VENCIMENTO.
 *
 * A comparacao do item 4 usa os dias declarados no cadastro do cartao, para ser
 * literal em relacao ao enunciado e facil de explicar na apresentacao.
 */

import {
  adicionarMeses,
  adicionarMesesDataIso,
  desmembrarDataIso,
  formatarMesReferencia,
  montarDataIso,
} from './regras-datas.js';
import { somarCentavos } from './regras-parcelamento.js';

/**
 * Calcula em qual fatura uma parcela cai.
 *
 * @param {object} entrada
 * @param {string} entrada.dataCompra Data da compra original (AAAA-MM-DD).
 * @param {number} entrada.diaFechamento Dia de fechamento do cartao (1 a 31).
 * @param {number} entrada.diaVencimento Dia de vencimento do cartao (1 a 31).
 * @param {number} [entrada.parcelaAtual=1] Numero da parcela, comecando em 1.
 * @returns {{mesReferencia: string, fechamento: string, vencimento: string}}
 */
export function calcularFatura({ dataCompra, diaFechamento, diaVencimento, parcelaAtual = 1 }) {
  if (!Number.isInteger(diaFechamento) || diaFechamento < 1 || diaFechamento > 31) {
    throw new RangeError('Dia de fechamento invalido.');
  }
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) {
    throw new RangeError('Dia de vencimento invalido.');
  }
  if (!Number.isInteger(parcelaAtual) || parcelaAtual < 1 || parcelaAtual > 48) {
    throw new RangeError('Numero da parcela invalido.');
  }

  const { ano, mes, dia } = desmembrarDataIso(dataCompra);

  // Regra 1 e 2: define o mes do primeiro fechamento.
  const fechamentoNoMesDaCompra = montarDataIso(ano, mes, diaFechamento);
  const diaFechamentoEfetivo = Number(fechamentoNoMesDaCompra.slice(8, 10));

  let mesFechamento = { ano, mes };
  if (dia >= diaFechamentoEfetivo) {
    mesFechamento = adicionarMeses(ano, mes, 1);
  }

  // Regra 3: a parcela k avanca k - 1 meses.
  mesFechamento = adicionarMeses(mesFechamento.ano, mesFechamento.mes, parcelaAtual - 1);

  const fechamento = montarDataIso(mesFechamento.ano, mesFechamento.mes, diaFechamento);

  // Regra 4: vencimento no mesmo mes ou no mes seguinte ao fechamento.
  let mesVencimento;
  if (diaVencimento > diaFechamento) {
    mesVencimento = { ano: mesFechamento.ano, mes: mesFechamento.mes };
  } else {
    mesVencimento = adicionarMeses(mesFechamento.ano, mesFechamento.mes, 1);
  }

  const vencimento = montarDataIso(mesVencimento.ano, mesVencimento.mes, diaVencimento);

  return {
    mesReferencia: formatarMesReferencia(mesVencimento.ano, mesVencimento.mes),
    fechamento,
    vencimento,
  };
}

/** Status de uma fatura em relacao a uma data de referencia. */
export function statusFatura({ fechamento, vencimento }, dataReferencia) {
  if (dataReferencia < fechamento) return 'aberta';
  if (dataReferencia < vencimento) return 'fechada';
  return 'vencida';
}

/**
 * Data da compra original de uma parcela ja gravada.
 * Prefere `dataCompra` quando existir; caso contrario, volta (parcelaAtual - 1)
 * meses a partir da data da parcela.
 */
function dataCompraDaParcela(parcela) {
  if (parcela.dataCompra) return parcela.dataCompra;
  const parcelasAnteriores = (parcela.parcelaAtual ?? 1) - 1;
  return adicionarMesesDataIso(parcela.data, -parcelasAnteriores);
}

/**
 * Agrupa parcelas por fatura, ordenando por mes de referencia.
 *
 * @param {object} entrada
 * @param {Array<{id:number|string, descricao:string, valorCentavos:number, data:string, dataCompra?:string, parcelaAtual?:number, totalParcelas?:number}>} entrada.parcelas
 * @param {number} entrada.diaFechamento
 * @param {number} entrada.diaVencimento
 * @param {string} [entrada.dataReferencia] Data usada para o status (padrao: nao calcula status).
 */
export function agruparParcelasPorFatura({ parcelas, diaFechamento, diaVencimento, dataReferencia }) {
  if (!Array.isArray(parcelas)) throw new TypeError('agruparParcelasPorFatura espera um array de parcelas.');

  const mapa = new Map();

  for (const parcela of parcelas) {
    const totalParcelas = parcela.totalParcelas ?? 1;
    const parcelaAtual = parcela.parcelaAtual ?? 1;

    const fatura = calcularFatura({
      dataCompra: dataCompraDaParcela(parcela),
      diaFechamento,
      diaVencimento,
      parcelaAtual,
    });

    if (!mapa.has(fatura.mesReferencia)) {
      mapa.set(fatura.mesReferencia, {
        mesReferencia: fatura.mesReferencia,
        fechamento: fatura.fechamento,
        vencimento: fatura.vencimento,
        totalCentavos: 0,
        itens: [],
      });
    }

    const grupo = mapa.get(fatura.mesReferencia);
    grupo.itens.push({
      lancamentoId: parcela.id,
      descricao: parcela.descricao,
      parcelaAtual,
      totalParcelas,
      valorCentavos: parcela.valorCentavos,
      rotuloParcela: `${parcela.descricao} - ${parcelaAtual}/${totalParcelas}`,
    });
    grupo.totalCentavos += parcela.valorCentavos;
  }

  return [...mapa.values()]
    .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia))
    .map((grupo) => {
      const itens = grupo.itens.sort((a, b) => a.lancamentoId - b.lancamentoId);
      const resultado = { ...grupo, itens };
      if (dataReferencia) {
        resultado.status = statusFatura(grupo, dataReferencia);
      }
      return resultado;
    });
}

/**
 * Limite utilizado: soma de todas as parcelas cujo vencimento ainda nao chegou
 * (vencimento maior ou igual a data de referencia).
 */
export function somarParcelasNaoVencidas({ parcelas, diaFechamento, diaVencimento, dataReferencia }) {
  if (!Array.isArray(parcelas)) throw new TypeError('somarParcelasNaoVencidas espera um array de parcelas.');

  const valores = parcelas
    .filter((parcela) => {
      const fatura = calcularFatura({
        dataCompra: dataCompraDaParcela(parcela),
        diaFechamento,
        diaVencimento,
        parcelaAtual: parcela.parcelaAtual ?? 1,
      });
      return fatura.vencimento >= dataReferencia;
    })
    .map((parcela) => parcela.valorCentavos);

  return somarCentavos(valores);
}

/**
 * Previsao completa: fatura atual e as proximas N faturas, com limite utilizado
 * e disponivel. `faturas` sempre inclui pelo menos a proxima fatura aberta.
 */
export function previsaoFaturas({ parcelas, diaFechamento, diaVencimento, limiteCentavos, dataReferencia, quantidadeFaturas = 3 }) {
  const todas = agruparParcelasPorFatura({ parcelas, diaFechamento, diaVencimento, dataReferencia });

  // A fatura corrente precisa aparecer mesmo quando o cartao ainda nao tem
  // compras: sem isso o usuario nao ve a fatura aberta do mes.
  if (dataReferencia) {
    const corrente = calcularFatura({
      dataCompra: dataReferencia,
      diaFechamento,
      diaVencimento,
      parcelaAtual: 1,
    });

    const jaExiste = todas.some((fatura) => fatura.mesReferencia === corrente.mesReferencia);
    if (!jaExiste) {
      todas.push({
        mesReferencia: corrente.mesReferencia,
        fechamento: corrente.fechamento,
        vencimento: corrente.vencimento,
        totalCentavos: 0,
        itens: [],
      });
      todas.sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
    }
  }

  const utilizadas = somarParcelasNaoVencidas({ parcelas, diaFechamento, diaVencimento, dataReferencia });

  const primeiraFutura = todas.findIndex((fatura) => fatura.vencimento >= dataReferencia);
  const inicio = primeiraFutura === -1 ? Math.max(todas.length - quantidadeFaturas, 0) : primeiraFutura;
  const faturas = todas.slice(inicio, inicio + quantidadeFaturas);

  const limite = Number.isInteger(limiteCentavos) ? limiteCentavos : 0;

  return {
    faturas,
    limiteCentavos: limite,
    limiteUtilizadoCentavos: utilizadas,
    limiteDisponivelCentavos: limite - utilizadas,
  };
}
