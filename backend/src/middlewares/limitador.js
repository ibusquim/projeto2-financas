/**
 * Rate limiting da rota de login.
 *
 * Limita tentativas por IP em uma janela configuravel. A mensagem de erro segue
 * o padrao unico da API e nao revela se o e-mail existe.
 */

import rateLimit from 'express-rate-limit';
import { carregarAmbiente } from '../config/ambiente.js';

export function criarLimitadorLogin() {
  const { maxTentativas, janelaMinutos } = carregarAmbiente().login;

  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: maxTentativas,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).json({ erro: 'Muitas tentativas. Tente novamente mais tarde.' });
    },
  });
}
