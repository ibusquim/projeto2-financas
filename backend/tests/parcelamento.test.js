import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARCELAS_MAXIMO,
  PARCELAS_MINIMO,
  dividirEmParcelas,
  divisaoExata,
  gerarParcelas,
  somarCentavos,
} from '../src/models/regras-parcelamento.js';

test('caso do enunciado: R$ 100,00 em 3x gera 33,34 + 33,33 + 33,33', () => {
  const parcelas = dividirEmParcelas(10000, 3);
  assert.deepEqual(parcelas, [3334, 3333, 3333]);
  assert.equal(somarCentavos(parcelas), 10000);
});

test('R$ 1,00 em 3x gera 34 + 33 + 33 centavos', () => {
  const parcelas = dividirEmParcelas(100, 3);
  assert.deepEqual(parcelas, [34, 33, 33]);
  assert.equal(somarCentavos(parcelas), 100);
});

test('divisao exata nao altera nenhuma parcela', () => {
  assert.deepEqual(dividirEmParcelas(900, 4), [225, 225, 225, 225]);
  assert.equal(divisaoExata(900, 4), true);
  assert.equal(divisaoExata(10000, 3), false);
});

test('parcela unica recebe o valor total', () => {
  assert.deepEqual(dividirEmParcelas(10000, PARCELAS_MINIMO), [10000]);
});

test('a soma e exatamente igual ao valor original em muitos cenarios', () => {
  for (let valor = 100; valor <= 2000; valor += 37) {
    for (let totalParcelas = 1; totalParcelas <= PARCELAS_MAXIMO; totalParcelas += 1) {
      if (valor < totalParcelas) continue;
      const parcelas = dividirEmParcelas(valor, totalParcelas);
      assert.equal(parcelas.length, totalParcelas, `quantidade de parcelas para ${valor}/${totalParcelas}`);
      assert.equal(somarCentavos(parcelas), valor, `soma para ${valor}/${totalParcelas}`);
      assert.ok(parcelas.every((parcela) => Number.isInteger(parcela) && parcela > 0), 'todas as parcelas sao inteiras e positivas');
      assert.ok(parcelas[0] >= parcelas[parcelas.length - 1], 'a primeira parcela concentra a diferenca');
    }
  }
});

test('rejeita valor zero, negativo ou fracionario', () => {
  assert.throws(() => dividirEmParcelas(0, 3), RangeError);
  assert.throws(() => dividirEmParcelas(-100, 3), RangeError);
  assert.throws(() => dividirEmParcelas(100.5, 3), RangeError);
});

test('rejeita quantidade de parcelas fora de 1 a 48', () => {
  assert.throws(() => dividirEmParcelas(10000, 0), RangeError);
  assert.throws(() => dividirEmParcelas(10000, 49), RangeError);
  assert.throws(() => dividirEmParcelas(10000, 2.5), RangeError);
});

test('rejeita parcelamento que geraria parcela de zero centavos', () => {
  assert.throws(() => dividirEmParcelas(3, 4), /insuficiente/);
});

test('gerarParcelas distribui valores e avanca as datas mes a mes', () => {
  const parcelas = gerarParcelas({
    valorCentavos: 10000,
    totalParcelas: 3,
    dataPrimeiraParcela: '2026-11-22',
  });

  assert.deepEqual(parcelas, [
    { parcelaAtual: 1, totalParcelas: 3, valorCentavos: 3334, data: '2026-11-22' },
    { parcelaAtual: 2, totalParcelas: 3, valorCentavos: 3333, data: '2026-12-22' },
    { parcelaAtual: 3, totalParcelas: 3, valorCentavos: 3333, data: '2027-01-22' },
  ]);
  assert.equal(somarCentavos(parcelas.map((parcela) => parcela.valorCentavos)), 10000);
});

test('gerarParcelas ajusta dia inexistente no mes de destino', () => {
  const parcelas = gerarParcelas({
    valorCentavos: 3000,
    totalParcelas: 3,
    dataPrimeiraParcela: '2026-01-31',
  });
  assert.deepEqual(
    parcelas.map((parcela) => parcela.data),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
});

test('somarCentavos rejeita valores nao inteiros', () => {
  assert.equal(somarCentavos([]), 0);
  assert.equal(somarCentavos([100, 250]), 350);
  assert.throws(() => somarCentavos([10.5]), TypeError);
});
