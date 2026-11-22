/**
 * Rotas de relatorios: por categoria, por fonte/destino e previsao de faturas.
 */

import { Router } from 'express';

import * as relatorios from '../models/relatorios.model.js';
import * as faturas from '../models/faturas.model.js';
import { periodoAnterior, periodoDoMes, hojeIso } from '../models/regras-datas.js';
import { autenticar } from '../middlewares/autenticacao.js';
import { erroValidacao } from '../middlewares/erros.js';
import { validarDataIso } from '../middlewares/validadores.js';

const rotas = Router();

rotas.use(autenticar);

/**
 * Resolve o periodo consultado. Sem parametros, usa o mes corrente do servidor.
 * O periodo anterior tem exatamente o mesmo numero de dias.
 */
function resolverPeriodo(consulta) {
  const padrao = periodoDoMes(hojeIso().slice(0, 7));
  const inicio = consulta.inicio ?? padrao.inicio;
  const fim = consulta.fim ?? padrao.fim;

  const campos = {};
  const erroInicio = validarDataIso(inicio);
  if (erroInicio) campos.inicio = erroInicio;

  const erroFim = validarDataIso(fim);
  if (erroFim) campos.fim = erroFim;

  if (!erroInicio && !erroFim && inicio > fim) {
    campos.fim = 'A data final deve ser igual ou posterior a data inicial.';
  }

  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  return {
    inicio,
    fim,
    inicioAnterior: periodoAnterior(inicio, fim).inicio,
    fimAnterior: periodoAnterior(inicio, fim).fim,
    periodo: { inicio, fim, rotulo: `${inicio} a ${fim}` },
    periodoAnteriorMetadados: periodoAnterior(inicio, fim),
  };
}

/** GET /api/relatorios/categorias */
rotas.get('/categorias', async (req, res) => {
  const { inicio, fim, inicioAnterior, fimAnterior, periodo, periodoAnteriorMetadados } = resolverPeriodo(req.query);

  const resultado = await relatorios.relatorioPorCategoria({
    usuarioId: req.usuarioId,
    inicio,
    fim,
    inicioAnterior,
    fimAnterior,
    periodo,
    periodoAnteriorMetadados,
  });

  return res.status(200).json(resultado);
});

/** GET /api/relatorios/fontes-destinos */
rotas.get('/fontes-destinos', async (req, res) => {
  const { inicio, fim, periodo } = resolverPeriodo(req.query);

  const resultado = await relatorios.relatorioPorFonteDestino({
    usuarioId: req.usuarioId,
    inicio,
    fim,
    periodo,
  });

  return res.status(200).json(resultado);
});

/** GET /api/relatorios/faturas?meses=3&cartaoId=1 */
rotas.get('/faturas', async (req, res) => {
  const campos = {};

  const mesesBrutos = req.query.meses === undefined ? 3 : Number(req.query.meses);
  if (!Number.isInteger(mesesBrutos) || mesesBrutos < 3 || mesesBrutos > 24) {
    campos.meses = 'O parametro meses deve ser um inteiro entre 3 e 24.';
  }

  let cartaoId = null;
  if (req.query.cartaoId !== undefined) {
    cartaoId = Number(req.query.cartaoId);
    if (!Number.isInteger(cartaoId) || cartaoId < 1) {
      campos.cartaoId = 'O parametro cartaoId deve ser um identificador valido.';
    }
  }

  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  const resultado = await faturas.previsaoDeFaturas({
    usuarioId: req.usuarioId,
    meses: mesesBrutos,
    cartaoId,
  });

  return res.status(200).json(resultado);
});

export default rotas;
