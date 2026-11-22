const CHAVE_TOKEN = 'controle-financeiro.token'
const URL_BASE = (import.meta.env?.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '')
const LIMITE_ESPERA_MS = 15000

let tratarSessaoExpirada = null

/** Registra o callback global chamado quando uma requisicao autenticada recebe 401. */
export function registrarTratadorDeSessaoExpirada(tratador) {
  tratarSessaoExpirada = tratador
}

export { CHAVE_TOKEN }

/** Erro padronizado da API: sempre carrega status HTTP e campos por input. */
export class ApiError extends Error {
  constructor(mensagem, { status = 0, campos = null } = {}) {
    super(mensagem)
    this.name = 'ApiError'
    this.status = status
    this.campos = campos
  }
}

function lerToken() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

function montarQuery(params) {
  const busca = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return
    busca.set(chave, String(valor))
  })
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}

async function requisitar(caminho, { metodo = 'GET', corpo, autenticado = true } = {}) {
  const cabecalhos = { Accept: 'application/json' }

  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  const token = autenticado ? lerToken() : null
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  const controlador = new AbortController()
  const limite = setTimeout(() => controlador.abort(), LIMITE_ESPERA_MS)

  let resposta
  try {
    resposta = await fetch(`${URL_BASE}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controlador.signal,
    })
  } catch (erro) {
    throw new ApiError(
      erro?.name === 'AbortError'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Nao foi possivel conectar ao servidor. Verifique se a API esta em execucao.',
    )
  } finally {
    clearTimeout(limite)
  }

  if (resposta.status === 204) return null

  const texto = await resposta.text()
  let dados = null
  if (texto) {
    try {
      dados = JSON.parse(texto)
    } catch {
      dados = null
    }
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && autenticado) tratarSessaoExpirada?.()
    throw new ApiError(dados?.erro || 'Nao foi possivel concluir a solicitacao.', {
      status: resposta.status,
      campos: dados?.campos ?? null,
    })
  }

  return dados
}

export const api = {
  get: (caminho, params) => requisitar(`${caminho}${montarQuery(params)}`),
  post: (caminho, corpo) => requisitar(caminho, { metodo: 'POST', corpo }),
  put: (caminho, corpo) => requisitar(caminho, { metodo: 'PUT', corpo }),
  delete: (caminho) => requisitar(caminho, { metodo: 'DELETE' }),
  publico: {
    post: (caminho, corpo) => requisitar(caminho, { metodo: 'POST', corpo, autenticado: false }),
  },
}
