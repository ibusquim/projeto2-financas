/**
 * Seed de demonstracao: dois usuarios e tres meses de lancamentos.
 *
 * Reaproveita os models reais, garantindo que as regras de negocio e as
 * constraints do banco sejam as mesmas da aplicacao. Roda de forma idempotente:
 * apaga os usuarios de demonstracao antes de recriar.
 *
 * Uso: npm run db:seed
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { consultar, comTransacao, encerrarPool } from '../../src/config/db.js';
import * as usuarios from '../../src/models/usuarios.model.js';
import * as categorias from '../../src/models/categorias.model.js';
import * as fontesDestinos from '../../src/models/fontesDestinos.model.js';
import * as lancamentos from '../../src/models/lancamentos.model.js';
import { adicionarMeses, montarDataIso, hojeIso, desmembrarDataIso } from '../../src/models/regras-datas.js';

const SENHA_DEMO = 'senha1234';
const RODADAS_HASH = 10;

const PESSOAS = [
  { nome: 'Igor Demonstracao', email: 'igor.demo@exemplo.com', cpf: '52998224725' },
  { nome: 'Rafael Demonstracao', email: 'rafael.demo@exemplo.com', cpf: '11144477735' },
];

async function limparUsuarioPorEmail(email) {
  const { rows } = await consultar('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (!rows[0]) return;

  const id = rows[0].id;
  await comTransacao(async (cliente) => {
    await cliente.query('DELETE FROM lancamentos WHERE usuario_id = $1', [id]);
    await cliente.query('DELETE FROM categorias WHERE usuario_id = $1', [id]);
    await cliente.query('DELETE FROM fontes_destinos WHERE usuario_id = $1', [id]);
    await cliente.query('DELETE FROM usuarios WHERE id = $1', [id]);
  });
}

async function criarLancamentosDoUsuario(usuarioId, anoBase, mesBase) {
  const listaCategorias = await categorias.listar(usuarioId);
  const listaFontes = await fontesDestinos.listar(usuarioId);

  const conta = listaFontes.find((fonte) => fonte.tipo === 'conta');
  const salario = listaCategorias.find((item) => item.tipo === 'entrada' && item.nome === 'Salario');
  const alimentacao = listaCategorias.find((item) => item.tipo === 'saida' && item.nome === 'Alimentacao');
  const lazer = listaCategorias.find((item) => item.tipo === 'saida' && item.nome === 'Lazer');

  if (!conta || !salario || !alimentacao || !lazer) {
    throw new Error('Dados padrao do usuario incompletos: verifique categorias e conta padrao.');
  }

  const cartao = await fontesDestinos.criar(usuarioId, {
    nome: 'Cartao Visa Demo',
    tipo: 'cartao_credito',
    diaFechamento: 25,
    diaVencimento: 5,
    limiteCentavos: 500000,
  });

  // Tres meses: atual, anterior e retrasado.
  for (let deslocamento = 2; deslocamento >= 0; deslocamento -= 1) {
    const { ano, mes } = adicionarMeses(anoBase, mesBase, -deslocamento);

    await lancamentos.criar({
      usuarioId,
      tipo: 'entrada',
      descricao: `Salario ${mes}/${ano}`,
      valorCentavos: 450000,
      data: montarDataIso(ano, mes, 5),
      categoriaId: salario.id,
      fonteDestinoId: conta.id,
    });

    await lancamentos.criar({
      usuarioId,
      tipo: 'saida',
      descricao: `Mercado ${mes}/${ano}`,
      valorCentavos: 60000 + deslocamento * 1500,
      data: montarDataIso(ano, mes, 10),
      categoriaId: alimentacao.id,
      fonteDestinoId: conta.id,
    });

    await lancamentos.criar({
      usuarioId,
      tipo: 'saida',
      descricao: `Cinema ${mes}/${ano}`,
      valorCentavos: 8000,
      data: montarDataIso(ano, mes, 18),
      categoriaId: lazer.id,
      fonteDestinoId: cartao.id,
    });
  }

  // Compra parcelada de R$ 3.000,00 em 3x (R$ 1.000,00 por parcela).
  const parcelada = await lancamentos.criarParcelado({
    usuarioId,
    tipo: 'saida',
    descricao: 'Notebook',
    valorCentavos: 300000,
    data: montarDataIso(anoBase, mesBase, 20),
    categoriaId: lazer.id,
    fonteDestinoId: cartao.id,
    totalParcelas: 3,
  });

  return { cartao, parcelada };
}

async function principal() {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, RODADAS_HASH);

  const hoje = desmembrarDataIso(hojeIso());

  for (const pessoa of PESSOAS) {
    await limparUsuarioPorEmail(pessoa.email);

    const usuario = await usuarios.criarComDadosPadrao({ ...pessoa, senhaHash });
    const { parcelada } = await criarLancamentosDoUsuario(usuario.id, hoje.ano, hoje.mes);

    console.log(
      `[db:seed] ${pessoa.email} | senha: ${SENHA_DEMO} | parcelamento: ${parcelada.grupoParcelamento} (${parcelada.totalParcelas}x de ${parcelada.parcelas[0].valor})`,
    );
  }

  const { rows } = await consultar(
    `SELECT u.email, COUNT(l.id)::int AS lancamentos
       FROM usuarios u
       LEFT JOIN lancamentos l ON l.usuario_id = u.id
      WHERE u.email = ANY($1)
      GROUP BY u.email
      ORDER BY u.email`,
    [PESSOAS.map((pessoa) => pessoa.email)],
  );

  for (const linha of rows) {
    console.log(`[db:seed] total de lancamentos de ${linha.email}: ${linha.lancamentos}`);
  }

  console.log('[db:seed] concluido.');
}

principal()
  .catch((erro) => {
    console.error('[db:seed] falhou:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
