import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ErroHttp,
  MENSAGEM_ERRO_INTERNO,
  corpoDeErro,
  erroAutenticacao,
  erroConflito,
  erroMuitasTentativas,
  erroNaoEncontrado,
  erroTratado,
  erroValidacao,
} from '../src/middlewares/erros.js';

import { carregarAmbiente, validarAmbiente } from '../src/config/ambiente.js';

test('erroValidacao monta 400 com mensagens por campo', () => {
  const erro = erroValidacao({ valor: 'O valor deve ser maior que zero.' });
  assert.ok(erro instanceof ErroHttp);
  assert.equal(erro.status, 400);
  assert.equal(erro.message, 'Dados invalidos.');

  const { status, corpo } = corpoDeErro(erro);
  assert.equal(status, 400);
  assert.equal(corpo.erro, 'Dados invalidos.');
  assert.equal(corpo.campos.valor, 'O valor deve ser maior que zero.');
});

test('erro sem campos nao inclui a chave campos', () => {
  const { corpo } = corpoDeErro(erroNaoEncontrado());
  assert.equal(corpo.erro, 'Registro nao encontrado.');
  assert.equal('campos' in corpo, false);
});

test('codigos de erro mapeiam para os status do contrato', () => {
  assert.equal(corpoDeErro(erroAutenticacao()).status, 401);
  assert.equal(corpoDeErro(erroNaoEncontrado()).status, 404);
  assert.equal(corpoDeErro(erroConflito('E-mail ja cadastrado.')).status, 409);
  assert.equal(corpoDeErro(erroMuitasTentativas()).status, 429);
});

test('erro desconhecido vira 500 sem vazar detalhe interno', () => {
  const erroBanco = new Error('SELECT senha_hash FROM usuarios WHERE id = 1 falhou');
  const { status, corpo } = corpoDeErro(erroBanco);

  assert.equal(status, 500);
  assert.equal(corpo.erro, MENSAGEM_ERRO_INTERNO);
  assert.equal(JSON.stringify(corpo).includes('senha_hash'), false);
  assert.equal(JSON.stringify(corpo).includes('SELECT'), false);
});

test('erroTratado distingue erro de aplicacao de erro inesperado', () => {
  assert.equal(erroTratado(erroValidacao({})), true);
  assert.equal(erroTratado(new Error('falha generica')), false);
});

const AMBIENTE_VALIDO = {
  NODE_ENV: 'test',
  PORT: '4000',
  CORS_ORIGIN: 'http://localhost:5173',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'projeto2_financas',
  DB_USER: 'postgres',
  DB_PASSWORD: 'senha-local',
  JWT_SECRET: 'a'.repeat(48),
  JWT_EXPIRACAO: '1h',
  LOGIN_MAX_TENTATIVAS: '5',
  LOGIN_JANELA_MINUTOS: '10',
};

test('ambiente valido gera configuracao tipada', () => {
  assert.equal(validarAmbiente(AMBIENTE_VALIDO), null);

  const ambiente = carregarAmbiente(AMBIENTE_VALIDO);
  assert.equal(ambiente.porta, 4000);
  assert.equal(ambiente.banco.porta, 5432);
  assert.equal(ambiente.banco.nome, 'projeto2_financas');
  assert.equal(ambiente.jwt.expiracao, '1h');
  assert.equal(ambiente.login.maxTentativas, 5);
});

test('aplica padroes quando variaveis opcionais estao ausentes', () => {
  const ambiente = carregarAmbiente({
    DB_HOST: 'localhost',
    DB_NAME: 'projeto2_financas',
    DB_USER: 'postgres',
    DB_PASSWORD: 'senha-local',
    JWT_SECRET: 'b'.repeat(40),
  });

  assert.equal(ambiente.nodeEnv, 'development');
  assert.equal(ambiente.porta, 3000);
  assert.equal(ambiente.corsOrigem, 'http://localhost:5173');
  assert.equal(ambiente.banco.porta, 5432);
  assert.equal(ambiente.jwt.expiracao, '2h');
  assert.equal(ambiente.login.maxTentativas, 10);
  assert.equal(ambiente.login.janelaMinutos, 15);
});

test('exige JWT_SECRET forte e dados do banco', () => {
  const erros = validarAmbiente({});
  assert.ok(erros.JWT_SECRET);
  assert.ok(erros.DB_HOST);
  assert.ok(erros.DB_NAME);
  assert.ok(erros.DB_USER);
  assert.ok(erros.DB_PASSWORD);

  const errosSecretCurto = validarAmbiente({ JWT_SECRET: 'curto' });
  assert.equal(errosSecretCurto.JWT_SECRET, 'JWT_SECRET deve ter pelo menos 32 caracteres.');
});

test('rejeita portas e limites invalidos', () => {
  const erros = validarAmbiente({ ...AMBIENTE_VALIDO, PORT: 'abc', DB_PORT: '70000', LOGIN_MAX_TENTATIVAS: '0' });
  assert.equal(erros.PORT, 'PORT deve ser um numero inteiro.');
  assert.equal(erros.DB_PORT, 'DB_PORT deve ser menor ou igual a 65535.');
  assert.equal(erros.LOGIN_MAX_TENTATIVAS, 'LOGIN_MAX_TENTATIVAS deve ser maior ou igual a 1.');
});

test('carregarAmbiente falha com mensagem clara quando ha erro', () => {
  assert.throws(() => carregarAmbiente({}), /Configuracao de ambiente invalida/);
});
