import test from 'node:test';
import assert from 'node:assert/strict';

import {
  agruparParcelasPorFatura,
  calcularFatura,
  previsaoFaturas,
  somarParcelasNaoVencidas,
  statusFatura,
} from '../src/models/regras-faturas.js';
import { gerarParcelas } from '../src/models/regras-parcelamento.js';

const NUBANK = { diaFechamento: 3, diaVencimento: 10 };
const VISA = { diaFechamento: 25, diaVencimento: 5 };

test('exemplo 1 do enunciado: Nubank, compra em 02/11/2026 antes do fechamento', () => {
  const fatura = calcularFatura({ dataCompra: '2026-11-02', ...NUBANK, parcelaAtual: 1 });
  assert.deepEqual(fatura, { mesReferencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10' });
});

test('exemplo 2 do enunciado: Nubank, compra em 03/11/2026 no dia do fechamento', () => {
  const fatura = calcularFatura({ dataCompra: '2026-11-03', ...NUBANK, parcelaAtual: 1 });
  assert.deepEqual(fatura, { mesReferencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10' });
});

test('exemplo 3 do enunciado: Visa, compra em 28/12/2026 depois do fechamento', () => {
  const fatura = calcularFatura({ dataCompra: '2026-12-28', ...VISA, parcelaAtual: 1 });
  assert.deepEqual(fatura, { mesReferencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' });
});

test('exemplo 4 do enunciado: Visa, compra em 20/12/2026, parcela 3 de 3', () => {
  const fatura = calcularFatura({ dataCompra: '2026-12-20', ...VISA, parcelaAtual: 3 });
  assert.deepEqual(fatura, { mesReferencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05' });
});

test('compra no dia seguinte ao fechamento vai para o mes seguinte', () => {
  const fatura = calcularFatura({ dataCompra: '2026-11-04', ...NUBANK, parcelaAtual: 1 });
  assert.equal(fatura.mesReferencia, '2026-12');
});

test('fechamento no dia 31 em mes curto e ajustado ao ultimo dia', () => {
  const antes = calcularFatura({ dataCompra: '2026-02-10', diaFechamento: 31, diaVencimento: 10 });
  assert.deepEqual(antes, { mesReferencia: '2026-03', fechamento: '2026-02-28', vencimento: '2026-03-10' });

  const noUltimoDia = calcularFatura({ dataCompra: '2026-02-28', diaFechamento: 31, diaVencimento: 10 });
  assert.deepEqual(noUltimoDia, { mesReferencia: '2026-04', fechamento: '2026-03-31', vencimento: '2026-04-10' });
});

test('vencimento igual ao fechamento cai no mes seguinte', () => {
  const fatura = calcularFatura({ dataCompra: '2026-11-01', diaFechamento: 10, diaVencimento: 10 });
  assert.deepEqual(fatura, { mesReferencia: '2026-12', fechamento: '2026-11-10', vencimento: '2026-12-10' });
});

test('status da fatura considera fechamento e vencimento', () => {
  const fatura = { fechamento: '2026-11-03', vencimento: '2026-11-10' };
  assert.equal(statusFatura(fatura, '2026-11-01'), 'aberta');
  assert.equal(statusFatura(fatura, '2026-11-05'), 'fechada');
  assert.equal(statusFatura(fatura, '2026-11-10'), 'vencida');
});

test('parcelas de uma compra se distribuem em faturas consecutivas', () => {
  const notebook = gerarParcelas({
    valorCentavos: 10000,
    totalParcelas: 3,
    dataPrimeiraParcela: '2026-12-20',
  }).map((parcela, indice) => ({
    id: indice + 1,
    descricao: 'Notebook',
    ...parcela,
    dataCompra: '2026-12-20',
  }));

  const faturas = agruparParcelasPorFatura({ parcelas: notebook, ...VISA });

  assert.equal(faturas.length, 3);
  assert.deepEqual(
    faturas.map((fatura) => fatura.mesReferencia),
    ['2027-01', '2027-02', '2027-03'],
  );
  assert.deepEqual(
    faturas.map((fatura) => fatura.totalCentavos),
    [3334, 3333, 3333],
  );
  assert.equal(faturas[2].itens[0].rotuloParcela, 'Notebook - 3/3');
  assert.equal(faturas[0].vencimento, '2027-01-05');
  assert.equal(faturas[2].fechamento, '2027-02-25');
});

test('parcelas de faturas diferentes sao agrupadas no mesmo mes', () => {
  const compra1 = { id: 1, descricao: 'Mercado', valorCentavos: 20000, data: '2026-11-02', parcelaAtual: 1, totalParcelas: 1 };
  const compra2 = { id: 2, descricao: 'Farmacia', valorCentavos: 5000, data: '2026-11-01', parcelaAtual: 1, totalParcelas: 1 };

  const faturas = agruparParcelasPorFatura({ parcelas: [compra1, compra2], ...NUBANK });

  assert.equal(faturas.length, 1);
  assert.equal(faturas[0].mesReferencia, '2026-11');
  assert.equal(faturas[0].totalCentavos, 25000);
  assert.equal(faturas[0].itens.length, 2);
});

test('limite utilizado soma apenas parcelas ainda nao vencidas', () => {
  const compras = [
    { id: 1, descricao: 'Antiga', valorCentavos: 10000, data: '2026-09-01', parcelaAtual: 1, totalParcelas: 1 },
    { id: 2, descricao: 'Atual', valorCentavos: 20000, data: '2026-11-02', parcelaAtual: 1, totalParcelas: 1 },
    { id: 3, descricao: 'Futura', valorCentavos: 30000, data: '2026-11-04', parcelaAtual: 1, totalParcelas: 1 },
  ];

  const utilizado = somarParcelasNaoVencidas({
    parcelas: compras,
    ...NUBANK,
    dataReferencia: '2026-11-05',
  });

  assert.equal(utilizado, 50000);
});

test('previsaoFaturas devolve a fatura atual, as proximas e o limite disponivel', () => {
  const parcelas = gerarParcelas({
    valorCentavos: 10000,
    totalParcelas: 3,
    dataPrimeiraParcela: '2026-12-20',
  }).map((parcela, indice) => ({
    id: indice + 1,
    descricao: 'Notebook',
    ...parcela,
    dataCompra: '2026-12-20',
  }));

  const previsao = previsaoFaturas({
    parcelas,
    ...VISA,
    limiteCentavos: 500000,
    dataReferencia: '2026-12-28',
    quantidadeFaturas: 3,
  });

  assert.equal(previsao.faturas.length, 3);
  assert.equal(previsao.faturas[0].mesReferencia, '2027-01');
  assert.equal(previsao.limiteCentavos, 500000);
  assert.equal(previsao.limiteUtilizadoCentavos, 10000);
  assert.equal(previsao.limiteDisponivelCentavos, 490000);
});

test('previsao de cartao sem compras nao quebra e nao consome limite', () => {
  const previsao = previsaoFaturas({
    parcelas: [],
    ...NUBANK,
    limiteCentavos: 100000,
    dataReferencia: '2026-11-05',
  });

  assert.deepEqual(previsao.faturas, []);
  assert.equal(previsao.limiteUtilizadoCentavos, 0);
  assert.equal(previsao.limiteDisponivelCentavos, 100000);
});

test('rejeita dias de fechamento, vencimento e parcela invalidos', () => {
  assert.throws(() => calcularFatura({ dataCompra: '2026-11-02', diaFechamento: 0, diaVencimento: 10 }), RangeError);
  assert.throws(() => calcularFatura({ dataCompra: '2026-11-02', diaFechamento: 3, diaVencimento: 40 }), RangeError);
  assert.throws(() => calcularFatura({ dataCompra: '2026-11-02', ...NUBANK, parcelaAtual: 0 }), RangeError);
});
