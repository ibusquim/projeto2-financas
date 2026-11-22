/**
 * Regras de negocio puras do desafio de saude financeira.
 *
 * Todos os calculos acontecem no servidor. O modulo nao acessa banco e nao
 * depende de biblioteca externa, o que permite testar cada formula isoladamente.
 *
 * Valores monetarios circulam em centavos inteiros.
 */

import { adicionarMeses, formatarMesReferencia } from './regras-datas.js';
import { somarCentavos } from './regras-parcelamento.js';
import { arredondar } from './regras-relatorios.js';

export const AVISO_EDUCATIVO =
  'As informacoes apresentadas sao educativas e nao constituem recomendacao financeira profissional.';

export const MESES_HISTORICO = 3;
export const MESES_PROJECAO = 6;
export const LIMIAR_CATEGORIA_FORA_DA_CURVA = 20;

function mediaCentavos(valores) {
  if (valores.length === 0) return 0;
  return Math.round(somarCentavos(valores) / valores.length);
}

/**
 * Taxa de poupanca: (entradas - saidas) / entradas.
 * Classificacao: otima (>= 20%), boa (>= 10%), baixa (>= 0%), critica (< 0).
 */
export function calcularTaxaPoupanca({ entradasCentavos, saidasCentavos }) {
  if (!Number.isInteger(entradasCentavos) || !Number.isInteger(saidasCentavos)) {
    throw new TypeError('calcularTaxaPoupanca espera inteiros de centavos.');
  }
  if (entradasCentavos <= 0) {
    return { percentual: null, classificacao: 'sem-dados' };
  }

  const percentual = arredondar(((entradasCentavos - saidasCentavos) * 100) / entradasCentavos, 2);
  let classificacao = 'critica';
  if (percentual >= 20) classificacao = 'otima';
  else if (percentual >= 10) classificacao = 'boa';
  else if (percentual >= 0) classificacao = 'baixa';

  return { percentual, classificacao };
}

/**
 * Comprometimento com cartoes: total das faturas a vencer / renda media mensal.
 * Classificacao: saudavel (<= 30%), atencao (<= 50%), critico (> 50%).
 */
export function calcularComprometimentoCartoes({ faturasFuturasCentavos, rendaMediaCentavos }) {
  if (!Number.isInteger(faturasFuturasCentavos) || !Number.isInteger(rendaMediaCentavos)) {
    throw new TypeError('calcularComprometimentoCartoes espera inteiros de centavos.');
  }
  if (rendaMediaCentavos <= 0) {
    return { percentual: null, classificacao: 'sem-dados' };
  }

  const percentual = arredondar((faturasFuturasCentavos * 100) / rendaMediaCentavos, 2);
  let classificacao = 'saudavel';
  if (percentual > 50) classificacao = 'critico';
  else if (percentual > 30) classificacao = 'atencao';

  return { percentual, classificacao };
}

/**
 * Projecao de saldo para os proximos meses.
 *
 * Usa a media de entradas e saidas dos meses do historico e soma as parcelas de
 * cartao ja conhecidas para cada mes projetado.
 *
 * @param {object} entrada
 * @param {Array<{mesReferencia:string, entradasCentavos:number, saidasCentavos:number}>} entrada.historico
 * @param {Array<{mesReferencia:string, totalCentavos:number}>} [entrada.parcelasPorMes]
 * @param {number} [entrada.meses]
 * @param {number} [entrada.saldoInicialCentavos]
 */
export function projetarSaldos({ historico, parcelasPorMes = [], meses = MESES_PROJECAO, saldoInicialCentavos = 0 }) {
  if (!Array.isArray(historico)) throw new TypeError('projetarSaldos espera o historico em array.');
  if (historico.length === 0) {
    return { entradasMediasCentavos: 0, saidasMediasCentavos: 0, projecao: [] };
  }
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
    throw new RangeError('A projecao deve cobrir entre 1 e 24 meses.');
  }

  const entradasMediasCentavos = mediaCentavos(historico.map((item) => item.entradasCentavos));
  const saidasMediasCentavos = mediaCentavos(historico.map((item) => item.saidasCentavos));

  const mapaParcelas = new Map(parcelasPorMes.map((item) => [item.mesReferencia, item.totalCentavos]));

  const referencia = historico[historico.length - 1].mesReferencia;
  const [anoBase, mesBase] = referencia.split('-').map(Number);

  const projecao = [];
  let saldo = saldoInicialCentavos;

  for (let indice = 1; indice <= meses; indice += 1) {
    const { ano, mes } = adicionarMeses(anoBase, mesBase, indice);
    const mesReferencia = formatarMesReferencia(ano, mes);
    const parcelasCentavos = mapaParcelas.get(mesReferencia) ?? 0;
    const saidasProjetadasCentavos = saidasMediasCentavos + parcelasCentavos;

    saldo += entradasMediasCentavos - saidasProjetadasCentavos;

    projecao.push({
      mesReferencia,
      entradasCentavos: entradasMediasCentavos,
      saidasCentavos: saidasProjetadasCentavos,
      parcelasCentavos,
      saldoProjetadoCentavos: saldo,
    });
  }

  return { entradasMediasCentavos, saidasMediasCentavos, projecao };
}

