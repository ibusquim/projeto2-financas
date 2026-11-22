import test from 'node:test';
import assert from 'node:assert/strict';

import {
  POR_PAGINA_MAXIMO,
  calcularPaginacao,
  normalizarConsulta,
  serializarLancamento,
  serializarUsuario,
} from '../src/models/regras-consulta.js';

const REFERENCIA = '2026-11-22';

test('sem filtros, usa o mes corrente como periodo padrao', () => {
  const { erros, valores } = normalizarConsulta({}, REFERENCIA);
  assert.equal(erros, null);
  assert.equal(valores.inicio, '2026-11-01');
  assert.equal(valores.fim, '2026-11-30');
  assert.equal(valores.pagina, 1);
  assert.equal(valores.porPagina, 20);
  assert.equal(valores.tipo, null);
  assert.equal(valores.categoriaId, null);
});

test('aceita filtros validos', () => {
  const { erros, valores } = normalizarConsulta(
    { inicio: '2026-01-01', fim: '2026-03-31', tipo: 'saida', categoriaId: '4', fonteDestinoId: '7', pagina: '2', porPagina: '50' },
    REFERENCIA,
  );

  assert.equal(erros, null);
  assert.deepEqual(valores, {
    inicio: '2026-01-01',
    fim: '2026-03-31',
    tipo: 'saida',
    categoriaId: 4,
    fonteDestinoId: 7,
    pagina: 2,
    porPagina: 50,
  });
});

test('rejeita periodo invertido', () => {
  const { erros } = normalizarConsulta({ inicio: '2026-11-30', fim: '2026-11-01' }, REFERENCIA);
  assert.equal(erros.fim, 'A data final deve ser igual ou posterior a data inicial.');
});

test('rejeita datas invalidas e tipo fora do enum', () => {
  const { erros } = normalizarConsulta({ inicio: '2026-02-30', tipo: 'transferencia' }, REFERENCIA);
  assert.equal(erros.inicio, 'Data invalida.');
  assert.ok(erros.tipo);
});

test('rejeita identificadores, pagina e porPagina invalidos', () => {
  const { erros } = normalizarConsulta({ categoriaId: 'abc', fonteDestinoId: '-3', pagina: '0' }, REFERENCIA);
  assert.ok(erros.categoriaId);
  assert.ok(erros.fonteDestinoId);
  assert.equal(erros.pagina, 'O campo pagina deve ser maior ou igual a 1.');

  const { erros: errosPorPagina } = normalizarConsulta({ porPagina: String(POR_PAGINA_MAXIMO + 1) }, REFERENCIA);
  assert.ok(errosPorPagina.porPagina);
});

test('paginacao calcula total de paginas e offset', () => {
  assert.deepEqual(calcularPaginacao({ totalItens: 37, pagina: 1, porPagina: 20 }), {
    pagina: 1,
    porPagina: 20,
    totalItens: 37,
    totalPaginas: 2,
    offset: 0,
  });

  assert.equal(calcularPaginacao({ totalItens: 37, pagina: 2, porPagina: 20 }).offset, 20);
});

test('paginacao limita a pagina ao intervalo existente', () => {
  const resultado = calcularPaginacao({ totalItens: 37, pagina: 99, porPagina: 20 });
  assert.equal(resultado.pagina, 2);
  assert.equal(resultado.offset, 20);
});

test('paginacao de lista vazia devolve uma pagina', () => {
  const resultado = calcularPaginacao({ totalItens: 0, pagina: 1, porPagina: 20 });
  assert.equal(resultado.totalPaginas, 1);
  assert.equal(resultado.offset, 0);
});

test('paginacao rejeita parametros invalidos', () => {
  assert.throws(() => calcularPaginacao({ totalItens: -1, pagina: 1, porPagina: 20 }), RangeError);
  assert.throws(() => calcularPaginacao({ totalItens: 1, pagina: 0, porPagina: 20 }), RangeError);
  assert.throws(() => calcularPaginacao({ totalItens: 1, pagina: 1, porPagina: 0 }), RangeError);
});

test('serializarLancamento devolve valor em string e em centavos', () => {
  const serializado = serializarLancamento({
    id: 12,
    tipo: 'saida',
    descricao: 'Notebook',
    valor_centavos: 3334,
    data: '2026-11-22',
    categoria_id: 4,
    fonte_destino_id: 3,
    parcela_atual: 1,
    total_parcelas: 3,
    grupo_parcelamento: 'abc-123',
  });

  assert.equal(serializado.valor, '33.34');
  assert.equal(serializado.valorCentavos, 3334);
  assert.equal(serializado.categoriaId, 4);
  assert.equal(serializado.fonteDestinoId, 3);
  assert.equal(serializado.totalParcelas, 3);
  assert.equal(serializado.grupoParcelamento, 'abc-123');
});

test('serializarLancamento rejeita valor nao inteiro', () => {
  assert.throws(() => serializarLancamento({ id: 1, valorCentavos: 10.5 }), TypeError);
});

test('serializarUsuario nunca devolve senha_hash', () => {
  const usuario = { id: 1, nome: 'Igor', email: 'igor@exemplo.com', senha_hash: '$2a$hash', senhaHash: '$2a$hash' };
  const serializado = serializarUsuario(usuario);

  assert.equal('senha_hash' in serializado, false);
  assert.equal('senhaHash' in serializado, false);
  assert.equal(serializado.email, 'igor@exemplo.com');
});
