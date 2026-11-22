/**
 * Rotas de lancamentos, incluindo compra parcelada em cartao de credito.
 */

import { Router } from 'express';

import * as lancamentos from '../models/lancamentos.model.js';
import * as categorias from '../models/categorias.model.js';
import * as fontesDestinos from '../models/fontesDestinos.model.js';
import { normalizarConsulta } from '../models/regras-consulta.js';
import { autenticar } from '../middlewares/autenticacao.js';
import { erroNaoEncontrado, erroValidacao } from '../middlewares/erros.js';
import {
  validarDataIso,
  validarDescricao,
  validarQuantidadeParcelas,
  validarTipoLancamento,
  validarValorPositivo,
  valorParaCentavos,
} from '../middlewares/validadores.js';

const rotas = Router();

rotas.use(autenticar);

function validarIdentificador(valor, campo, campos) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    campos[campo] = `Informe um ${campo} valido.`;
    return null;
  }
  return numero;
}

/** Valida os campos comuns de criacao e edicao. */
function validarCorpoLancamento(corpo) {
  const campos = {};

  const erroTipo = validarTipoLancamento(corpo.tipo);
  if (erroTipo) campos.tipo = erroTipo;

  const erroDescricao = validarDescricao(corpo.descricao);
  if (erroDescricao) campos.descricao = erroDescricao;

  const erroValor = validarValorPositivo(corpo.valor);
  if (erroValor) campos.valor = erroValor;

  const erroData = validarDataIso(corpo.data);
  if (erroData) campos.data = erroData;

  const categoriaId = validarIdentificador(corpo.categoriaId, 'categoriaId', campos);
  const fonteDestinoId = validarIdentificador(corpo.fonteDestinoId, 'fonteDestinoId', campos);

  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  return {
    tipo: corpo.tipo,
    descricao: String(corpo.descricao).trim(),
    valorCentavos: valorParaCentavos(corpo.valor),
    data: String(corpo.data),
    categoriaId,
    fonteDestinoId,
  };
}

/** Garante que categoria e fonte pertencem ao usuario e que os tipos batem. */
async function validarRelacionamentos(usuarioId, dados) {
  const categoria = await categorias.buscarPorIdDoUsuario(usuarioId, dados.categoriaId);
  if (!categoria) throw erroNaoEncontrado('Categoria nao encontrada.');

  if (categoria.tipo !== dados.tipo) {
    throw erroValidacao({
      categoriaId: `A categoria informada e de ${categoria.tipo}, mas o lancamento e de ${dados.tipo}.`,
    });
  }

  const fonte = await fontesDestinos.buscarPorIdDoUsuario(usuarioId, dados.fonteDestinoId);
  if (!fonte) throw erroNaoEncontrado('Fonte/destino nao encontrado.');

  return { categoria, fonte };
}

/** GET /api/lancamentos */
rotas.get('/', async (req, res) => {
  const { erros, valores } = normalizarConsulta(req.query);
  if (erros) throw erroValidacao(erros);

  const resultado = await lancamentos.listar({ usuarioId: req.usuarioId, ...valores });
  return res.status(200).json(resultado);
});

/** POST /api/lancamentos — simples ou parcelado */
rotas.post('/', async (req, res) => {
  const corpo = req.body ?? {};
  const dados = validarCorpoLancamento(corpo);

  const parcelasBrutas = corpo.parcelas === undefined || corpo.parcelas === null ? 1 : corpo.parcelas;
  const erroParcelas = validarQuantidadeParcelas(parcelasBrutas === 1 ? 1 : Number(parcelasBrutas));
  if (erroParcelas) throw erroValidacao({ parcelas: erroParcelas });

  const totalParcelas = Number(parcelasBrutas);

  const { fonte } = await validarRelacionamentos(req.usuarioId, dados);

  if (totalParcelas > 1 && fonte.tipo !== 'cartao_credito') {
    throw erroValidacao({
      parcelas: 'Parcelamento permitido apenas quando a fonte/destino e um cartao de credito.',
    });
  }

  if (totalParcelas === 1) {
    const criado = await lancamentos.criar({ usuarioId: req.usuarioId, ...dados });
    return res.status(201).json(criado);
  }

  const resultado = await lancamentos.criarParcelado({
    usuarioId: req.usuarioId,
    ...dados,
    totalParcelas,
  });

  return res.status(201).json(resultado);
});

/** GET /api/lancamentos/:id */
rotas.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw erroNaoEncontrado();

  const lancamento = await lancamentos.buscarPorId(req.usuarioId, id);
  if (!lancamento) throw erroNaoEncontrado();

  return res.status(200).json(lancamento);
});

/** PUT /api/lancamentos/:id */
rotas.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw erroNaoEncontrado();

  const existente = await lancamentos.buscarPorId(req.usuarioId, id);
  if (!existente) throw erroNaoEncontrado();

  if (req.body?.parcelas !== undefined && Number(req.body.parcelas) > 1) {
    throw erroValidacao({
      parcelas: 'Nao e possivel transformar um lancamento existente em parcelado. Exclua e crie novamente.',
    });
  }

  const dados = validarCorpoLancamento(req.body ?? {});
  await validarRelacionamentos(req.usuarioId, dados);

  const atualizado = await lancamentos.atualizar(req.usuarioId, id, dados);
  if (!atualizado) throw erroNaoEncontrado();

  return res.status(200).json(atualizado);
});

/** DELETE /api/lancamentos/:id?escopo=parcela|grupo */
rotas.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw erroNaoEncontrado();

  const escopo = req.query.escopo ?? 'parcela';
  if (escopo !== 'parcela' && escopo !== 'grupo') {
    throw erroValidacao({ escopo: 'O escopo deve ser "parcela" ou "grupo".' });
  }

  const resultado = await lancamentos.excluir({ usuarioId: req.usuarioId, id, escopo });
  if (!resultado) throw erroNaoEncontrado();

  return res.status(204).send();
});

export default rotas;
