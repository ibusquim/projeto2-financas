import test from 'node:test';
import assert from 'node:assert/strict';

import {
  centavosParaReais,
  normalizarCpf,
  normalizarEmail,
  validarConfirmacaoSenha,
  validarCpf,
  validarDataIso,
  validarDescricao,
  validarDiaMes,
  validarEmail,
  validarFonteDestino,
  validarNome,
  validarQuantidadeParcelas,
  validarSenha,
  validarTipoFonteDestino,
  validarTipoLancamento,
  validarValorPositivo,
  valorParaCentavos,
} from '../src/middlewares/validadores.js';

test('CPF: aceita CPF valido com e sem pontuacao', () => {
  assert.equal(validarCpf('52998224725'), null);
  assert.equal(validarCpf('529.982.247-25'), null);
  assert.equal(validarCpf('111.444.777-35'), null);
});

test('CPF: normaliza para somente digitos', () => {
  assert.equal(normalizarCpf('529.982.247-25'), '52998224725');
  assert.equal(normalizarCpf('  529 982 247 25 '), '52998224725');
});

test('CPF: rejeita invalidos, sequencias repetidas e tamanho errado', () => {
  assert.equal(validarCpf('11111111111'), 'CPF invalido.');
  assert.equal(validarCpf('00000000000'), 'CPF invalido.');
  assert.equal(validarCpf('12345678900'), 'CPF invalido.');
  assert.equal(validarCpf('5299822472'), 'O CPF deve conter 11 digitos.');
  assert.equal(validarCpf(''), 'O CPF e obrigatorio.');
});

test('e-mail: normaliza com trim e lowercase', () => {
  assert.equal(normalizarEmail('  Igor@Exemplo.COM  '), 'igor@exemplo.com');
});

test('e-mail: valida formato', () => {
  assert.equal(validarEmail('igor@exemplo.com'), null);
  assert.equal(validarEmail('igor@exemplo'), 'Informe um e-mail valido.');
  assert.equal(validarEmail('igor exemplo.com'), 'Informe um e-mail valido.');
  assert.equal(validarEmail(''), 'O e-mail e obrigatorio.');
});

test('nome: exige presenca e limites', () => {
  assert.equal(validarNome('Igor Busquim'), null);
  assert.equal(validarNome(''), 'O nome e obrigatorio.');
  assert.equal(validarNome('Io'), 'O nome deve ter pelo menos 3 caracteres.');
  assert.equal(validarNome('a'.repeat(121)), 'O nome deve ter no maximo 120 caracteres.');
});

test('senha: exige 8 caracteres, letra e numero', () => {
  assert.equal(validarSenha('senha1234'), null);
  assert.equal(validarSenha('senha'), 'A senha deve ter no minimo 8 caracteres.');
  assert.equal(validarSenha('senhaforte'), 'A senha deve conter pelo menos um numero.');
  assert.equal(validarSenha('12345678'), 'A senha deve conter pelo menos uma letra.');
  assert.equal(validarConfirmacaoSenha('senha1234', 'senha1234'), null);
  assert.equal(validarConfirmacaoSenha('senha1234', 'senha1235'), 'A confirmacao de senha nao confere.');
});

test('valor: converte para centavos sem ponto flutuante', () => {
  assert.equal(valorParaCentavos('100.00'), 10000);
  assert.equal(valorParaCentavos(100.5), 10050);
  assert.equal(valorParaCentavos('1.234,56'), 123456);
  assert.equal(valorParaCentavos('10'), 1000);
  assert.equal(valorParaCentavos('0,05'), 5);
  assert.equal(valorParaCentavos('10.999'), null);
  assert.equal(valorParaCentavos('abc'), null);
  assert.equal(valorParaCentavos(''), null);
  assert.equal(valorParaCentavos('-10.00'), null);
});

test('valor: formata centavos como string decimal', () => {
  assert.equal(centavosParaReais(3334), '33.34');
  assert.equal(centavosParaReais(100), '1.00');
  assert.equal(centavosParaReais(5), '0.05');
  assert.equal(centavosParaReais(0), '0.00');
  assert.equal(centavosParaReais(-150), '-1.50');
  assert.throws(() => centavosParaReais(1.5), TypeError);
});

