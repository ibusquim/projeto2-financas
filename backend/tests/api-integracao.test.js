/**
 * Testes de integracao da API com banco real.
 *
 * Cobrem: cadastro e unicidade, login, isolamento entre dois usuarios, CRUDs,
 * parcelamento com centavos exatos, relatorios e previsao de faturas.
 *
 * Se o banco nao estiver disponivel, os testes sao marcados como skip em vez de
 * falhar, para nao confundir falta de ambiente com bug de codigo.
 */

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/server.js';
import { consultar, encerrarPool } from '../src/config/db.js';
import { adicionarMeses, desmembrarDataIso, hojeIso, montarDataIso } from '../src/models/regras-datas.js';

async function bancoDisponivel() {
  try {
    await consultar('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}

const DISPONIVEL = await bancoDisponivel();

/** Gera CPF valido a partir de 9 digitos, para nao colidir com o seed. */
function gerarCpfValido(base9) {
  const numeros = base9.split('').map(Number);
  const digito = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i += 1) soma += numeros[i] * (quantidade + 1 - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  numeros.push(digito(9));
  numeros.push(digito(10));
  return numeros.join('');
}

const SELO = String(Date.now()).slice(-9);

const USUARIO_A = {
  nome: 'Usuario A Teste',
  email: `teste.a.${SELO}@exemplo.com`,
  cpf: gerarCpfValido(`12${SELO.slice(-7)}`),
  senha: 'senha1234',
  confirmacaoSenha: 'senha1234',
};

const USUARIO_B = {
  nome: 'Usuario B Teste',
  email: `teste.b.${SELO}@exemplo.com`,
  cpf: gerarCpfValido(`98${SELO.slice(-7)}`),
  senha: 'senha1234',
  confirmacaoSenha: 'senha1234',
};

const contexto = { tokenA: null, tokenB: null, idA: null, idB: null, categoriaA: null, contaA: null, cartaoA: null, lancamentoA: null };

async function garantirUsuarios() {
  if (!DISPONIVEL || contexto.tokenA) return;

  for (const usuario of [USUARIO_A, USUARIO_B]) {
    const resposta = await request(app).post('/api/auth/cadastro').send(usuario);
    assert.equal(resposta.status, 201, `cadastro de ${usuario.email}: ${JSON.stringify(resposta.body)}`);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: usuario.email, senha: usuario.senha });
    assert.equal(login.status, 200);

    if (usuario === USUARIO_A) {
      contexto.tokenA = login.body.token;
      contexto.idA = login.body.usuario.id;
    } else {
      contexto.tokenB = login.body.token;
      contexto.idB = login.body.usuario.id;
    }
  }
}

function authA() {
  return { Authorization: `Bearer ${contexto.tokenA}` };
}

function authB() {
  return { Authorization: `Bearer ${contexto.tokenB}` };
}

async function prepararDadosDoUsuarioA() {
  if (!DISPONIVEL || contexto.categoriaA) return;

  const categorias = await request(app).get('/api/categorias').set(authA());
  contexto.categoriaA = categorias.body.find((item) => item.tipo === 'saida');

  const contas = await request(app).get('/api/fontes-destinos').set(authA());
  contexto.contaA = contas.body.find((item) => item.tipo === 'conta');

  const cartao = await request(app)
    .post('/api/fontes-destinos')
    .set(authA())
    .send({
      nome: 'Cartao Teste A',
      tipo: 'cartao_credito',
      diaFechamento: 25,
      diaVencimento: 5,
      limite: '5000.00',
    });
  assert.equal(cartao.status, 201, JSON.stringify(cartao.body));
  contexto.cartaoA = cartao.body;
}

after(async () => {
  if (DISPONIVEL) {
    for (const email of [USUARIO_A.email, USUARIO_B.email]) {
      const { rows } = await consultar('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (rows[0]) {
        await consultar('DELETE FROM lancamentos WHERE usuario_id = $1', [rows[0].id]);
        await consultar('DELETE FROM categorias WHERE usuario_id = $1', [rows[0].id]);
        await consultar('DELETE FROM fontes_destinos WHERE usuario_id = $1', [rows[0].id]);
        await consultar('DELETE FROM usuarios WHERE id = $1', [rows[0].id]);
      }
    }
  }
  await encerrarPool();
});

test('cadastro cria categorias e conta padrao', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const categorias = await request(app).get('/api/categorias').set(authA());
  assert.equal(categorias.status, 200);
  assert.ok(categorias.body.length >= 8, 'deve existir o conjunto de categorias padrao');

  const fontes = await request(app).get('/api/fontes-destinos').set(authA());
  assert.ok(fontes.body.some((item) => item.nome === 'Conta corrente'));
});

test('e-mail duplicado responde 409 no campo email', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const resposta = await request(app)
    .post('/api/auth/cadastro')
    .send({ ...USUARIO_A, email: USUARIO_A.email.toUpperCase(), cpf: gerarCpfValido(`77${SELO.slice(-7)}`) });

  assert.equal(resposta.status, 409);
  assert.ok(resposta.body.campos.email);
});

