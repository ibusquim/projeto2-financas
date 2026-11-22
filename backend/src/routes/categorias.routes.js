/**
 * Rotas de categorias. Todo controlador filtra pelo usuarioId do token.
 */

import { Router } from 'express';

import * as categorias from '../models/categorias.model.js';
import { autenticar } from '../middlewares/autenticacao.js';
import { erroConflito, erroNaoEncontrado, erroValidacao } from '../middlewares/erros.js';
import { validarNomeCurto, validarTipoLancamento } from '../middlewares/validadores.js';

const rotas = Router();

rotas.use(autenticar);

function validarCorpo({ nome, tipo }) {
  const campos = {};

  const erroNome = validarNomeCurto(nome, 'nome');
  if (erroNome) campos.nome = erroNome;

  const erroTipo = validarTipoLancamento(tipo);
  if (erroTipo) campos.tipo = erroTipo;

  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  return { nome: String(nome).trim(), tipo };
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) throw erroNaoEncontrado();
  return numero;
}

/** GET /api/categorias?tipo=entrada|saida */
rotas.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo !== undefined) {
    const erroTipo = validarTipoLancamento(tipo);
    if (erroTipo) throw erroValidacao({ tipo: erroTipo });
  }

  const lista = await categorias.listar(req.usuarioId, tipo ?? null);
  return res.status(200).json(lista);
});

/** POST /api/categorias */
rotas.post('/', async (req, res) => {
  const dados = validarCorpo(req.body ?? {});
  const criada = await categorias.criar(req.usuarioId, dados);
  return res.status(201).json(criada);
});

/** PUT /api/categorias/:id */
rotas.put('/:id', async (req, res) => {
  const id = validarId(req.params.id);
  const dados = validarCorpo(req.body ?? {});

  const atualizada = await categorias.atualizar(req.usuarioId, id, dados);
  if (!atualizada) throw erroNaoEncontrado();

  return res.status(200).json(atualizada);
});

/** DELETE /api/categorias/:id */
rotas.delete('/:id', async (req, res) => {
  const id = validarId(req.params.id);

  const existente = await categorias.buscarPorIdDoUsuario(req.usuarioId, id);
  if (!existente) throw erroNaoEncontrado();

  const emUso = await categorias.contarLancamentos(req.usuarioId, id);
  if (emUso > 0) {
    throw erroConflito('Nao e possivel excluir: existem lancamentos usando esta categoria.');
  }

  await categorias.excluir(req.usuarioId, id);
  return res.status(204).send();
});

export default rotas;
