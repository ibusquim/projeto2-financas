/**
 * Acesso ao banco para categorias.
 *
 * Toda consulta filtra por usuario_id, que vem sempre do token JWT.
 */

import { consultar } from '../config/db.js';

function mapear(linha) {
  return { id: linha.id, nome: linha.nome, tipo: linha.tipo };
}

export async function listar(usuarioId, tipo) {
  const parametros = [usuarioId];
  let filtroTipo = '';
  if (tipo) {
    parametros.push(tipo);
    filtroTipo = ' AND tipo = $2';
  }

  const { rows } = await consultar(
    `SELECT id, nome, tipo
       FROM categorias
      WHERE usuario_id = $1${filtroTipo}
      ORDER BY tipo, nome`,
    parametros,
  );

  return rows.map(mapear);
}

export async function criar(usuarioId, { nome, tipo }) {
  const { rows } = await consultar(
    `INSERT INTO categorias (usuario_id, nome, tipo)
     VALUES ($1, $2, $3)
     RETURNING id, nome, tipo`,
    [usuarioId, nome, tipo],
  );
  return mapear(rows[0]);
}

/** Retorna null quando a categoria nao existe ou pertence a outro usuario. */
export async function atualizar(usuarioId, id, { nome, tipo }) {
  const { rows } = await consultar(
    `UPDATE categorias
        SET nome = $3, tipo = $4
      WHERE id = $2 AND usuario_id = $1
      RETURNING id, nome, tipo`,
    [usuarioId, id, nome, tipo],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

/** Retorna null quando nao havia nada a excluir para aquele usuario. */
export async function excluir(usuarioId, id) {
  const { rows } = await consultar(
    'DELETE FROM categorias WHERE id = $2 AND usuario_id = $1 RETURNING id',
    [usuarioId, id],
  );
  return rows[0] ?? null;
}

export async function buscarPorIdDoUsuario(usuarioId, id) {
  const { rows } = await consultar(
    'SELECT id, nome, tipo FROM categorias WHERE id = $2 AND usuario_id = $1',
    [usuarioId, id],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

/** Contagem usada para bloquear categoria com lancamentos (defesa extra ao FK). */
export async function contarLancamentos(usuarioId, id) {
  const { rows } = await consultar(
    'SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1 AND categoria_id = $2',
    [usuarioId, id],
  );
  return rows[0].total;
}