test('CPF duplicado responde 409 no campo cpf', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const resposta = await request(app)
    .post('/api/auth/cadastro')
    .send({ ...USUARIO_A, email: `outro.${SELO}@exemplo.com` });

  assert.equal(resposta.status, 409);
  assert.ok(resposta.body.campos.cpf);
});

test('login com senha errada responde 401 generico', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');

  const resposta = await request(app)
    .post('/api/auth/login')
    .send({ email: USUARIO_A.email, senha: 'senhaerrada1' });

  assert.equal(resposta.status, 401);
  assert.equal(resposta.body.erro, 'E-mail ou senha invalidos.');
});

test('/auth/me devolve usuario sem senha_hash', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const resposta = await request(app).get('/api/auth/me').set(authA());

  assert.equal(resposta.status, 200);
  assert.equal(resposta.body.email, USUARIO_A.email);
  assert.equal('senha_hash' in resposta.body, false);
  assert.equal('senhaHash' in resposta.body, false);
});

test('usuario B nao ve categorias nem lancamentos do usuario A', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const lancamento = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Compra do usuario A',
    valor: '50.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contexto.contaA.id,
  });
  assert.equal(lancamento.status, 201, JSON.stringify(lancamento.body));
  contexto.lancamentoA = lancamento.body;

  const listagemB = await request(app).get('/api/lancamentos').set(authB());
  assert.equal(listagemB.status, 200);
  assert.equal(listagemB.body.itens.length, 0);

  const leituraB = await request(app).get(`/api/lancamentos/${contexto.lancamentoA.id}`).set(authB());
  assert.equal(leituraB.status, 404);

  const edicaoB = await request(app)
    .put(`/api/lancamentos/${contexto.lancamentoA.id}`)
    .set(authB())
    .send({
      tipo: 'saida',
      descricao: 'Tentativa de edicao',
      valor: '10.00',
      data: hojeIso(),
      categoriaId: 1,
      fonteDestinoId: 1,
    });
  assert.equal(edicaoB.status, 404);

  const exclusaoB = await request(app).delete(`/api/lancamentos/${contexto.lancamentoA.id}`).set(authB());
  assert.equal(exclusaoB.status, 404);

  const categoriasB = await request(app).get('/api/categorias').set(authB());
  const nomesB = categoriasB.body.map((item) => `${item.tipo}:${item.nome}`);
  assert.equal(nomesB.includes(`saida:${contexto.categoriaA.nome}`), true, 'categorias padrao sao independentes');
});

test('usuario B nao consegue usar categoria do usuario A', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const fontesB = await request(app).get('/api/fontes-destinos').set(authB());
  const contaB = fontesB.body.find((item) => item.tipo === 'conta');

  const resposta = await request(app).post('/api/lancamentos').set(authB()).send({
    tipo: contexto.categoriaA.tipo,
    descricao: 'Tentativa com categoria alheia',
    valor: '10.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contaB.id,
  });

  assert.equal(resposta.status, 404);
});

test('categoria duplicada responde 409', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const resposta = await request(app)
    .post('/api/categorias')
    .set(authA())
    .send({ nome: 'Alimentacao', tipo: 'saida' });

  assert.equal(resposta.status, 409);
  assert.ok(resposta.body.campos.nome);
});

test('categoria com lancamentos nao pode ser excluida', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const resposta = await request(app).delete(`/api/categorias/${contexto.categoriaA.id}`).set(authA());

  assert.equal(resposta.status, 409);
});

test('cartao sem fechamento, vencimento ou limite responde 400', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();

  const resposta = await request(app)
    .post('/api/fontes-destinos')
    .set(authA())
    .send({ nome: 'Cartao Incompleto', tipo: 'cartao_credito' });

  assert.equal(resposta.status, 400);
  assert.ok(resposta.body.campos.diaFechamento);
  assert.ok(resposta.body.campos.diaVencimento);
  assert.ok(resposta.body.campos.limite);
});

test('lancamento com valor zero responde 400', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const resposta = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Valor zero',
    valor: '0.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contexto.contaA.id,
  });

  assert.equal(resposta.status, 400);
  assert.equal(resposta.body.campos.valor, 'O valor deve ser maior que zero.');
});

test('lancamento com categoria de tipo incompativel responde 400', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const categorias = await request(app).get('/api/categorias').set(authA());
  const categoriaEntrada = categorias.body.find((item) => item.tipo === 'entrada');

  const resposta = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Incompativel',
    valor: '10.00',
    data: hojeIso(),
    categoriaId: categoriaEntrada.id,
    fonteDestinoId: contexto.contaA.id,
  });

  assert.equal(resposta.status, 400);
  assert.ok(resposta.body.campos.categoriaId);
});

