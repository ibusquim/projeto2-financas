/**
 * Agregador das rotas de /api.
 */

import { Router } from 'express';

import authRotas from './auth.routes.js';
import categoriasRotas from './categorias.routes.js';
import fontesDestinosRotas from './fontesDestinos.routes.js';
import lancamentosRotas from './lancamentos.routes.js';
import relatoriosRotas from './relatorios.routes.js';

const rotas = Router();

/** Health check publico, sem dados sensiveis. */
rotas.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    servico: 'projeto2-fullstack-backend',
    horario: new Date().toISOString(),
  });
});

rotas.use('/auth', authRotas);
rotas.use('/categorias', categoriasRotas);
rotas.use('/fontes-destinos', fontesDestinosRotas);
rotas.use('/lancamentos', lancamentosRotas);
rotas.use('/relatorios', relatoriosRotas);

export default rotas;
