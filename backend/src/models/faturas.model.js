/**
 * Previsao de faturas de cartao de credito (RF9).
 *
 * O calculo em si fica em regras-faturas.js, coberto por testes. Aqui apenas
 * buscamos os dados do usuario e montamos a resposta do contrato.
 */

import { consultar } from '../config/db.js';
import { centavosParaReais, valorParaCentavos } from '../middlewares/validadores.js';
import { hojeIso } from './regras-datas.js';
import { previsaoFaturas, statusFatura } from './regras-faturas.js';

async function listarCartoes(usuarioId, cartaoId) {
  const parametros = [usuarioId];
  let filtro = '';
  if (cartaoId) {
    parametros.push(cartaoId);
    filtro = ' AND id = $2';
  }

  const { rows } = await consultar(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite::text AS limite
       FROM fontes_destinos
      WHERE usuario_id = $1
        AND tipo = 'cartao_credito'${filtro}
      ORDER BY nome`,
    parametros,
  );

  return rows.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    diaFechamento: linha.dia_fechamento,
    diaVencimento: linha.dia_vencimento,
    limite: linha.limite,
    limiteCentavos: valorParaCentavos(linha.limite),
  }));
}

async function listarParcelasDoCartao(usuarioId, cartaoId) {
  const { rows } = await consultar(
    `SELECT id, descricao, valor::text AS valor, data::text AS data, parcela_atual, total_parcelas
       FROM lancamentos
      WHERE usuario_id = $1
        AND fonte_destino_id = $2
      ORDER BY data, id`,
    [usuarioId, cartaoId],
  );

  return rows.map((linha) => ({
    id: linha.id,
    descricao: linha.descricao,
    valorCentavos: valorParaCentavos(linha.valor),
    data: linha.data,
    parcelaAtual: linha.parcela_atual,
    totalParcelas: linha.total_parcelas,
  }));
}

export async function previsaoDeFaturas({ usuarioId, meses = 3, cartaoId = null }) {
  const dataReferencia = hojeIso();
  const cartoes = await listarCartoes(usuarioId, cartaoId);
  const saida = [];

  for (const cartao of cartoes) {
    const parcelas = await listarParcelasDoCartao(usuarioId, cartao.id);

    const previsao = previsaoFaturas({
      parcelas,
      diaFechamento: cartao.diaFechamento,
      diaVencimento: cartao.diaVencimento,
      limiteCentavos: cartao.limiteCentavos ?? 0,
      dataReferencia,
      quantidadeFaturas: meses,
    });

    saida.push({
      cartaoId: cartao.id,
      nome: cartao.nome,
      diaFechamento: cartao.diaFechamento,
      diaVencimento: cartao.diaVencimento,
      limite: cartao.limite,
      limiteUtilizado: centavosParaReais(previsao.limiteUtilizadoCentavos),
      limiteDisponivel: centavosParaReais(previsao.limiteDisponivelCentavos),
      limiteUtilizadoCentavos: previsao.limiteUtilizadoCentavos,
      limiteDisponivelCentavos: previsao.limiteDisponivelCentavos,
      faturas: previsao.faturas.map((fatura) => ({
        mesReferencia: fatura.mesReferencia,
        fechamento: fatura.fechamento,
        vencimento: fatura.vencimento,
        total: centavosParaReais(fatura.totalCentavos),
        totalCentavos: fatura.totalCentavos,
        status: statusFatura(fatura, dataReferencia),
        itens: fatura.itens.map((item) => ({
          lancamentoId: item.lancamentoId,
          descricao: item.descricao,
          rotuloParcela: item.rotuloParcela,
          parcelaAtual: item.parcelaAtual,
          totalParcelas: item.totalParcelas,
          valor: centavosParaReais(item.valorCentavos),
          valorCentavos: item.valorCentavos,
        })),
      })),
    });
  }

  return { dataReferencia, cartoes: saida };
}
