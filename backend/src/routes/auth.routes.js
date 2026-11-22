/**
 * Rotas de autenticacao. Controladores ficam neste arquivo, conforme a
 * estrutura exigida pelo enunciado (nao existe pasta controllers).
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';

import * as usuarios from '../models/usuarios.model.js';
import { serializarUsuario } from '../models/regras-consulta.js';
import { autenticar, gerarToken } from '../middlewares/autenticacao.js';
import { criarLimitadorLogin } from '../middlewares/limitador.js';
import { erroAutenticacao, erroValidacao } from '../middlewares/erros.js';
import {
  normalizarCpf,
  normalizarEmail,
  validarConfirmacaoSenha,
  validarCpf,
  validarEmail,
  validarNome,
  validarSenha,
} from '../middlewares/validadores.js';

const rotas = Router();

const RODADAS_HASH = 10;

/** POST /api/auth/cadastro */
rotas.post('/cadastro', async (req, res) => {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body ?? {};
  const campos = {};

  const erroNome = validarNome(nome);
  if (erroNome) campos.nome = erroNome;

  const erroEmail = validarEmail(email);
  if (erroEmail) campos.email = erroEmail;

  const erroCpf = validarCpf(cpf);
  if (erroCpf) campos.cpf = erroCpf;

  const erroSenha = validarSenha(senha);
  if (erroSenha) campos.senha = erroSenha;

  const erroConfirmacao = validarConfirmacaoSenha(senha, confirmacaoSenha);
  if (erroConfirmacao) campos.confirmacaoSenha = erroConfirmacao;

  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  const senhaHash = await bcrypt.hash(senha, RODADAS_HASH);

  const usuario = await usuarios.criarComDadosPadrao({
    nome: String(nome).trim(),
    email: normalizarEmail(email),
    cpf: normalizarCpf(cpf),
    senhaHash,
  });

  const token = gerarToken(usuario.id);

  return res.status(201).json({
    usuario: serializarUsuario({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
    }),
    token,
  });
});

/** POST /api/auth/login */
rotas.post('/login', criarLimitadorLogin(), async (req, res) => {
  const { email, senha } = req.body ?? {};

  const campos = {};
  const erroEmail = validarEmail(email);
  if (erroEmail) campos.email = erroEmail;
  if (!senha || String(senha).trim() === '') campos.senha = 'A senha e obrigatoria.';
  if (Object.keys(campos).length > 0) throw erroValidacao(campos);

  const usuario = await usuarios.buscarPorEmail(normalizarEmail(email));

  // Mensagem sempre generica: nao revela se o e-mail existe.
  if (!usuario) throw erroAutenticacao('E-mail ou senha invalidos.');

  const senhaConfere = await bcrypt.compare(String(senha), usuario.senha_hash);
  if (!senhaConfere) throw erroAutenticacao('E-mail ou senha invalidos.');

  const token = gerarToken(usuario.id);

  return res.status(200).json({
    usuario: serializarUsuario({ id: usuario.id, nome: usuario.nome, email: usuario.email }),
    token,
  });
});

/** GET /api/auth/me */
rotas.get('/me', autenticar, async (req, res) => {
  const usuario = await usuarios.buscarPorId(req.usuarioId);
  if (!usuario) throw erroAutenticacao('Autenticacao necessaria.');

  return res.status(200).json(
    serializarUsuario({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      criadoEm: usuario.criado_em,
    }),
  );
});

export default rotas;
