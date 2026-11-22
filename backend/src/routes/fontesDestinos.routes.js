/**
 * Rotas de fontes/destinos (renda, conta e cartao de credito).
 */

import { Router } from 'express';

import * as fontesDestinos from '../models/fontesDestinos.model.js';
import { autenticar } from '../middlewares/autenticacao.js';
import { erroConflito, erroNaoEncontrado, erroValidacao } from '../middlewares/erros.js';
import {
  validarFonteDestino,
  validarTipoFonteDestino,
  valorParaCentavos,
} from '../middlewares/validadores.js';

const rotas = Router();

rotas.use(autenticar);

function validarCorpo({ nome, tipo, diaFechamento, diaVencimento, limite }) {
  const campos = validarFonteDestino({ nome, tipo, diaFechamento, diaVencimento, limite });
  if (campos) throw erroValidacao(campos);

  return {
    nome: String(nome).trim(),
    tipo,
    diaFechamento: tipo === 'cartao_credito' ? Number(diaFechamento) : null,
    diaVencimento: tipo === 'cartao_credito' ? Number(diaVencimento) : null,
    limiteCentavos: tipo === 'cartao_credito' ? valorParaCentavos(limite) : null,
  };
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) throw erroNaoEncontrado();
  return numero;
}

/** GET /api/fontes-destinos?tipo=renda|conta|cartao_credito */
rotas.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo !== undefined) {
    const erroTipo = validarTipoFonteDestino(tipo);
    if (erroTipo) throw erroValidacao({ tipo: erroTipo });
  }

  const lista = await fontesDestinos.listar(req.usuarioId, tipo ?? null);
  return res.status(200).json(lista);
});

/** POST /api/fontes-destinos */
rotas.post('/', async (req, res) => {
  const dados = validarCorpo(req.body ?? {});
  const criada = await fontesDestinos.criar(req.usuarioId, dados);
  return res.status(201).json(criada);
});

/** PUT /api/fontes-destinos/:id */
rotas.put('/:id', async (req, res) => {
  const id = validarId(req.params.id);
  const dados = validarCorpo(req.body ?? {});

  const atualizada = await fontesDestinos.atualizar(req.usuarioId, id, dados);
  if (!atualizada) throw erroNaoEncontrado();

  return res.status(200).json(atualizada);
});

/** DELETE /api/fontes-destinos/:id */
rotas.delete('/:id', async (req, res) => {
  const id = validarId(req.params.id);

  const existente = await fontesDestinos.buscarPorIdDoUsuario(req.usuarioId, id);
  if (!existente) throw erroNaoEncontrado();

  const emUso = await fontesDestinos.contarLancamentos(req.usuarioId, id);
  if (emUso > 0) {
    throw erroConflito('Nao e possivel excluir: existem lancamentos usando esta fonte/destino.');
  }

  await fontesDestinos.excluir(req.usuarioId, id);
  return res.status(204).send();
});

export default rotas;
