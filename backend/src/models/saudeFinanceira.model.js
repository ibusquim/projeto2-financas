/**
 * Consultas e montagem da resposta do desafio de saude financeira.
 *
 * Os numeros sao calculados no servidor: as consultas agregam no banco e as
 * formulas ficam em regras-saude-financeira.js.
 */

import { consultar } from '../config/db.js';
import { centavosParaReais, valorParaCentavos } from '../middlewares/validadores.js';
import { hojeIso } from './regras-datas.js';
import { previsaoDeFaturas } from './faturas.model.js';
import {
  AVISO_EDUCATIVO,
  MESES_HISTORICO,
  MESES_PROJECAO,
  calcularComprometimentoCartoes,
  calcularTaxaPoupanca,
  compararCategoriasComMedia,
  gerarDicas,
  projetarSaldos,
} from './regras-saude-financeira.js';

async function historicoMensal({ usuarioId, meses }) {
  const { rows } = await consultar(
    `SELECT to_char(date_trunc('month', data), 'YYYY-MM') AS mes,
            COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0)::text AS entradas,
            COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0)::text AS saidas
       FROM lancamentos
      WHERE usuario_id = $1
        AND data >= date_trunc('month', CURRENT_DATE) - (($2::int - 1) * interval '1 month')
        AND data <= CURRENT_DATE
      GROUP BY 1
      ORDER BY 1`,
    [usuarioId, meses],
  );

  return rows.map((linha) => ({
    mesReferencia: linha.mes,
    entradasCentavos: valorParaCentavos(linha.entradas) ?? 0,
    saidasCentavos: valorParaCentavos(linha.saidas) ?? 0,
  }));
}

async function categoriasDoMes({ usuarioId }) {
  const { rows } = await consultar(
    `SELECT c.id AS categoria_id, c.nome, SUM(l.valor)::text AS total
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.tipo = 'saida'
        AND l.data >= date_trunc('month', CURRENT_DATE)
        AND l.data <  date_trunc('month', CURRENT_DATE) + interval '1 month'
      GROUP BY c.id, c.nome
      ORDER BY SUM(l.valor) DESC`,
    [usuarioId],
  );

  return rows.map((linha) => ({
    categoriaId: linha.categoria_id,
    nome: linha.nome,
    totalCentavos: valorParaCentavos(linha.total) ?? 0,
  }));
}

async function categoriasDosMesesAnteriores({ usuarioId, meses }) {
  const { rows } = await consultar(
    `SELECT to_char(date_trunc('month', l.data), 'YYYY-MM') AS mes,
            c.id AS categoria_id,
            SUM(l.valor)::text AS total
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.tipo = 'saida'
        AND l.data >= date_trunc('month', CURRENT_DATE) - ($2::int * interval '1 month')
        AND l.data <  date_trunc('month', CURRENT_DATE)
      GROUP BY 1, 2
      ORDER BY 1`,
    [usuarioId, meses],
  );

  const porMes = new Map();
  for (const linha of rows) {
    if (!porMes.has(linha.mes)) porMes.set(linha.mes, []);
    porMes.get(linha.mes).push({
      categoriaId: linha.categoria_id,
      totalCentavos: valorParaCentavos(linha.total) ?? 0,
    });
  }

  return [...porMes.values()];
}

async function parcelasPorMesDoCartao({ usuarioId }) {
  const previsao = await previsaoDeFaturas({ usuarioId, meses: 12 });

  const mapa = new Map();
  let faturasFuturasCentavos = 0;
  let limiteUtilizadoCentavos = 0;

  for (const cartao of previsao.cartoes) {
    limiteUtilizadoCentavos += cartao.limiteUtilizadoCentavos;

    for (const fatura of cartao.faturas) {
      mapa.set(fatura.mesReferencia, (mapa.get(fatura.mesReferencia) ?? 0) + fatura.totalCentavos);
      faturasFuturasCentavos += fatura.totalCentavos;
    }
  }

  return {
    parcelasPorMes: [...mapa.entries()]
      .map(([mesReferencia, totalCentavos]) => ({ mesReferencia, totalCentavos }))
      .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia)),
    faturasFuturasCentavos,
    limiteUtilizadoCentavos,
  };
}

