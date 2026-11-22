/**
 * Acesso ao banco para usuarios. Unico lugar que executa SQL desta entidade.
 */

import { comTransacao, consultar } from '../config/db.js';

/** Categorias criadas automaticamente no cadastro de qualquer usuario. */
export const CATEGORIAS_PADRAO = [
  { nome: 'Salario', tipo: 'entrada' },
  { nome: 'Outros', tipo: 'entrada' },
  { nome: 'Alimentacao', tipo: 'saida' },
  { nome: 'Moradia', tipo: 'saida' },
  { nome: 'Saude', tipo: 'saida' },
  { nome: 'Mobilidade', tipo: 'saida' },
  { nome: 'Lazer', tipo: 'saida' },
  { nome: 'Educacao', tipo: 'saida' },
  { nome: 'Outros', tipo: 'saida' },
];

/** Fonte/destino criada automaticamente no cadastro. */
export const FONTE_PADRAO = { nome: 'Conta corrente', tipo: 'conta' };

/**
 * Cria o usuario e os dados padrao em uma unica transacao.
 * Se qualquer insert falhar, nada e gravado.
 */
export async function criarComDadosPadrao({ nome, email, cpf, senhaHash }) {
  return comTransacao(async (cliente) => {
    const { rows } = await cliente.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, cpf, criado_em`,
      [nome, email, cpf, senhaHash],
    );
    const usuario = rows[0];

    for (const categoria of CATEGORIAS_PADRAO) {
      await cliente.query(
        'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
        [usuario.id, categoria.nome, categoria.tipo],
      );
    }

    await cliente.query(
      'INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
      [usuario.id, FONTE_PADRAO.nome, FONTE_PADRAO.tipo],
    );

    return usuario;
  });
}

/** Busca por e-mail normalizado. Retorna o hash para a comparacao do login. */
export async function buscarPorEmail(email) {
  const { rows } = await consultar(
    `SELECT id, nome, email, cpf, senha_hash
       FROM usuarios
      WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function buscarPorId(id) {
  const { rows } = await consultar(
    `SELECT id, nome, email, cpf, criado_em
       FROM usuarios
      WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
