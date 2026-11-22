import { useState } from 'react'

import { ApiError } from '../../services/api.js'
import * as categoriasService from '../../services/categoriasService.js'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CampoSelecao from '../ui/CampoSelecao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

export default function FormularioCategoria({ categoria, aoSalvar, aoCancelar }) {
  const editando = Boolean(categoria)
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [tipo, setTipo] = useState(categoria?.tipo ?? 'saida')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento) {
    evento.preventDefault()

    const novosErros = {}
    if (!nome.trim()) novosErros.nome = 'Informe o nome da categoria.'
    else if (nome.trim().length > 60) novosErros.nome = 'Maximo de 60 caracteres.'

    setErros(novosErros)
    setErroGeral('')
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      const dados = { nome: nome.trim(), tipo }
      if (editando) await categoriasService.atualizar(categoria.id, dados)
      else await categoriasService.criar(dados)
      aoSalvar()
    } catch (falha) {
      if (falha instanceof ApiError) {
        setErroGeral(falha.message)
        setErros(falha.campos ?? {})
      } else {
        setErroGeral('Nao foi possivel salvar a categoria.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={aoEnviar} noValidate>
      <Alerta tipo="erro">{erroGeral}</Alerta>

      <CampoTexto
        id="categoria-nome"
        rotulo="Nome"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        erro={erros.nome}
        maxLength={60}
        autoFocus
      />

      <CampoSelecao
        id="categoria-tipo"
        rotulo="Tipo"
        value={tipo}
        onChange={(evento) => setTipo(evento.target.value)}
        erro={erros.tipo}
        disabled={editando}
        ajuda={editando ? 'O tipo nao pode ser alterado depois de criado.' : undefined}
      >
        <option value="entrada">Entrada</option>
        <option value="saida">Saida</option>
      </CampoSelecao>

      <div className="modal__acoes">
        <Botao variante="secundario" type="button" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando}>
          {editando ? 'Salvar alteracoes' : 'Criar categoria'}
        </Botao>
      </div>
    </form>
  )
}
