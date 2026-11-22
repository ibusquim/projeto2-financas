/**
 * Leitura e validacao das variaveis de ambiente.
 *
 * Nao depende de `dotenv`: a biblioteca sera plugada aqui depois da aprovacao
 * do professor, sem alterar as funcoes abaixo. Enquanto isso, o modulo recebe o
 * objeto de ambiente como parametro, o que o torna testavel sem processo real.
 */

export const JWT_SEGREDO_MINIMO = 32;

/**
 * Valida as variaveis obrigatorias.
 * @returns {object|null} Mapa de erros por variavel, ou null quando esta tudo certo.
 */
export function validarAmbiente(env = process.env) {
  const erros = {};

  if (!env.JWT_SECRET) {
    erros.JWT_SECRET = 'JWT_SECRET e obrigatorio.';
  } else if (env.JWT_SECRET.length < JWT_SEGREDO_MINIMO) {
    erros.JWT_SECRET = `JWT_SECRET deve ter pelo menos ${JWT_SEGREDO_MINIMO} caracteres.`;
  }

  if (!env.DB_HOST) erros.DB_HOST = 'DB_HOST e obrigatorio.';
  if (!env.DB_NAME) erros.DB_NAME = 'DB_NAME e obrigatorio.';
  if (!env.DB_USER) erros.DB_USER = 'DB_USER e obrigatorio.';
  if (!env.DB_PASSWORD) erros.DB_PASSWORD = 'DB_PASSWORD e obrigatorio.';

  validarInteiro(env, 'PORT', erros, { padrao: 3000, minimo: 1, maximo: 65535 });
  validarInteiro(env, 'DB_PORT', erros, { padrao: 5432, minimo: 1, maximo: 65535 });
  validarInteiro(env, 'LOGIN_MAX_TENTATIVAS', erros, { padrao: 10, minimo: 1 });
  validarInteiro(env, 'LOGIN_JANELA_MINUTOS', erros, { padrao: 15, minimo: 1 });

  return Object.keys(erros).length > 0 ? erros : null;
}

function validarInteiro(env, nome, erros, { minimo, maximo }) {
  const bruto = env[nome];
  if (bruto === undefined || bruto === null || bruto === '') return;

  const numero = Number(bruto);
  if (!Number.isInteger(numero)) {
    erros[nome] = `${nome} deve ser um numero inteiro.`;
    return;
  }
  if (minimo !== undefined && numero < minimo) {
    erros[nome] = `${nome} deve ser maior ou igual a ${minimo}.`;
    return;
  }
  if (maximo !== undefined && numero > maximo) {
    erros[nome] = `${nome} deve ser menor ou igual a ${maximo}.`;
  }
}

function inteiroOuPadrao(valor, padrao) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  return Number(valor);
}

/**
 * Devolve a configuracao tipada da aplicacao.
 * Lanca erro quando alguma variavel obrigatoria esta invalida, para o servidor
 * nao subir com configuracao incompleta.
 */
export function carregarAmbiente(env = process.env) {
  const erros = validarAmbiente(env);
  if (erros) {
    const nomes = Object.keys(erros).join(', ');
    const erro = new Error(`Configuracao de ambiente invalida: ${nomes}`);
    erro.campos = erros;
    throw erro;
  }

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    porta: inteiroOuPadrao(env.PORT, 3000),
    corsOrigem: env.CORS_ORIGIN ?? 'http://localhost:5173',
    banco: {
      host: env.DB_HOST,
      porta: inteiroOuPadrao(env.DB_PORT, 5432),
      nome: env.DB_NAME,
      usuario: env.DB_USER,
      senha: env.DB_PASSWORD,
    },
    jwt: {
      segredo: env.JWT_SECRET,
      expiracao: env.JWT_EXPIRACAO ?? '2h',
    },
    login: {
      maxTentativas: inteiroOuPadrao(env.LOGIN_MAX_TENTATIVAS, 10),
      janelaMinutos: inteiroOuPadrao(env.LOGIN_JANELA_MINUTOS, 15),
    },
  };
}
