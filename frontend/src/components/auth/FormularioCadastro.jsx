import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth.js'
import { ApiError } from '../../services/api.js'
import { cpfValido } from '../../services/formatadores.js'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SENHA_FORTE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const ESTADO_INICIAL = {
  nome: '',
  email: '',
  cpf: '',
  senha: '',
  confirmacaoSenha: '',
}

export default function FormularioCadastro() {
  const { cadastrar } = useAuth()
  const navegar = useNavigate()

  const [campos, setCampos] = useState(ESTADO_INICIAL)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  function atualizar(nome) {
    return (evento) => setCampos((atual) => ({ ...atual, [nome]: evento.target.value }))
  }

  function validar() {
    const novosErros = {}
    const nome = campos.nome.trim()
    const email = campos.email.trim()

    if (nome.length < 3) novosErros.nome = 'Informe o nome completo (minimo 3 caracteres).'
    if (!email) novosErros.email = 'Informe o e-mail.'
    else if (!EMAIL_VALIDO.test(email)) novosErros.email = 'Informe um e-mail valido.'
    if (!campos.cpf.trim()) novosErros.cpf = 'Informe o CPF.'
    else if (!cpfValido(campos.cpf)) novosErros.cpf = 'CPF invalido.'
    if (!SENHA_FORTE.test(campos.senha)) {
      novosErros.senha = 'A senha deve ter no minimo 8 caracteres, com letras e numeros.'
    }
    if (campos.confirmacaoSenha !== campos.senha) {
      novosErros.confirmacaoSenha = 'As senhas nao conferem.'
    }

    return novosErros
  }

  async function aoEnviar(evento) {
    evento.preventDefault()

    const novosErros = validar()
    setErros(novosErros)
    setErroGeral('')
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await cadastrar({
        nome: campos.nome.trim(),
        email: campos.email.trim(),
        cpf: campos.cpf.trim(),
        senha: campos.senha,
        confirmacaoSenha: campos.confirmacaoSenha,
      })
      navegar('/dashboard', { replace: true })
    } catch (falha) {
      if (falha instanceof ApiError) {
        setErroGeral(falha.message)
        setErros(falha.campos ?? {})
      } else {
        setErroGeral('Nao foi possivel concluir o cadastro. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={aoEnviar} noValidate>
      <Alerta tipo="erro">{erroGeral}</Alerta>

      <CampoTexto
        id="cadastro-nome"
        rotulo="Nome completo"
        autoComplete="name"
        value={campos.nome}
        onChange={atualizar('nome')}
        erro={erros.nome}
      />

      <CampoTexto
        id="cadastro-email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={campos.email}
        onChange={atualizar('email')}
        erro={erros.email}
        placeholder="voce@exemplo.com"
      />

      <CampoTexto
        id="cadastro-cpf"
        rotulo="CPF"
        inputMode="numeric"
        autoComplete="off"
        value={campos.cpf}
        onChange={atualizar('cpf')}
        erro={erros.cpf}
        ajuda="Pode informar com ou sem pontuacao."
        placeholder="000.000.000-00"
      />

      <CampoTexto
        id="cadastro-senha"
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        value={campos.senha}
        onChange={atualizar('senha')}
        erro={erros.senha}
        ajuda="Minimo de 8 caracteres, com letras e numeros."
      />

      <CampoTexto
        id="cadastro-confirmacao"
        rotulo="Confirmacao de senha"
        type="password"
        autoComplete="new-password"
        value={campos.confirmacaoSenha}
        onChange={atualizar('confirmacaoSenha')}
        erro={erros.confirmacaoSenha}
      />

      <Botao type="submit" carregando={enviando}>
        {enviando ? 'Criando conta...' : 'Criar conta'}
      </Botao>
    </form>
  )
}
