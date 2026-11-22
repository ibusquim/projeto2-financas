/**
 * Middleware de autenticacao JWT.
 *
 * O identificador do usuario vem SEMPRE do token. Nenhuma rota aceita
 * usuarioId no corpo ou na URL, conforme a regra de isolamento do projeto.
 */

import jwt from 'jsonwebtoken';
import { carregarAmbiente } from '../config/ambiente.js';
import { erroAutenticacao } from './erros.js';

export function autenticar(req, res, proximo) {
  const cabecalho = req.headers.authorization ?? '';
  const [esquema, token] = cabecalho.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return proximo(erroAutenticacao('Autenticacao necessaria.'));
  }

  try {
    const { segredo } = carregarAmbiente().jwt;
    const payload = jwt.verify(token, segredo);
    const usuarioId = Number(payload.sub);
    if (!Number.isInteger(usuarioId) || usuarioId < 1) {
      return proximo(erroAutenticacao('Token invalido.'));
    }
    req.usuarioId = usuarioId;
    return proximo();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return proximo(erroAutenticacao('Sessao expirada.'));
    }
    return proximo(erroAutenticacao('Token invalido.'));
  }
}

/** Gera o token do usuario autenticado. */
export function gerarToken(usuarioId) {
  const { segredo, expiracao } = carregarAmbiente().jwt;
  return jwt.sign({}, segredo, { subject: String(usuarioId), expiresIn: expiracao });
}
