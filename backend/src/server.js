/**
 * Servidor Express da API.
 *
 * Estrutura obrigatoria do enunciado: dentro de src/ existem apenas server.js e
 * as pastas routes, models, middlewares e config. Nao existe pasta controllers.
 */

import 'dotenv/config';
import { pathToFileURL } from 'node:url';

import express from 'express';
import cors from 'cors';

import rotas from './routes/index.js';
import { carregarAmbiente } from './config/ambiente.js';
import { encerrarPool } from './config/db.js';
import { middlewareDeErro, rotaNaoEncontrada } from './middlewares/erros.js';

const ambiente = carregarAmbiente();

export const app = express();

app.disable('x-powered-by');

// CORS restrito a origem autorizada do front-end.
app.use(cors({ origin: ambiente.corsOrigem }));

app.use(express.json({ limit: '100kb' }));

app.use('/api', rotas);

app.use(rotaNaoEncontrada);
app.use(middlewareDeErro);

const executadoDiretamente = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (executadoDiretamente) {
  const servidor = app.listen(ambiente.porta, () => {
    console.log(`[server] API ouvindo em http://localhost:${ambiente.porta}/api (${ambiente.nodeEnv})`);
  });

  const encerrar = (sinal) => {
    console.log(`[server] ${sinal} recebido, encerrando...`);
    servidor.close(async () => {
      await encerrarPool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM'));
}

export default app;
