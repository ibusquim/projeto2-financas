/**
 * Padrao unico de erro da API.
 *
 * A regra de ouro: nenhuma resposta de erro pode vazar detalhes internos (SQL,
 * stack trace, nome de tabela, segredo). Tudo que nao for um `ErroHttp`
 * conhecido vira `500` com mensagem generica, e o detalhe fica para o log do
 * servidor.
 */

export const MENSAGEM_ERRO_INTERNO = 'Erro interno do servidor.';

/** Erro de aplicacao com status HTTP e mensagens por campo. */
export class ErroHttp extends Error {
  /**
   * @param {number} status Codigo HTTP.
   * @param {string} mensagem Mensagem geral, segura para o cliente.
   * @param {object|null} [campos] Mensagens por campo do formulario.
   */
  constructor(status, mensagem, campos = null) {
    super(mensagem);
    this.name = 'ErroHttp';
    this.status = status;
    this.campos = campos;
  }
}

export function erroValidacao(campos, mensagem = 'Dados invalidos.') {
  return new ErroHttp(400, mensagem, campos);
}

export function erroAutenticacao(mensagem = 'Autenticacao necessaria.') {
  return new ErroHttp(401, mensagem);
}

export function erroNaoEncontrado(mensagem = 'Registro nao encontrado.') {
  return new ErroHttp(404, mensagem);
}

export function erroConflito(mensagem, campos = null) {
  return new ErroHttp(409, mensagem, campos);
}

export function erroMuitasTentativas(mensagem = 'Muitas tentativas. Tente novamente mais tarde.') {
  return new ErroHttp(429, mensagem);
}

/**
 * Converte qualquer erro em `{ status, corpo }` no formato do contrato.
 * Erros desconhecidos nunca revelam a mensagem original.
 */
export function corpoDeErro(erro) {
  if (erro instanceof ErroHttp) {
    const corpo = { erro: erro.message };
    if (erro.campos && Object.keys(erro.campos).length > 0) {
      corpo.campos = erro.campos;
    }
    return { status: erro.status, corpo };
  }

  return { status: 500, corpo: { erro: MENSAGEM_ERRO_INTERNO } };
}

/** Verdadeiro quando o erro ja e um erro de aplicacao tratado. */
export function erroTratado(erro) {
  return erro instanceof ErroHttp;
}
