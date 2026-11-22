import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth.js'
import { ApiError } from '../../services/api.js'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function FormularioLogin() {
  const { login } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento) {
    evento.preventDefault()

    const novosErros = {}
    const emailLimpo = email.trim()
    if (!emailLimpo) novosErros.email = 'Informe o e-mail.'
    else if (!EMAIL_VALIDO.test(emailLimpo)) novosErros.email = 'Informe um e-mail valido.'
    if (!senha) novosErros.senha = 'Informe a senha.'

    setErros(novosErros)
    setErroGeral('')
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await login(emailLimpo, senha)
      navegar(local.state?.de ?? '/dashboard', { replace: true })
    } catch (falha) {
      if (falha instanceof ApiError) {
        setErroGeral(falha.message)
        setErros(falha.campos ?? {})
      } else {
        setErroGeral('Nao foi possivel entrar. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={aoEnviar} noValidate>
      <Alerta tipo="erro">{erroGeral}</Alerta>

      <CampoTexto
        id="login-email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        erro={erros.email}
        placeholder="voce@exemplo.com"
      />

      <CampoTexto
        id="login-senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        erro={erros.senha}
      />

      <Botao type="submit" carregando={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </Botao>
    </form>
  )
}
