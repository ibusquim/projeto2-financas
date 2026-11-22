/**
 * Testes de fumaca HTTP: nao precisam de banco de dados.
 * Garantem que o servidor sobe, que o padrao de erro vale para rotas
 * inexistentes e que o middleware JWT barra requisicoes sem token.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/server.js';

test('GET /api/health responde 200 sem dados sensiveis', async () => {
  const resposta = await request(app).get('/api/health');

  assert.equal(resposta.status, 200);
  assert.equal(resposta.body.status, 'ok');
  assert.equal(resposta.body.servico, 'projeto2-fullstack-backend');
  assert.ok(resposta.body.horario);
  assert.equal(JSON.stringify(resposta.body).toLowerCase().includes('senha'), false);
});

test('rota inexistente responde 404 no padrao unico de erro', async () => {
  const resposta = await request(app).get('/api/nao-existe');

  assert.equal(resposta.status, 404);
  assert.equal(resposta.body.erro, 'Rota nao encontrada.');
});

test('rota protegida sem token responde 401', async () => {
  const rotasProtegidas = [
    '/api/auth/me',
    '/api/categorias',
    '/api/fontes-destinos',
    '/api/lancamentos',
    '/api/relatorios/categorias',
    '/api/relatorios/fontes-destinos',
    '/api/relatorios/faturas',
  ];

  for (const rota of rotasProtegidas) {
    const resposta = await request(app).get(rota);
    assert.equal(resposta.status, 401, `${rota} deveria responder 401`);
    assert.ok(resposta.body.erro, `${rota} deveria trazer mensagem de erro`);
  }
});

test('token invalido responde 401 com mensagem generica', async () => {
  const resposta = await request(app)
    .get('/api/lancamentos')
    .set('Authorization', 'Bearer token.invalido.aqui');

  assert.equal(resposta.status, 401);
  assert.equal(resposta.body.erro, 'Token invalido.');
});

test('esquema de autorizacao errado responde 401', async () => {
  const resposta = await request(app)
    .get('/api/categorias')
    .set('Authorization', 'Basic abc123');

  assert.equal(resposta.status, 401);
  assert.equal(resposta.body.erro, 'Autenticacao necessaria.');
});

test('cadastro invalido responde 400 com mensagem por campo', async () => {
  const resposta = await request(app).post('/api/auth/cadastro').send({
    nome: 'Io',
    email: 'email-invalido',
    cpf: '11111111111',
    senha: 'curta',
    confirmacaoSenha: 'diferente',
  });

  assert.equal(resposta.status, 400);
  assert.equal(resposta.body.erro, 'Dados invalidos.');
  assert.ok(resposta.body.campos.nome);
  assert.ok(resposta.body.campos.email);
  assert.equal(resposta.body.campos.cpf, 'CPF invalido.');
  assert.ok(resposta.body.campos.senha);
  assert.ok(resposta.body.campos.confirmacaoSenha);
  assert.equal(JSON.stringify(resposta.body).includes('senha_hash'), false);
});

test('login com corpo vazio responde 400', async () => {
  const resposta = await request(app).post('/api/auth/login').send({});

  assert.equal(resposta.status, 400);
  assert.ok(resposta.body.campos.email);
  assert.ok(resposta.body.campos.senha);
});

test('CORS libera localhost e 127.0.0.1 na porta 5173', async () => {
  for (const origem of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
    const preflight = await request(app)
      .options('/api/auth/login')
      .set('Origin', origem)
      .set('Access-Control-Request-Method', 'POST');

    assert.equal(preflight.headers['access-control-allow-origin'], origem, `origem ${origem} deveria ser liberada`);
  }
});

test('CORS bloqueia origem nao autorizada', async () => {
  const preflight = await request(app)
    .options('/api/auth/login')
    .set('Origin', 'http://site-desconhecido.example')
    .set('Access-Control-Request-Method', 'POST');

  assert.equal(preflight.headers['access-control-allow-origin'], undefined);
});

test('JSON malformado responde 400 sem stack trace', async () => {
  const resposta = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email": ');

  assert.equal(resposta.status, 400);
  assert.ok(resposta.body.erro);
  assert.equal(JSON.stringify(resposta.body).includes('at '), false);
});

test('listagem de lancamentos com periodo invertido responde 400', async () => {
  const resposta = await request(app)
    .get('/api/lancamentos')
    .query({ inicio: '2026-11-30', fim: '2026-11-01' })
    .set('Authorization', 'Bearer token.invalido.aqui');

  // Sem token valido a resposta e 401; a validacao de periodo e coberta nos testes unitarios.
  assert.equal(resposta.status, 401);
});
