/**
 * Regra de negocio pura do parcelamento.
 *
 * Toda a aritmetica e feita em centavos inteiros. Nunca se usa ponto flutuante
 * para dinheiro, atendendo a regra do projeto.
 */

import { adicionarMesesDataIso } from './regras-datas.js';

export const PARCELAS_MINIMO = 1;
export const PARCELAS_MAXIMO = 48;

/** Soma uma lista de valores em centavos. */
export function somarCentavos(valores) {
  if (!Array.isArray(valores)) throw new TypeError('somarCentavos espera um array.');
  return valores.reduce((total, valor) => {
    if (!Number.isInteger(valor)) throw new TypeError('Todos os valores devem ser inteiros de centavos.');
    return total + valor;
  }, 0);
}

/**
 * Divide um valor em centavos por N parcelas.
 *
 * A divisao inteira distribui o valor igualmente e a diferenca de arredondamento
 * vai toda para a PRIMEIRA parcela, conforme o enunciado:
 *   R$ 100,00 em 3x -> 33,34 + 33,33 + 33,33
 *
 * Garantias: todos os valores sao inteiros, nenhuma parcela e zero e a soma
 * devolve exatamente o valor original.
 */
export function dividirEmParcelas(valorCentavos, totalParcelas) {
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new RangeError('O valor deve ser um inteiro de centavos maior que zero.');
  }
  if (!Number.isInteger(totalParcelas) || totalParcelas < PARCELAS_MINIMO || totalParcelas > PARCELAS_MAXIMO) {
    throw new RangeError(`A quantidade de parcelas deve estar entre ${PARCELAS_MINIMO} e ${PARCELAS_MAXIMO}.`);
  }
  if (valorCentavos < totalParcelas) {
    throw new RangeError('O valor e insuficiente para gerar parcelas com pelo menos 1 centavo.');
  }

  const valorBase = Math.floor(valorCentavos / totalParcelas);
  const diferenca = valorCentavos - valorBase * totalParcelas;

  const parcelas = new Array(totalParcelas).fill(valorBase);
  parcelas[0] += diferenca;
  return parcelas;
}

/**
 * Gera a descricao completa de cada parcela, ja com a data deslocada mes a mes.
 * Cada parcela avanca um mes em relacao a anterior, com ajuste para o ultimo dia
 * do mes quando o dia original nao existir.
 */
export function gerarParcelas({ valorCentavos, totalParcelas, dataPrimeiraParcela }) {
  const valores = dividirEmParcelas(valorCentavos, totalParcelas);

  return valores.map((valorCentavosParcela, indice) => ({
    parcelaAtual: indice + 1,
    totalParcelas,
    valorCentavos: valorCentavosParcela,
    data: adicionarMesesDataIso(dataPrimeiraParcela, indice),
  }));
}

/** Verdadeiro quando o valor e divisivel sem sobra. */
export function divisaoExata(valorCentavos, totalParcelas) {
  return valorCentavos % totalParcelas === 0;
}
