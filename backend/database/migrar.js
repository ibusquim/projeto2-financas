/**
 * Runner de migrations em SQL puro.
 *
 * Le todos os arquivos .sql da pasta migrations em ordem alfabetica, executa
 * cada um dentro de uma transacao e registra o nome na tabela `migracoes`.
 * Migracao ja aplicada nao roda de novo.
 *
 * Uso: npm run db:migrar
 */

import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { carregarAmbiente } from '../src/config/ambiente.js';

const { Client } = pg;

const pastaAtual = path.dirname(fileURLToPath(import.meta.url));
const pastaMigrations = path.join(pastaAtual, 'migrations');

async function principal() {
  const { banco } = carregarAmbiente();

  const cliente = new Client({
    host: banco.host,
    port: banco.porta,
    database: banco.nome,
    user: banco.usuario,
    password: banco.senha,
  });

  await cliente.connect();

  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS migracoes (
        nome       VARCHAR(255) PRIMARY KEY,
        aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const arquivos = (await readdir(pastaMigrations))
      .filter((arquivo) => arquivo.endsWith('.sql'))
      .sort();

    for (const arquivo of arquivos) {
      const { rowCount } = await cliente.query('SELECT 1 FROM migracoes WHERE nome = $1', [arquivo]);

      if (rowCount > 0) {
        console.log(`[db:migrar] ${arquivo} ja aplicada.`);
        continue;
      }

      const sql = await readFile(path.join(pastaMigrations, arquivo), 'utf8');

      await cliente.query('BEGIN');
      try {
        await cliente.query(sql);
        await cliente.query('INSERT INTO migracoes (nome) VALUES ($1)', [arquivo]);
        await cliente.query('COMMIT');
        console.log(`[db:migrar] ${arquivo} aplicada.`);
      } catch (erro) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falha em ${arquivo}: ${erro.message}`);
      }
    }
  } finally {
    await cliente.end();
  }
}

principal().catch((erro) => {
  console.error('[db:migrar] falhou:', erro.message);
  process.exit(1);
});
