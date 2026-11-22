/**
 * Cria o banco configurado em DB_NAME, se ele ainda nao existir.
 * Conecta ao banco administrativo `postgres`, porque CREATE DATABASE nao pode
 * rodar dentro do banco que esta sendo criado.
 *
 * Uso: npm run db:criar
 */

import 'dotenv/config';
import pg from 'pg';

import { carregarAmbiente } from '../src/config/ambiente.js';

const { Client } = pg;

async function principal() {
  const { banco } = carregarAmbiente();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(banco.nome)) {
    throw new Error(`Nome de banco invalido: ${banco.nome}`);
  }

  const cliente = new Client({
    host: banco.host,
    port: banco.porta,
    database: 'postgres',
    user: banco.usuario,
    password: banco.senha,
  });

  await cliente.connect();

  try {
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [banco.nome]);

    if (rowCount > 0) {
      console.log(`[db:criar] banco "${banco.nome}" ja existe.`);
      return;
    }

    await cliente.query(`CREATE DATABASE "${banco.nome}" WITH ENCODING 'UTF8' TEMPLATE template0`);
    console.log(`[db:criar] banco "${banco.nome}" criado com sucesso.`);
  } finally {
    await cliente.end();
  }
}

principal().catch((erro) => {
  console.error('[db:criar] falhou:', erro.message);
  process.exit(1);
});
