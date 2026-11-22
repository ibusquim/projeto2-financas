/**
 * Validadores e normalizadores puros do dominio.
 *
 * Nao acessam banco, nao dependem de bibliotecas externas e nao conhecem HTTP.
 * Sao usados pelos middlewares de validacao e pelos models.
 *
 * Convencao: cada funcao `validarX` retorna `null` quando o valor e valido ou
 * uma mensagem de erro em portugues quando e invalido. Isso permite montar o
 * objeto `campos` do padrao de erro da API sem excecoes de controle de fluxo.
 */

/** Remove tudo que nao for digito. */
export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Normaliza e-mail conforme o contrato: trim + lowercase. */
export function normalizarEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/** Normaliza CPF: somente digitos. */
export function normalizarCpf(cpf) {
  return somenteDigitos(cpf);
}

export function validarNome(nome) {
  const valor = String(nome ?? '').trim();
  if (!valor) return 'O nome e obrigatorio.';
  if (valor.length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
  if (valor.length > 120) return 'O nome deve ter no maximo 120 caracteres.';
  return null;
}

export function validarEmail(email) {
  const valor = normalizarEmail(email);
  if (!valor) return 'O e-mail e obrigatorio.';
  if (valor.length > 254) return 'O e-mail deve ter no maximo 254 caracteres.';
  const formatoValido = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor);
  if (!formatoValido) return 'Informe um e-mail valido.';
  return null;
}

/**
 * Valida CPF com os digitos verificadores.
 * Rejeita tamanho diferente de 11 e sequencias repetidas (00000000000, 111...).
 */
export function validarCpf(cpf) {
  const digitos = normalizarCpf(cpf);
  if (!digitos) return 'O CPF e obrigatorio.';
  if (digitos.length !== 11) return 'O CPF deve conter 11 digitos.';
  if (/^(\d)\1{10}$/.test(digitos)) return 'CPF invalido.';

  const numeros = digitos.split('').map(Number);

  const calcularDigito = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i += 1) {
      soma += numeros[i] * (quantidade + 1 - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(9);
  const segundoDigito = calcularDigito(10);

  if (primeiroDigito !== numeros[9] || segundoDigito !== numeros[10]) {
    return 'CPF invalido.';
  }
  return null;
}

/** Senha: minimo 8 caracteres, com pelo menos uma letra e um numero. */
export function validarSenha(senha) {
  const valor = String(senha ?? '');
  if (!valor) return 'A senha e obrigatoria.';
  if (valor.length < 8) return 'A senha deve ter no minimo 8 caracteres.';
  if (!/[A-Za-z]/.test(valor)) return 'A senha deve conter pelo menos uma letra.';
  if (!/\d/.test(valor)) return 'A senha deve conter pelo menos um numero.';
  if (valor.length > 72) return 'A senha deve ter no maximo 72 caracteres.';
  return null;
}

export function validarConfirmacaoSenha(senha, confirmacaoSenha) {
  if (String(senha ?? '') !== String(confirmacaoSenha ?? '')) {
    return 'A confirmacao de senha nao confere.';
  }
  return null;
}

/**
 * Converte valor monetario em reais para centavos inteiros, sem aritmetica de
 * ponto flutuante. Aceita number (100.5) ou string ("100.50", "1.234,56").
 * Retorna null quando o valor nao puder ser interpretado.
 */
export function valorParaCentavos(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    if (!Number.isInteger(valor * 100) && Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-9) {
      return null;
    }
    return Math.round(valor * 100);
  }

  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  let normalizado = texto.replace(/\s/g, '');
  if (normalizado.includes(',')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;

  const [parteInteira, parteDecimal = ''] = normalizado.split('.');
  const centavosDecimais = Number(`${parteDecimal}00`.slice(0, 2));
  return Number(parteInteira) * 100 + centavosDecimais;
}

/** Formata centavos inteiros como string decimal com duas casas ("33.34"). */
export function centavosParaReais(centavos) {
  if (!Number.isInteger(centavos)) {
    throw new TypeError('centavosParaReais espera um inteiro de centavos.');
  }
  const negativo = centavos < 0;
  const absoluto = Math.abs(centavos);
  const reais = Math.floor(absoluto / 100);
  const resto = String(absoluto % 100).padStart(2, '0');
  return `${negativo ? '-' : ''}${reais}.${resto}`;
}

/** Valor monetario deve ser maior que zero. */
export function validarValorPositivo(valor) {
  const centavos = valorParaCentavos(valor);
  if (centavos === null) return 'Informe um valor valido com no maximo duas casas decimais.';
  if (centavos <= 0) return 'O valor deve ser maior que zero.';
  return null;
}

export function validarTipoLancamento(tipo) {
  if (tipo === 'entrada' || tipo === 'saida') return null;
  return 'O tipo deve ser "entrada" ou "saida".';
}

export function validarTipoFonteDestino(tipo) {
  if (tipo === 'renda' || tipo === 'conta' || tipo === 'cartao_credito') return null;
  return 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
}

export function validarDescricao(descricao) {
  const valor = String(descricao ?? '').trim();
  if (!valor) return 'A descricao e obrigatoria.';
  if (valor.length > 200) return 'A descricao deve ter no maximo 200 caracteres.';
  return null;
}

export function validarNomeCurto(nome, rotulo = 'nome') {
  const valor = String(nome ?? '').trim();
  if (!valor) return `O ${rotulo} e obrigatorio.`;
  if (valor.length > 60) return `O ${rotulo} deve ter no maximo 60 caracteres.`;
  return null;
}

/** Data no formato AAAA-MM-DD que realmente existe no calendario. */
export function validarDataIso(data) {
  const texto = String(data ?? '').trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return 'Informe uma data no formato AAAA-MM-DD.';

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);

  if (mes < 1 || mes > 12) return 'Mes invalido.';
  if (dia < 1 || dia > 31) return 'Dia invalido.';

  const referencia = new Date(Date.UTC(ano, mes - 1, dia));
  const dataValida =
    referencia.getUTCFullYear() === ano &&
    referencia.getUTCMonth() === mes - 1 &&
    referencia.getUTCDate() === dia;

  return dataValida ? null : 'Data invalida.';
}