/** Monta o payload completo de GET /api/saude-financeira. */
export async function montarSaudeFinanceira({ usuarioId }) {
  const [historico, categoriasAtuais, historicoCategorias, cartoes] = await Promise.all([
    historicoMensal({ usuarioId, meses: MESES_HISTORICO }),
    categoriasDoMes({ usuarioId }),
    categoriasDosMesesAnteriores({ usuarioId, meses: MESES_HISTORICO }),
    parcelasPorMesDoCartao({ usuarioId }),
  ]);

  const entradasTotais = historico.reduce((total, mes) => total + mes.entradasCentavos, 0);
  const saidasTotais = historico.reduce((total, mes) => total + mes.saidasCentavos, 0);
  const divisor = historico.length > 0 ? historico.length : 1;

  const rendaMediaCentavos = Math.round(entradasTotais / divisor);
  const despesaMediaCentavos = Math.round(saidasTotais / divisor);

  const taxaPoupanca = calcularTaxaPoupanca({
    entradasCentavos: entradasTotais,
    saidasCentavos: saidasTotais,
  });

  const comprometimento = calcularComprometimentoCartoes({
    faturasFuturasCentavos: cartoes.faturasFuturasCentavos,
    rendaMediaCentavos,
  });

  const projecao = projetarSaldos({
    historico,
    parcelasPorMes: cartoes.parcelasPorMes,
    meses: MESES_PROJECAO,
    saldoInicialCentavos: 0,
  });

  const categoriasComparadas = compararCategoriasComMedia({
    atual: categoriasAtuais,
    historicoPorMes: historicoCategorias,
  });

  const categoriasForaDaCurva = categoriasComparadas.filter((item) => item.acimaDaMedia);
  const parcelasFuturasCentavos = cartoes.parcelasPorMes.reduce((total, item) => total + item.totalCentavos, 0);
  const saldoFinalProjetadoCentavos =
    projecao.projecao.length > 0 ? projecao.projecao[projecao.projecao.length - 1].saldoProjetadoCentavos : 0;

  let classificacaoProjecao = 'saudavel';
  if (saldoFinalProjetadoCentavos < 0) classificacaoProjecao = 'critica';
  else if (projecao.projecao.some((mes) => mes.saldoProjetadoCentavos < despesaMediaCentavos)) {
    classificacaoProjecao = 'atencao';
  }

  const indicadores = [
    {
      chave: 'taxaPoupanca',
      titulo: 'Taxa de poupanca',
      valor: taxaPoupanca.percentual,
      unidade: '%',
      classificacao: taxaPoupanca.classificacao,
      explicacao: 'Percentual da renda que sobrou no periodo analisado (entradas menos saidas).',
    },
    {
      chave: 'comprometimentoCartoes',
      titulo: 'Comprometimento com cartoes',
      valor: comprometimento.percentual,
      unidade: '%',
      classificacao: comprometimento.classificacao,
      explicacao: 'Soma das faturas ainda nao vencidas dividida pela renda media mensal.',
    },
    {
      chave: 'parcelasFuturas',
      titulo: 'Parcelas a vencer',
      valor: centavosParaReais(parcelasFuturasCentavos),
      unidade: 'BRL',
      classificacao: parcelasFuturasCentavos > rendaMediaCentavos ? 'atencao' : 'saudavel',
      explicacao: 'Total de parcelas de cartao ja lancadas e ainda nao vencidas.',
    },
    {
      chave: 'projecaoSaldo',
      titulo: `Saldo projetado em ${projecao.projecao.length} meses`,
      valor: centavosParaReais(saldoFinalProjetadoCentavos),
      unidade: 'BRL',
      classificacao: classificacaoProjecao,
      explicacao: 'Media de entradas e saidas dos ultimos meses somada as parcelas ja conhecidas.',
    },
    {
      chave: 'categoriaForaDaCurva',
      titulo: 'Categoria fora da curva',
      valor: categoriasForaDaCurva.length,
      unidade: 'quantidade',
      classificacao: categoriasForaDaCurva.length > 0 ? 'atencao' : 'saudavel',
      explicacao: 'Categorias com gasto acima da media dos meses anteriores.',
    },
  ];

  return {
    geradoEm: hojeIso(),
    aviso: AVISO_EDUCATIVO,
    periodosAnalisados: MESES_HISTORICO,
    rendaMediaMensal: centavosParaReais(rendaMediaCentavos),
    despesaMediaMensal: centavosParaReais(despesaMediaCentavos),
    indicadores,
    historico: historico.map((mes) => ({
      mesReferencia: mes.mesReferencia,
      entradas: centavosParaReais(mes.entradasCentavos),
      saidas: centavosParaReais(mes.saidasCentavos),
      saldo: centavosParaReais(mes.entradasCentavos - mes.saidasCentavos),
    })),
    projecao: projecao.projecao.map((mes) => ({
      mesReferencia: mes.mesReferencia,
      entradas: centavosParaReais(mes.entradasCentavos),
      saidas: centavosParaReais(mes.saidasCentavos),
      parcelas: centavosParaReais(mes.parcelasCentavos),
      saldoProjetado: centavosParaReais(mes.saldoProjetadoCentavos),
      saldoProjetadoCentavos: mes.saldoProjetadoCentavos,
    })),
    categoriasForaDaCurva: categoriasForaDaCurva.map((item) => ({
      categoriaId: item.categoriaId,
      nome: item.nome,
      total: centavosParaReais(item.totalCentavos),
      media: centavosParaReais(item.mediaCentavos),
      variacaoPercentual: item.variacaoPercentual,
    })),
    categoriasComparadas: categoriasComparadas.map((item) => ({
      categoriaId: item.categoriaId,
      nome: item.nome,
      total: centavosParaReais(item.totalCentavos),
      media: centavosParaReais(item.mediaCentavos),
      variacaoPercentual: item.variacaoPercentual,
      acimaDaMedia: item.acimaDaMedia,
    })),
    limiteCartoesUtilizado: centavosParaReais(cartoes.limiteUtilizadoCentavos),
    dicas: gerarDicas({
      taxaPoupanca,
      comprometimentoCartoes: comprometimento,
      parcelasFuturasCentavos,
      categoriasForaDaCurva,
      projecao: projecao.projecao,
    }),
  };
}
