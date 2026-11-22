/**
 * Regras puras de consulta de lancamentos: validacao dos parametros, mes
 * corrente como periodo padrao, calculo de paginacao e normalizacao da resposta.
 *
 * Nada aqui acessa banco: as funcoes devolvem valores prontos para o model usar
 * na consulta parametrizada.
 */

import { periodoDoMes } from './regras-datas.js';
import { centavosParaReais, validarDataIso, validarTipoLancamento } from '../middlewares/validadores.js';

export const PAGINA_PADRAO = 1;
export const POR_PAGINA_PADRAO = 20;
export const POR_PAGINA_MAXIMO = 100;

/** Ultimo dia do mes corrente no formato AAAA-MM-DD. */
function mesCorrente(referenciaIso) {
  const base = referenciaIso ?? new Date().toISOString().slice(0, 10);
  return periodoDoMes(base.slice(0, 7));
}

/**
 * Valida e normaliza os parametros de listagem.
 *
 * @param {object} consulta Parametros como chegaram na query string.
 * @param {string} [referenciaIso] Data de referencia (padrao: hoje em UTC).
 * @returns {{erros: object|null, valores: object}}
 */
export function normalizarConsulta(consulta = {}, referenciaIso) {
  const erros = {};
  const padrao = mesCorrente(referenciaIso);

  const inicio = consulta.inicio ?? padrao.inicio;
  const fim = consulta.fim ?? padrao.fim;

  const erroInicio = validarDataIso(inicio);
  if (erroInicio) erros.inicio = erroInicio;

  const erroFim = validarDataIso(fim);
  if (erroFim) erros.fim = erroFim;

  if (!erroInicio && !erroFim && inicio > fim) {
    erros.fim = 'A data final deve ser igual ou posterior a data inicial.';
  }

  const tipo = consulta.tipo ?? null;
  if (tipo !== null) {
    const erroTipo = validarTipoLancamento(tipo);
    if (erroTipo) erros.tipo = erroTipo;
  }

  const categoriaId = converterId(consulta.categoriaId, 'categoriaId', erros);
  const fonteDestinoId = converterId(consulta.fonteDestinoId, 'fonteDestinoId', erros);

  const pagina = converterInteiro(consulta.pagina, 'pagina', PAGINA_PADRAO, erros, { minimo: 1 });
  const porPagina = converterInteiro(consulta.porPagina, 'porPagina', POR_PAGINA_PADRAO, erros, {
    minimo: 1,
    maximo: POR_PAGINA_MAXIMO,
  });

  const valores = { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina, porPagina };

  return { erros: Object.keys(erros).length > 0 ? erros : null, valores };
}

function converterInteiro(valor, campo, padrao, erros, { minimo, maximo } = {}) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    erros[campo] = `O campo ${campo} deve ser um numero inteiro.`;
    return padrao;
  }
  if (minimo !== undefined && numero < minimo) {
    erros[campo] = `O campo ${campo} deve ser maior ou igual a ${minimo}.`;
    return padrao;
  }
  if (maximo !== undefined && numero > maximo) {
    erros[campo] = `O campo ${campo} deve ser menor ou igual a ${maximo}.`;
    return padrao;
  }
  return numero;
}

function converterId(valor, campo, erros) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    erros[campo] = `O campo ${campo} deve ser um identificador valido.`;
    return null;
  }
  return numero;
}

/**
 * Calcula os metadados de paginacao e o offset para o SQL.
 * A pagina e limitada ao intervalo valido para evitar consultas inuteis.
 */
export function calcularPaginacao({ totalItens, pagina, porPagina }) {
  if (!Number.isInteger(totalItens) || totalItens < 0) {
    throw new RangeError('totalItens deve ser um inteiro nao negativo.');
  }
  if (!Number.isInteger(pagina) || pagina < 1) throw new RangeError('pagina deve ser um inteiro maior ou igual a 1.');
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
    throw new RangeError(`porPagina deve estar entre 1 e ${POR_PAGINA_MAXIMO}.`);
  }

  const totalPaginas = Math.max(1, Math.ceil(totalItens / porPagina));
  const paginaEfetiva = Math.min(pagina, totalPaginas);

  return {
    pagina: paginaEfetiva,
    porPagina,
    totalItens,
    totalPaginas,
    offset: (paginaEfetiva - 1) * porPagina,
  };
}

/**
 * Normaliza um lancamento vindo do banco para o formato de resposta da API,
 * convertendo centavos para string decimal e escondendo detalhes internos.
 */
export function serializarLancamento(lancamento) {
  if (!lancamento) throw new TypeError('serializarLancamento espera um lancamento.');

  const valorCentavos = lancamento.valorCentavos ?? lancamento.valor_centavos;
  if (!Number.isInteger(valorCentavos)) {
    throw new TypeError('O lancamento deve conter valorCentavos inteiro.');
  }

  return {
    id: lancamento.id,
    tipo: lancamento.tipo,
    descricao: lancamento.descricao,
    valorCentavos,
    valor: centavosParaReais(valorCentavos),
    data: lancamento.data,
    categoriaId: lancamento.categoriaId ?? lancamento.categoria_id,
    fonteDestinoId: lancamento.fonteDestinoId ?? lancamento.fonte_destino_id,
    parcelaAtual: lancamento.parcelaAtual ?? lancamento.parcela_atual ?? 1,
    totalParcelas: lancamento.totalParcelas ?? lancamento.total_parcelas ?? 1,
    grupoParcelamento: lancamento.grupoParcelamento ?? lancamento.grupo_parcelamento ?? null,
  };
}

/** Remove campos sensiveis que nunca podem sair na resposta de usuario. */
export function serializarUsuario(usuario) {
  if (!usuario) throw new TypeError('serializarUsuario espera um usuario.');
  const {
    senha_hash: senhaHash,
    senhaHash: senhaHashCamel,
    ...resto
  } = usuario;
  void senhaHash;
  void senhaHashCamel;
  return { ...resto };
}
