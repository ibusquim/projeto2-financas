import { useCallback, useEffect, useMemo, useState } from 'react'

import { CHAVE_TOKEN, registrarTratadorDeSessaoExpirada } from '../services/api.js'
import * as authService from '../services/authService.js'
import { AuthContext } from './authContexto.js'

function lerTokenInicial() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [token, setToken] = useState(lerTokenInicial)
  const [carregando, setCarregando] = useState(() => Boolean(lerTokenInicial()))

  const encerrarSessao = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_TOKEN)
    } catch {
      // Armazenamento indisponivel: a sessao apenas deixa de persistir.
    }
    setToken(null)
    setUsuario(null)
    setCarregando(false)
  }, [])

  useEffect(() => {
    registrarTratadorDeSessaoExpirada(encerrarSessao)
  }, [encerrarSessao])

  useEffect(() => {
    if (!token) return undefined

    let ativo = true

    authService
      .me()
      .then((dados) => {
        if (ativo) setUsuario(dados)
      })
      .catch(() => {
        if (ativo) encerrarSessao()
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [token, encerrarSessao])

  const salvarSessao = useCallback((dados) => {
    try {
      window.localStorage.setItem(CHAVE_TOKEN, dados.token)
    } catch {
      // Sem persistencia o usuario continua autenticado apenas nesta aba.
    }
    setToken(dados.token)
    setUsuario(dados.usuario)
  }, [])

  const login = useCallback(
    async (email, senha) => {
      const dados = await authService.login({ email, senha })
      salvarSessao(dados)
      return dados.usuario
    },
    [salvarSessao],
  )

  const cadastrar = useCallback(
    async (formulario) => {
      const dados = await authService.cadastrar(formulario)
      salvarSessao(dados)
      return dados.usuario
    },
    [salvarSessao],
  )

  const valor = useMemo(
    () => ({
      usuario,
      token,
      carregando,
      autenticado: Boolean(token && usuario),
      login,
      cadastrar,
      logout: encerrarSessao,
    }),
    [usuario, token, carregando, login, cadastrar, encerrarSessao],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