test('compra de R$ 100,00 em 3x gera 33,34 + 33,33 + 33,33 no mesmo grupo', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const resposta = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Notebook teste',
    valor: '100.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contexto.cartaoA.id,
    parcelas: 3,
  });

  assert.equal(resposta.status, 201, JSON.stringify(resposta.body));
  assert.equal(resposta.body.totalParcelas, 3);
  assert.equal(resposta.body.valorTotal, '100.00');
  assert.deepEqual(resposta.body.parcelas.map((item) => item.valor), ['33.34', '33.33', '33.33']);

  const soma = resposta.body.parcelas.reduce((total, item) => total + item.valorCentavos, 0);
  assert.equal(soma, 10000);

  const grupos = new Set(resposta.body.parcelas.map((item) => item.grupoParcelamento ?? resposta.body.grupoParcelamento));
  assert.equal(grupos.size, 1);

  const excluir = await request(app)
    .delete(`/api/lancamentos/${resposta.body.parcelas[0].id}`)
    .query({ escopo: 'grupo' })
    .set(authA());
  assert.equal(excluir.status, 204);

  const conferencia = await request(app).get(`/api/lancamentos/${resposta.body.parcelas[1].id}`).set(authA());
  assert.equal(conferencia.status, 404);
});

test('parcelamento em conta comum responde 400', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const resposta = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Parcelado em conta',
    valor: '100.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contexto.contaA.id,
    parcelas: 3,
  });

  assert.equal(resposta.status, 400);
  assert.ok(resposta.body.campos.parcelas);
});

test('listagem filtra por periodo e devolve totais e paginacao', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const hoje = desmembrarDataIso(hojeIso());
  const inicio = montarDataIso(hoje.ano, hoje.mes, 1);
  const fim = montarDataIso(hoje.ano, hoje.mes, 28);

  const resposta = await request(app)
    .get('/api/lancamentos')
    .query({ inicio, fim, porPagina: 10 })
    .set(authA());

  assert.equal(resposta.status, 200);
  assert.ok(resposta.body.paginacao.totalItens >= 1);
  assert.ok(resposta.body.totais.entradas);
  assert.ok(resposta.body.totais.saidas);
  assert.ok(resposta.body.totais.saldo);
});

test('relatorio por categoria calcula percentual e tendencia', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const hoje = desmembrarDataIso(hojeIso());
  const inicio = montarDataIso(hoje.ano, hoje.mes, 1);
  const fim = montarDataIso(hoje.ano, hoje.mes, 28);

  const resposta = await request(app)
    .get('/api/relatorios/categorias')
    .query({ inicio, fim })
    .set(authA());

  assert.equal(resposta.status, 200);
  assert.ok(Array.isArray(resposta.body.saidasPorCategoria));
  assert.ok(resposta.body.periodoAnterior.inicio < resposta.body.periodo.inicio);

  for (const item of resposta.body.saidasPorCategoria) {
    assert.equal(typeof item.percentual, 'number');
    assert.ok(['aumento', 'reducao', 'estavel'].includes(item.tendencia));
  }
});

test('relatorio por fonte/destino separa entradas, saidas e saldo de conta', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const hoje = desmembrarDataIso(hojeIso());
  const inicio = montarDataIso(hoje.ano, hoje.mes, 1);
  const fim = montarDataIso(hoje.ano, hoje.mes, 28);

  const resposta = await request(app)
    .get('/api/relatorios/fontes-destinos')
    .query({ inicio, fim })
    .set(authA());

  assert.equal(resposta.status, 200);
  assert.ok(Array.isArray(resposta.body.entradasPorFonte));
  assert.ok(Array.isArray(resposta.body.saidasPorDestino));
  assert.ok(Array.isArray(resposta.body.saldoPorConta));
});

test('previsao de faturas devolve pelo menos tres faturas com itens', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const compra = await request(app).post('/api/lancamentos').set(authA()).send({
    tipo: 'saida',
    descricao: 'Notebook fatura',
    valor: '300.00',
    data: hojeIso(),
    categoriaId: contexto.categoriaA.id,
    fonteDestinoId: contexto.cartaoA.id,
    parcelas: 3,
  });
  assert.equal(compra.status, 201);

  const resposta = await request(app).get('/api/relatorios/faturas').query({ meses: 3 }).set(authA());

  assert.equal(resposta.status, 200);
  const cartao = resposta.body.cartoes.find((item) => item.cartaoId === contexto.cartaoA.id);
  assert.ok(cartao, 'cartao do usuario deve aparecer');
  assert.ok(cartao.faturas.length >= 3);
  assert.ok(cartao.faturas.some((fatura) => fatura.itens.length > 0));
  assert.ok(cartao.faturas.every((fatura) => fatura.fechamento && fatura.vencimento && fatura.mesReferencia));
});

test('consultar fatura de cartao de outro usuario nao vaza dados', async (t) => {
  if (!DISPONIVEL) return t.skip('banco indisponivel');
  await garantirUsuarios();
  await prepararDadosDoUsuarioA();

  const resposta = await request(app)
    .get('/api/relatorios/faturas')
    .query({ cartaoId: contexto.cartaoA.id })
    .set(authB());

  assert.equal(resposta.status, 200);
  assert.deepEqual(resposta.body.cartoes, []);
});
