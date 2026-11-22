/**
 * Rota do desafio opcional de saude financeira.
 * Todos os numeros vem de calculos do servidor.
 */

import { Router } from 'express';

import { montarSaudeFinanceira } from '../models/saudeFinanceira.model.js';
import { autenticar } from '../middlewares/autenticacao.js';

const rotas = Router();

rotas.use(autenticar);

/** GET /api/saude-financeira */
rotas.get('/', async (req, res) => {
  const resultado = await montarSaudeFinanceira({ usuarioId: req.usuarioId });
  return res.status(200).json(resultado);
});

export default rotas;
