import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adicionarDiasDataIso,
  adicionarMeses,
  adicionarMesesDataIso,
  diasNoIntervalo,
  ehBissexto,
  formatarMesReferencia,
  montarDataIso,
  periodoAnterior,
  periodoDoMes,
  ultimoDiaDoMes,
} from '../src/models/regras-datas.js';

test('ultimo dia do mes respeita anos bissextos', () => {
  assert.equal(ultimoDiaDoMes(2026, 2), 28);
  assert.equal(ultimoDiaDoMes(2024, 2), 29);
  assert.equal(ultimoDiaDoMes(2026, 4), 30);
  assert.equal(ultimoDiaDoMes(2026, 1), 31);
  assert.equal(ehBissexto(2000), true);
  assert.equal(ehBissexto(1900), false);
});

test('montarDataIso ajusta dia inexistente para o ultimo dia do mes', () => {
  assert.equal(montarDataIso(2026, 2, 31), '2026-02-28');
  assert.equal(montarDataIso(2024, 2, 31), '2024-02-29');
  assert.equal(montarDataIso(2026, 4, 31), '2026-04-30');
  assert.equal(montarDataIso(2026, 11, 22), '2026-11-22');
});

test('adicionarMeses normaliza a virada de ano', () => {
  assert.deepEqual(adicionarMeses(2026, 11, 2), { ano: 2027, mes: 1 });
  assert.deepEqual(adicionarMeses(2026, 1, -1), { ano: 2025, mes: 12 });
  assert.deepEqual(adicionarMeses(2026, 12, 1), { ano: 2027, mes: 1 });
  assert.deepEqual(adicionarMeses(2026, 1, 12), { ano: 2027, mes: 1 });
  assert.deepEqual(adicionarMeses(2026, 1, -12), { ano: 2025, mes: 1 });
});

test('adicionarMesesDataIso preserva o dia quando possivel', () => {
  assert.equal(adicionarMesesDataIso('2026-11-22', 1), '2026-12-22');
  assert.equal(adicionarMesesDataIso('2026-11-22', 2), '2027-01-22');
  assert.equal(adicionarMesesDataIso('2026-01-31', 1), '2026-02-28');
  assert.equal(adicionarMesesDataIso('2026-03-31', -1), '2026-02-28');
});

test('adicionarDiasDataIso atravessa meses e anos', () => {
  assert.equal(adicionarDiasDataIso('2026-12-31', 1), '2027-01-01');
  assert.equal(adicionarDiasDataIso('2026-03-01', -1), '2026-02-28');
});

test('formatarMesReferencia usa o padrao AAAA-MM', () => {
  assert.equal(formatarMesReferencia(2026, 11), '2026-11');
  assert.equal(formatarMesReferencia(2027, 1), '2027-01');
});

test('diasNoIntervalo conta inicio e fim', () => {
  assert.equal(diasNoIntervalo('2026-11-01', '2026-11-30'), 30);
  assert.equal(diasNoIntervalo('2026-11-01', '2026-11-01'), 1);
  assert.equal(diasNoIntervalo('2026-02-01', '2026-02-28'), 28);
  assert.throws(() => diasNoIntervalo('2026-11-30', '2026-11-01'), RangeError);
});

test('periodoDoMes devolve o mes inteiro', () => {
  assert.deepEqual(periodoDoMes('2026-11'), { inicio: '2026-11-01', fim: '2026-11-30', rotulo: '2026-11' });
  assert.deepEqual(periodoDoMes('2024-02'), { inicio: '2024-02-01', fim: '2024-02-29', rotulo: '2024-02' });
  assert.throws(() => periodoDoMes('11/2026'), RangeError);
});

test('periodoAnterior tem o mesmo tamanho e termina antes do periodo', () => {
  assert.deepEqual(periodoAnterior('2026-11-01', '2026-11-30'), { inicio: '2026-10-02', fim: '2026-10-31' });
  assert.deepEqual(periodoAnterior('2026-03-01', '2026-03-31'), { inicio: '2026-01-29', fim: '2026-02-28' });
});