test('valor: exige maior que zero', () => {
  assert.equal(validarValorPositivo('100.00'), null);
  assert.equal(validarValorPositivo(0), 'O valor deve ser maior que zero.');
  assert.equal(validarValorPositivo('-5.00'), 'Informe um valor valido com no maximo duas casas decimais.');
});

test('data: valida formato e existencia no calendario', () => {
  assert.equal(validarDataIso('2026-11-22'), null);
  assert.equal(validarDataIso('2024-02-29'), null);
  assert.equal(validarDataIso('2026-02-29'), 'Data invalida.');
  assert.equal(validarDataIso('2026-02-30'), 'Data invalida.');
  assert.equal(validarDataIso('22/11/2026'), 'Informe uma data no formato AAAA-MM-DD.');
  assert.equal(validarDataIso('2026-13-01'), 'Mes invalido.');
});

test('dia do mes: aceita 1 a 31 e rejeita o resto', () => {
  assert.equal(validarDiaMes(1, 'dia de fechamento'), null);
  assert.equal(validarDiaMes(31, 'dia de vencimento'), null);
  assert.equal(validarDiaMes(0), 'O dia deve estar entre 1 e 31.');
  assert.equal(validarDiaMes(32), 'O dia deve estar entre 1 e 31.');
  assert.equal(validarDiaMes(3.5), 'O dia deve ser um numero inteiro.');
});

test('parcelas: aceita 1 a 48 e rejeita o resto', () => {
  assert.equal(validarQuantidadeParcelas(1), null);
  assert.equal(validarQuantidadeParcelas(48), null);
  assert.equal(validarQuantidadeParcelas(undefined), null);
  assert.equal(validarQuantidadeParcelas(0), 'A quantidade de parcelas deve estar entre 1 e 48.');
  assert.equal(validarQuantidadeParcelas(49), 'A quantidade de parcelas deve estar entre 1 e 48.');
  assert.equal(validarQuantidadeParcelas(2.5), 'A quantidade de parcelas deve ser um numero inteiro.');
});

test('tipos: aceita apenas o que o contrato define', () => {
  assert.equal(validarTipoLancamento('entrada'), null);
  assert.equal(validarTipoLancamento('saida'), null);
  assert.equal(validarTipoLancamento('transferencia'), 'O tipo deve ser "entrada" ou "saida".');
  assert.equal(validarTipoFonteDestino('cartao_credito'), null);
  assert.equal(validarTipoFonteDestino('poupanca'), 'O tipo deve ser "renda", "conta" ou "cartao_credito".');
});

test('descricao: obrigatoria e limitada a 200 caracteres', () => {
  assert.equal(validarDescricao('Supermercado'), null);
  assert.equal(validarDescricao('   '), 'A descricao e obrigatoria.');
  assert.equal(validarDescricao('a'.repeat(201)), 'A descricao deve ter no maximo 200 caracteres.');
});

test('fonte/destino: cartao exige fechamento, vencimento e limite', () => {
  const erros = validarFonteDestino({ nome: 'Nubank', tipo: 'cartao_credito' });
  assert.ok(erros);
  assert.ok(erros.diaFechamento);
  assert.ok(erros.diaVencimento);
  assert.equal(erros.limite, 'O limite e obrigatorio para cartao de credito.');
});

test('fonte/destino: cartao valido passa', () => {
  const erros = validarFonteDestino({
    nome: 'Nubank',
    tipo: 'cartao_credito',
    diaFechamento: 3,
    diaVencimento: 10,
    limite: '5000.00',
  });
  assert.equal(erros, null);
});

test('fonte/destino: conta comum nao exige campos de cartao', () => {
  assert.equal(validarFonteDestino({ nome: 'Conta corrente', tipo: 'conta' }), null);
});

test('fonte/destino: rejeita tipo invalido e dias fora da faixa', () => {
  const erros = validarFonteDestino({
    nome: 'Cartao',
    tipo: 'cartao_credito',
    diaFechamento: 32,
    diaVencimento: 0,
    limite: '0',
  });
  assert.ok(erros);
  assert.ok(erros.diaFechamento);
  assert.ok(erros.diaVencimento);
  assert.equal(erros.limite, 'O valor deve ser maior que zero.');
});