/** Dia do mes entre 1 e 31, usado no fechamento e no vencimento do cartao. */
export function validarDiaMes(dia, rotulo = 'dia') {
  if (!Number.isInteger(dia)) return `O ${rotulo} deve ser um numero inteiro.`;
  if (dia < 1 || dia > 31) return `O ${rotulo} deve estar entre 1 e 31.`;
  return null;
}

/** Quantidade de parcelas entre 1 e 48. */
export function validarQuantidadeParcelas(parcelas) {
  if (parcelas === undefined || parcelas === null) return null;
  if (!Number.isInteger(parcelas)) return 'A quantidade de parcelas deve ser um numero inteiro.';
  if (parcelas < 1 || parcelas > 48) return 'A quantidade de parcelas deve estar entre 1 e 48.';
  return null;
}

/**
 * Valida o conjunto de dados de uma fonte/destino.
 * Campos de cartao sao obrigatorios apenas quando o tipo e `cartao_credito`.
 */
export function validarFonteDestino({ nome, tipo, diaFechamento, diaVencimento, limite } = {}) {
  const campos = {};

  const erroNome = validarNomeCurto(nome, 'nome');
  if (erroNome) campos.nome = erroNome;

  const erroTipo = validarTipoFonteDestino(tipo);
  if (erroTipo) campos.tipo = erroTipo;

  const limiteInformado = limite !== undefined && limite !== null && String(limite).trim() !== '';

  if (tipo === 'cartao_credito') {
    const erroFechamento = validarDiaMes(diaFechamento, 'dia de fechamento');
    if (erroFechamento) campos.diaFechamento = erroFechamento;

    const erroVencimento = validarDiaMes(diaVencimento, 'dia de vencimento');
    if (erroVencimento) campos.diaVencimento = erroVencimento;

    if (!limiteInformado) {
      campos.limite = 'O limite e obrigatorio para cartao de credito.';
    } else {
      const erroLimite = validarValorPositivo(limite);
      if (erroLimite) campos.limite = erroLimite;
    }
  } else if (limiteInformado) {
    const erroLimite = validarValorPositivo(limite);
    if (erroLimite) campos.limite = erroLimite;
  }

  return Object.keys(campos).length > 0 ? campos : null;
}

/** Compara duas datas ISO; retorna numero negativo, zero ou positivo. */
export function compararDatasIso(a, b) {
  return String(a).localeCompare(String(b));
}