/**
 * Compara o gasto de cada categoria no mes corrente com a media dos meses
 * anteriores. Sinaliza como "fora da curva" quem subiu mais que o limiar.
 *
 * @param {object} entrada
 * @param {Array<{categoriaId:number, nome:string, totalCentavos:number}>} entrada.atual
 * @param {Array<Array<{categoriaId:number, totalCentavos:number}>>} entrada.historicoPorMes
 */
export function compararCategoriasComMedia({ atual, historicoPorMes = [] }) {
  if (!Array.isArray(atual)) throw new TypeError('compararCategoriasComMedia espera as categorias atuais.');

  const meses = historicoPorMes.length;

  const totaisPorCategoria = new Map();
  for (const mes of historicoPorMes) {
    for (const item of mes) {
      totaisPorCategoria.set(item.categoriaId, (totaisPorCategoria.get(item.categoriaId) ?? 0) + item.totalCentavos);
    }
  }

  return atual
    .map((item) => {
      const acumulado = totaisPorCategoria.get(item.categoriaId) ?? 0;
      const mediaCentavosCategoria = meses > 0 ? Math.round(acumulado / meses) : 0;

      const variacaoPercentual =
        mediaCentavosCategoria > 0
          ? arredondar(((item.totalCentavos - mediaCentavosCategoria) * 100) / mediaCentavosCategoria, 2)
          : item.totalCentavos > 0
            ? null
            : 0;

      const acimaDaMedia =
        mediaCentavosCategoria > 0
          ? variacaoPercentual >= LIMIAR_CATEGORIA_FORA_DA_CURVA
          : item.totalCentavos > 0;

      return {
        categoriaId: item.categoriaId,
        nome: item.nome,
        totalCentavos: item.totalCentavos,
        mediaCentavos: mediaCentavosCategoria,
        variacaoPercentual,
        acimaDaMedia,
      };
    })
    .sort((a, b) => {
      if (a.acimaDaMedia !== b.acimaDaMedia) return a.acimaDaMedia ? -1 : 1;
      return (b.variacaoPercentual ?? 0) - (a.variacaoPercentual ?? 0);
    });
}

/** Dicas em texto, geradas por regras deterministicas a partir dos numeros. */
export function gerarDicas({
  taxaPoupanca,
  comprometimentoCartoes,
  parcelasFuturasCentavos,
  categoriasForaDaCurva = [],
  projecao = [],
}) {
  const dicas = [];

  if (taxaPoupanca.classificacao === 'sem-dados') {
    dicas.push('Registre entradas no sistema para que a taxa de poupanca possa ser calculada.');
  } else if (taxaPoupanca.percentual < 0) {
    dicas.push(
      `As saidas superaram as entradas nos ultimos meses em ${Math.abs(taxaPoupanca.percentual).toFixed(2)}%. Comece reduzindo a categoria de maior gasto.`,
    );
  } else if (taxaPoupanca.percentual < 10) {
    dicas.push(
      `A taxa de poupanca esta em ${taxaPoupanca.percentual.toFixed(2)}%. Uma referencia comum e guardar pelo menos 10% da renda.`,
    );
  } else {
    dicas.push(`Bom resultado: a taxa de poupanca esta em ${taxaPoupanca.percentual.toFixed(2)}%.`);
  }

  if (comprometimentoCartoes.classificacao === 'critico') {
    dicas.push(
      `As faturas futuras comprometem ${comprometimentoCartoes.percentual.toFixed(2)}% da renda media. Evite novas compras parceladas ate reduzir esse percentual.`,
    );
  } else if (comprometimentoCartoes.classificacao === 'atencao') {
    dicas.push(
      `As faturas futuras comprometem ${comprometimentoCartoes.percentual.toFixed(2)}% da renda media. Vale acompanhar antes de assumir novos parcelamentos.`,
    );
  } else if (comprometimentoCartoes.classificacao === 'saudavel') {
    dicas.push(
      `O comprometimento com cartoes esta em ${comprometimentoCartoes.percentual.toFixed(2)}% da renda media, dentro de uma faixa confortavel.`,
    );
  }

  if (parcelasFuturasCentavos > 0) {
    dicas.push(
      'Existem parcelas a vencer nos proximos meses. Elas ja estao consideradas na projecao de saldo abaixo.',
    );
  }

  for (const categoria of categoriasForaDaCurva.slice(0, 2)) {
    if (categoria.variacaoPercentual === null) {
      dicas.push(`A categoria ${categoria.nome} passou a ter gasto neste mes e nao tinha historico nos meses anteriores.`);
    } else {
      dicas.push(
        `Os gastos com ${categoria.nome} estao ${categoria.variacaoPercentual.toFixed(2)}% acima da media dos ultimos meses.`,
      );
    }
  }

  const primeiroNegativo = projecao.find((mes) => mes.saldoProjetadoCentavos < 0);
  if (primeiroNegativo) {
    dicas.push(
      `A projecao indica saldo negativo em ${primeiroNegativo.mesReferencia} mantendo o ritmo atual. Reveja despesas ou parcelamentos.`,
    );
  }

  return dicas;
}
