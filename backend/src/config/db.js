/**
 * Pool de conexoes PostgreSQL.
 *
 * Este e o unico lugar do projeto que cria conexao com o banco. Os models
 * recebem as funcoes `consultar` e `comTransacao` daqui e nunca instanciam
 * pool por conta propria.
 */

import pg from 'pg';
import { carregarAmbiente } from './ambiente.js';

const { Pool } = pg;

let pool = null;
let ambienteCache = null;

function obterAmbiente() {
  if (!ambienteCache) ambienteCache = carregarAmbiente();
  return ambienteCache;
}

export function obterPool() {
  if (!pool) {
    const { banco } = obterAmbiente();
    pool = new Pool({
      host: banco.host,
      port: banco.porta,
      database: banco.nome,
      user: banco.usuario,
      password: banco.senha,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (erro) => {
      console.error('[db] erro inesperado no pool:', erro.message);
    });
  }
  return pool;
}

/** Executa uma consulta parametrizada. Nunca interpole valores na string SQL. */
export async function consultar(texto, parametros = []) {
  return obterPool().query(texto, parametros);
}

/**
 * Executa varias operacoes dentro de uma transacao.
 * Tudo e confirmado no COMMIT ou descartado no ROLLBACK, garantindo que o
 * parcelamento nunca deixe parcelas parciais.
 */
export async function comTransacao(executar) {
  const cliente = await obterPool().connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await executar(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await cliente.query('ROLLBACK');
    } catch (erroRollback) {
      console.error('[db] falha no rollback:', erroRollback.message);
    }
    throw erro;
  } finally {
    cliente.release();
  }
}

/** Fecha o pool. Usado no encerramento do processo e nos testes. */
export async function encerrarPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Verifica se o banco responde. Usado no health check detalhado. */
export async function bancoRespondendo() {
  try {
    await consultar('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}
