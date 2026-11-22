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

/**
 * Traduz violacoes de integridade do PostgreSQL em erros do contrato.
 * O nome da constraint identifica qual campo causou o conflito, permitindo que
 * o front-end exiba a mensagem no input correto.
 */
export function traduzirErroBanco(erro) {
  if (erroTratado(erro)) return erro;

  // Erros do parser de JSON do Express: nunca podem virar 500.
  if (erro?.type === 'entity.parse.failed') {
    return erroValidacao({}, 'Corpo da requisicao invalido: JSON malformado.');
  }
  if (erro?.type === 'entity.too.large') {
    return new ErroHttp(413, 'Corpo da requisicao muito grande.');
  }

  const MENSAGENS_POR_CONSTRAINT = {
    usuarios_email_unico: { campo: 'email', mensagem: 'Este e-mail ja esta cadastrado.' },
    usuarios_cpf_unico: { campo: 'cpf', mensagem: 'Este CPF ja esta cadastrado.' },
    categorias_nome_unico: { campo: 'nome', mensagem: 'Ja existe uma categoria com este nome para este tipo.' },
    fontes_nome_unico: { campo: 'nome', mensagem: 'Ja existe uma fonte/destino com este nome.' },
  };

  if (erro?.code === '23505') {
    const alvo = MENSAGENS_POR_CONSTRAINT[erro.constraint];
    if (alvo) return erroConflito('Dados invalidos.', { [alvo.campo]: alvo.mensagem });
    return erroConflito('Registro duplicado.');
  }

  if (erro?.code === '23503') {
    return erroConflito('Nao e possivel concluir: existem registros associados a este item.');
  }

  if (erro?.code === '23514') {
    return erroValidacao({}, 'Os dados violam uma regra de integridade.');
  }

  if (erro?.code === '22P02') {
    return erroValidacao({}, 'Identificador ou valor em formato invalido.');
  }

  return erro;
}

/**
 * Middleware central de erros do Express.
 * Erro inesperado vira 500 generico; o detalhe fica apenas no log do servidor.
 */
export function middlewareDeErro(erro, req, res, proximo) {
  const tratado = traduzirErroBanco(erro);
  const { status, corpo } = corpoDeErro(tratado);

  if (status >= 500) {
    console.error(`[erro] ${req.method} ${req.originalUrl} -> ${erro?.message ?? erro}`);
  }

  if (res.headersSent) return proximo(erro);
  return res.status(status).json(corpo);
}

/** Responde 404 para rotas inexistentes, no padrao unico de erro. */
export function rotaNaoEncontrada(req, res) {
  return res.status(404).json({ erro: 'Rota nao encontrada.' });
}
