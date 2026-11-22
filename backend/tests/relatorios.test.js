import test from 'node:test';
import assert from 'node:assert/strict';

import {
  agruparPorCategoria,
  arredondar,
  calcularPercentual,
  calcularTotais,
  montarRelatorioCategorias,
  montarRelatorioFontesDestinos,
  variacaoPercentual,
} from '../src/models/regras-relatorios.js';

const lancamento = (tipo, valorCentavos, categoriaId, categoriaNome, fonteDestinoId) => ({
  tipo,
  valorCentavos,
  categoriaId,
  categoriaNome,
  fonteDestinoId,
});

test('arredondar evita ruido de ponto flutuante', () => {
  assert.equal(arredondar(58.33333333), 58.33);
  assert.equal(arredondar(16.66666666), 16.67);
  assert.equal(arredondar(1.005, 2), 1.01);
});

test('percentual sobre o total de saidas', () => {
  assert.equal(calcularPercentual(70000, 120000), 58.33);
  assert.equal(calcularPercentual(50000, 120000), 41.67);
  assert.equal(calcularPercentual(0, 0), 0);
});

test('variacao percentual com tendencia', () => {
  assert.deepEqual(variacaoPercentual(70000, 60000), { variacaoPercentual: 16.67, tendencia: 'aumento', nova: false });
  assert.deepEqual(variacaoPercentual(60000, 70000), { variacaoPercentual: -14.29, tendencia: 'reducao', nova: false });
  assert.deepEqual(variacaoPercentual(60000, 60000), { variacaoPercentual: 0, tendencia: 'estavel', nova: false });
});

test('categoria nova quando nao havia gasto no periodo anterior', () => {
  assert.deepEqual(variacaoPercentual(50000, 0), { variacaoPercentual: null, tendencia: 'aumento', nova: true });
  assert.deepEqual(variacaoPercentual(0, 0), { variacaoPercentual: 0, tendencia: 'estavel', nova: false });
});

test('agruparPorCategoria soma e ordena do maior para o menor', () => {
  const lancamentos = [
    lancamento('saida', 30000, 1, 'Alimentacao', 1),
    lancamento('saida', 20000, 2, 'Lazer', 1),
    lancamento('saida', 10000, 1, 'Alimentacao', 1),
    lancamento('entrada', 90000, 3, 'Salario', 2),
  ];

  const saidas = agruparPorCategoria(lancamentos, 'saida');
  assert.deepEqual(saidas.map((item) => item.nome), ['Alimentacao', 'Lazer']);
  assert.deepEqual(saidas.map((item) => item.totalCentavos), [40000, 20000]);
});

test('calcularTotais devolve entradas, saidas e saldo', () => {
  const totais = calcularTotais([
    lancamento('entrada', 500000, 1, 'Salario', 1),
    lancamento('saida', 150000, 2, 'Moradia', 2),
    lancamento('saida', 50000, 3, 'Lazer', 2),
  ]);

  assert.deepEqual(totais, { entradasCentavos: 500000, saidasCentavos: 200000, saldoCentavos: 300000 });
});

test('relatorio por categoria: totais, percentuais e comparacao com periodo anterior', () => {
  const atual = [
    lancamento('entrada', 500000, 1, 'Salario', 1),
    lancamento('saida', 70000, 2, 'Alimentacao', 2),
    lancamento('saida', 50000, 3, 'Transporte', 2),
  ];
  const anterior = [
    lancamento('saida', 60000, 2, 'Alimentacao', 2),
    lancamento('saida', 20000, 4, 'Saude', 2),
  ];

  const relatorio = montarRelatorioCategorias({
    lancamentosAtual: atual,
    lancamentosAnterior: anterior,
    periodo: { inicio: '2026-11-01', fim: '2026-11-30' },
    periodoAnterior: { inicio: '2026-10-02', fim: '2026-10-31' },
  });

  assert.equal(relatorio.totalSaidasCentavos, 120000);
  assert.equal(relatorio.totalEntradasCentavos, 500000);
  assert.equal(relatorio.saldoCentavos, 380000);
  assert.equal(relatorio.saidasPorCategoria[0].nome, 'Alimentacao');
  assert.equal(relatorio.saidasPorCategoria[0].percentual, 58.33);
  assert.equal(relatorio.saidasPorCategoria[0].variacaoPercentual, 16.67);
  assert.equal(relatorio.saidasPorCategoria[0].tendencia, 'aumento');
  assert.equal(relatorio.saidasPorCategoria[1].nome, 'Transporte');
  assert.equal(relatorio.saidasPorCategoria[1].categoriaNova, true);
  assert.equal(relatorio.entradasPorCategoria[0].percentual, 100);
  assert.equal(relatorio.variacaoTotalSaidas.tendencia, 'aumento');
});

test('relatorio por fonte/destino separa entradas, saidas e saldo de conta', () => {
  const fontesDestinos = [
    { id: 1, nome: 'Salario CLT', tipo: 'renda' },
    { id: 2, nome: 'Conta corrente', tipo: 'conta' },
    { id: 3, nome: 'Nubank', tipo: 'cartao_credito' },
  ];
  const lancamentos = [
    lancamento('entrada', 500000, 1, 'Salario', 2),
    lancamento('saida', 40000, 2, 'Mercado', 2),
    lancamento('saida', 60000, 3, 'Lazer', 3),
  ];

  const relatorio = montarRelatorioFontesDestinos({ lancamentos, fontesDestinos });

  assert.deepEqual(relatorio.entradasPorFonte, [
    { fonteDestinoId: 2, nome: 'Conta corrente', tipo: 'conta', totalCentavos: 500000 },
  ]);
  assert.deepEqual(relatorio.saidasPorDestino.map((item) => item.fonteDestinoId), [3, 2]);
  assert.deepEqual(relatorio.saldoPorConta, [
    { fonteDestinoId: 2, nome: 'Conta corrente', entradasCentavos: 500000, saidasCentavos: 40000, saldoCentavos: 460000 },
  ]);
});

test('relatorio por fonte/destino com periodo vazio nao quebra', () => {
  const relatorio = montarRelatorioFontesDestinos({
    lancamentos: [],
    fontesDestinos: [{ id: 1, nome: 'Conta corrente', tipo: 'conta' }],
  });

  assert.deepEqual(relatorio.entradasPorFonte, []);
  assert.deepEqual(relatorio.saidasPorDestino, []);
  assert.deepEqual(relatorio.saldoPorConta, [
    { fonteDestinoId: 1, nome: 'Conta corrente', entradasCentavos: 0, saidasCentavos: 0, saldoCentavos: 0 },
  ]);
});
