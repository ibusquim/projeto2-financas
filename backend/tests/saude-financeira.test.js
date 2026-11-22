import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AVISO_EDUCATIVO,
  calcularComprometimentoCartoes,
  calcularTaxaPoupanca,
  compararCategoriasComMedia,
  gerarDicas,
  projetarSaldos,
} from '../src/models/regras-saude-financeira.js';

test('taxa de poupanca classifica os quatro cenarios', () => {
  assert.deepEqual(calcularTaxaPoupanca({ entradasCentavos: 100000, saidasCentavos: 40000 }), {
    percentual: 60,
    classificacao: 'otima',
  });
  assert.deepEqual(calcularTaxaPoupanca({ entradasCentavos: 100000, saidasCentavos: 88000 }), {
    percentual: 12,
    classificacao: 'boa',
  });
  assert.deepEqual(calcularTaxaPoupanca({ entradasCentavos: 100000, saidasCentavos: 95000 }), {
    percentual: 5,
    classificacao: 'baixa',
  });
  assert.deepEqual(calcularTaxaPoupanca({ entradasCentavos: 100000, saidasCentavos: 120000 }), {
    percentual: -20,
    classificacao: 'critica',
  });
});

test('taxa de poupanca sem entradas nao divide por zero', () => {
  assert.deepEqual(calcularTaxaPoupanca({ entradasCentavos: 0, saidasCentavos: 5000 }), {
    percentual: null,
    classificacao: 'sem-dados',
  });
});

test('comprometimento com cartoes classifica pela faixa', () => {
  assert.deepEqual(calcularComprometimentoCartoes({ faturasFuturasCentavos: 100000, rendaMediaCentavos: 450000 }), {
    percentual: 22.22,
    classificacao: 'saudavel',
  });
  assert.deepEqual(calcularComprometimentoCartoes({ faturasFuturasCentavos: 400000, rendaMediaCentavos: 1000000 }), {
    percentual: 40,
    classificacao: 'atencao',
  });
  assert.deepEqual(calcularComprometimentoCartoes({ faturasFuturasCentavos: 600000, rendaMediaCentavos: 1000000 }), {
    percentual: 60,
    classificacao: 'critico',
  });
  assert.deepEqual(calcularComprometimentoCartoes({ faturasFuturasCentavos: 6000, rendaMediaCentavos: 0 }), {
    percentual: null,
    classificacao: 'sem-dados',
  });
});

test('projecao usa a media do historico e acumula o saldo', () => {
  const resultado = projetarSaldos({
    historico: [
      { mesReferencia: '2026-09', entradasCentavos: 450000, saidasCentavos: 150000 },
      { mesReferencia: '2026-10', entradasCentavos: 450000, saidasCentavos: 170000 },
      { mesReferencia: '2026-11', entradasCentavos: 450000, saidasCentavos: 160000 },
    ],
    parcelasPorMes: [{ mesReferencia: '2026-12', totalCentavos: 100000 }],
    meses: 3,
  });

  assert.equal(resultado.entradasMediasCentavos, 450000);
  assert.equal(resultado.saidasMediasCentavos, 160000);
  assert.equal(resultado.projecao.length, 3);
  assert.equal(resultado.projecao[0].mesReferencia, '2026-12');
  assert.equal(resultado.projecao[0].parcelasCentavos, 100000);
  // Mes 1 tem parcela: 450000 - (160000 + 100000) = 190000.
  assert.equal(resultado.projecao[0].saldoProjetadoCentavos, 190000);
  // Mes 2 sem parcela: 190000 + (450000 - 160000) = 480000.
  assert.equal(resultado.projecao[1].saldoProjetadoCentavos, 480000);
  // Mes 3 sem parcela: 480000 + 290000 = 770000.
  assert.equal(resultado.projecao[2].saldoProjetadoCentavos, 770000);
});

test('projecao sem historico devolve lista vazia', () => {
  assert.deepEqual(projetarSaldos({ historico: [] }), {
    entradasMediasCentavos: 0,
    saidasMediasCentavos: 0,
    projecao: [],
  });
});

test('projecao rejeita quantidade de meses fora da faixa', () => {
  const historico = [{ mesReferencia: '2026-11', entradasCentavos: 1000, saidasCentavos: 500 }];
  assert.throws(() => projetarSaldos({ historico, meses: 0 }), RangeError);
  assert.throws(() => projetarSaldos({ historico, meses: 25 }), RangeError);
});

test('categoria acima da media e sinalizada e ordenada primeiro', () => {
  const resultado = compararCategoriasComMedia({
    atual: [
      { categoriaId: 1, nome: 'Lazer', totalCentavos: 100000 },
      { categoriaId: 2, nome: 'Alimentacao', totalCentavos: 50000 },
      { categoriaId: 3, nome: 'Saude', totalCentavos: 30000 },
    ],
    historicoPorMes: [
      [
        { categoriaId: 1, totalCentavos: 40000 },
        { categoriaId: 2, totalCentavos: 50000 },
      ],
      [
        { categoriaId: 1, totalCentavos: 60000 },
        { categoriaId: 2, totalCentavos: 50000 },
      ],
    ],
  });

  const lazer = resultado.find((item) => item.categoriaId === 1);
  assert.equal(lazer.mediaCentavos, 50000);
  assert.equal(lazer.variacaoPercentual, 100);
  assert.equal(lazer.acimaDaMedia, true);
  assert.equal(resultado[0].categoriaId, 1, 'categoria fora da curva vem primeiro');

  const alimentacao = resultado.find((item) => item.categoriaId === 2);
  assert.equal(alimentacao.variacaoPercentual, 0);
  assert.equal(alimentacao.acimaDaMedia, false);

  const saude = resultado.find((item) => item.categoriaId === 3);
  assert.equal(saude.mediaCentavos, 0);
  assert.equal(saude.variacaoPercentual, null);
  assert.equal(saude.acimaDaMedia, true, 'gasto novo conta como fora da curva');
});

test('dicas sao geradas a partir dos numeros', () => {
  const dicas = gerarDicas({
    taxaPoupanca: { percentual: 4, classificacao: 'baixa' },
    comprometimentoCartoes: { percentual: 62, classificacao: 'critico' },
    parcelasFuturasCentavos: 150000,
    categoriasForaDaCurva: [{ nome: 'Lazer', variacaoPercentual: 100 }],
    projecao: [{ mesReferencia: '2027-02', saldoProjetadoCentavos: -5000 }],
  });

  assert.ok(dicas.some((dica) => dica.includes('taxa de poupanca')));
  assert.ok(dicas.some((dica) => dica.includes('comprometem')));
  assert.ok(dicas.some((dica) => dica.includes('Lazer')));
  assert.ok(dicas.some((dica) => dica.includes('2027-02')));
});

test('dicas sem dados orientam o usuario', () => {
  const dicas = gerarDicas({
    taxaPoupanca: { percentual: null, classificacao: 'sem-dados' },
    comprometimentoCartoes: { percentual: null, classificacao: 'sem-dados' },
    parcelasFuturasCentavos: 0,
    categoriasForaDaCurva: [],
    projecao: [],
  });

  assert.equal(dicas.length, 1);
  assert.ok(dicas[0].includes('Registre entradas'));
});

test('aviso educativo esta definido e e explicito', () => {
  assert.ok(AVISO_EDUCATIVO.includes('educativas'));
  assert.ok(AVISO_EDUCATIVO.includes('nao constituem recomendacao financeira profissional'));
});
