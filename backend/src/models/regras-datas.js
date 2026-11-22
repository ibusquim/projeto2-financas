/**
 * Utilitarios puros de calendario.
 *
 * Nao acessam banco e nao dependem de bibliotecas externas. Todas as contas usam
 * UTC para nao sofrer com fuso horario, evitando o classico erro de uma compra
 * "voltar um dia" quando o servidor esta em UTC-3.
 */

export const MESES_NO_ANO = 12;
export const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function pad2(valor) {
  return String(valor).padStart(2, '0');
}

export function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** Ultimo dia do mes considerando anos bissextos. Mes de 1 a 12. */
export function ultimoDiaDoMes(ano, mes) {
  if (!Number.isInteger(ano)) throw new RangeError('Ano invalido.');
  if (!Number.isInteger(mes) || mes < 1 || mes > MESES_NO_ANO) throw new RangeError('Mes invalido.');
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Quebra 'AAAA-MM-DD' em partes numericas, validando o formato. */
export function desmembrarDataIso(dataIso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataIso ?? '').trim());
  if (!partes) throw new RangeError(`Data invalida: ${dataIso}`);
  return { ano: Number(partes[1]), mes: Number(partes[2]), dia: Number(partes[3]) };
}

/** Monta 'AAAA-MM-DD' ajustando o dia para o ultimo dia do mes quando necessario. */
export function montarDataIso(ano, mes, dia) {
  const ultimo = ultimoDiaDoMes(ano, mes);
  const diaAjustado = Math.min(Math.max(1, dia), ultimo);
  return `${ano}-${pad2(mes)}-${pad2(diaAjustado)}`;
}

/** Soma (ou subtrai) meses, normalizando o ano. */
export function adicionarMeses(ano, mes, quantidade) {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(quantidade)) {
    throw new RangeError('adicionarMeses espera numeros inteiros.');
  }
  if (mes < 1 || mes > MESES_NO_ANO) throw new RangeError('Mes invalido.');
  const total = ano * MESES_NO_ANO + (mes - 1) + quantidade;
  const anoFinal = Math.floor(total / MESES_NO_ANO);
  const mesFinal = (total % MESES_NO_ANO + MESES_NO_ANO) % MESES_NO_ANO + 1;
  return { ano: anoFinal, mes: mesFinal };
}

/**
 * Desloca uma data ISO em meses, preservando o dia quando ele existir no mes de
 * destino. Exemplo: 2026-01-31 + 1 mes = 2026-02-28.
 */
export function adicionarMesesDataIso(dataIso, quantidade) {
  const { ano, mes, dia } = desmembrarDataIso(dataIso);
  const destino = adicionarMeses(ano, mes, quantidade);
  return montarDataIso(destino.ano, destino.mes, dia);
}

/** Soma (ou subtrai) dias de uma data ISO. */
export function adicionarDiasDataIso(dataIso, quantidade) {
  const { ano, mes, dia } = desmembrarDataIso(dataIso);
  const referencia = new Date(Date.UTC(ano, mes - 1, dia) + quantidade * MS_POR_DIA);
  return `${referencia.getUTCFullYear()}-${pad2(referencia.getUTCMonth() + 1)}-${pad2(referencia.getUTCDate())}`;
}

/** Formata o mes de referencia da fatura: 'AAAA-MM'. */
export function formatarMesReferencia(ano, mes) {
  return `${ano}-${pad2(mes)}`;
}

/** Quantidade de dias no intervalo fechado, contando inicio e fim. */
export function diasNoIntervalo(inicioIso, fimIso) {
  const inicio = desmembrarDataIso(inicioIso);
  const fim = desmembrarDataIso(fimIso);
  const a = Date.UTC(inicio.ano, inicio.mes - 1, inicio.dia);
  const b = Date.UTC(fim.ano, fim.mes - 1, fim.dia);
  if (b < a) throw new RangeError('A data final nao pode ser anterior a inicial.');
  return Math.floor((b - a) / MS_POR_DIA) + 1;
}

/** Primeiro e ultimo dia do mes de referencia informado ('AAAA-MM'). */
export function periodoDoMes(mesReferencia) {
  const partes = /^(\d{4})-(\d{2})$/.exec(String(mesReferencia ?? '').trim());
  if (!partes) throw new RangeError(`Mes de referencia invalido: ${mesReferencia}`);
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  return {
    inicio: montarDataIso(ano, mes, 1),
    fim: montarDataIso(ano, mes, ultimoDiaDoMes(ano, mes)),
    rotulo: formatarMesReferencia(ano, mes),
  };
}

/**
 * Periodo anterior de mesmo tamanho, imediatamente antes do periodo informado.
 * Usado na comparacao do relatorio por categoria.
 */
export function periodoAnterior(inicioIso, fimIso) {
  const dias = diasNoIntervalo(inicioIso, fimIso);
  const fimAnterior = adicionarDiasDataIso(inicioIso, -1);
  const inicioAnterior = adicionarDiasDataIso(fimAnterior, -(dias - 1));
  return { inicio: inicioAnterior, fim: fimAnterior };
}

/** Converte uma data ISO em Date UTC (meia-noite). */
export function paraDataUtc(dataIso) {
  const { ano, mes, dia } = desmembrarDataIso(dataIso);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Data de hoje no formato ISO, em UTC. */
export function hojeIso() {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${pad2(agora.getUTCMonth() + 1)}-${pad2(agora.getUTCDate())}`;
}
