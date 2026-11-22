import { useState } from 'react'

import { ApiError } from '../../services/api.js'
import * as fontesDestinosService from '../../services/fontesDestinosService.js'
import { converterValorParaDecimal } from '../../services/formatadores.js'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CampoSelecao from '../ui/CampoSelecao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

const TIPOS = [
  { valor: 'renda', rotulo: 'Renda' },
  { valor: 'conta', rotulo: 'Conta' },
  { valor: 'cartao_credito', rotulo: 'Cartao de credito' },
]

export default function FormularioFonteDestino({ fonte, aoSalvar, aoCancelar }) {
  const editando = Boolean(fonte)
  const [nome, setNome] = useState(fonte?.nome ?? '')
  const [tipo, setTipo] = useState(fonte?.tipo ?? 'conta')
  const [diaFechamento, setDiaFechamento] = useState(
    fonte?.diaFechamento ? String(fonte.diaFechamento) : '',
  )
  const [diaVencimento, setDiaVencimento] = useState(
    fonte?.diaVencimento ? String(fonte.diaVencimento) : '',
  )
  const [limite, setLimite] = useState(fonte?.limite ?? '')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const ehCartao = tipo === 'cartao_credito'

  function validarDia(valor) {
    const numero = Number(valor)
    return Number.isInteger(numero) && numero >= 1 && numero <= 31
  }

  async function aoEnviar(evento) {
    evento.preventDefault()

    const novosErros = {}
    if (!nome.trim()) novosErros.nome = 'Informe o nome.'

    let limiteDecimal = null
    if (ehCartao) {
      if (!validarDia(diaFechamento)) novosErros.diaFechamento = 'Informe um dia entre 1 e 31.'
      if (!validarDia(diaVencimento)) novosErros.diaVencimento = 'Informe um dia entre 1 e 31.'
      limiteDecimal = converterValorParaDecimal(limite)
      if (!limiteDecimal || Number(limiteDecimal) <= 0) {
        novosErros.limite = 'Informe um limite maior que zero.'
      }
    }

    setErros(novosErros)
    setErroGeral('')
    if (Object.keys(novosErros).length > 0) return

    const dados = { nome: nome.trim(), tipo }
    if (ehCartao) {
      dados.diaFechamento = Number(diaFechamento)
      dados.diaVencimento = Number(diaVencimento)
      dados.limite = limiteDecimal
    }

    setEnviando(true)
    try {
      if (editando) await fontesDestinosService.atualizar(fonte.id, dados)
      else await fontesDestinosService.criar(dados)
      aoSalvar()
    } catch (falha) {
      if (falha instanceof ApiError) {
        setErroGeral(falha.message)
        setErros(falha.campos ?? {})
      } else {
        setErroGeral('Nao foi possivel salvar a fonte/destino.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={aoEnviar} noValidate>
      <Alerta tipo="erro">{erroGeral}</Alerta>

      <CampoTexto
        id="fonte-nome"
        rotulo="Nome"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        erro={erros.nome}
        maxLength={80}
        autoFocus
      />

      <CampoSelecao
        id="fonte-tipo"
        rotulo="Tipo"
        value={tipo}
        onChange={(evento) => setTipo(evento.target.value)}
        erro={erros.tipo}
        disabled={editando}
        ajuda={editando ? 'O tipo nao pode ser alterado depois de criado.' : undefined}
      >
        {TIPOS.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </CampoSelecao>

      {ehCartao ? (
        <div className="grade-campos">
          <CampoTexto
            id="fonte-fechamento"
            rotulo="Dia de fechamento"
            type="number"
            min="1"
            max="31"
            value={diaFechamento}
            onChange={(evento) => setDiaFechamento(evento.target.value)}
            erro={erros.diaFechamento}
          />
          <CampoTexto
            id="fonte-vencimento"
            rotulo="Dia de vencimento"
            type="number"
            min="1"
            max="31"
            value={diaVencimento}
            onChange={(evento) => setDiaVencimento(evento.target.value)}
            erro={erros.diaVencimento}
          />
          <CampoTexto
            id="fonte-limite"
            rotulo="Limite (R$)"
            inputMode="decimal"
            value={limite}
            onChange={(evento) => setLimite(evento.target.value)}
            erro={erros.limite}
            placeholder="0,00"
          />
        </div>
      ) : null}

      <div className="modal__acoes">
        <Botao variante="secundario" type="button" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando}>
          {editando ? 'Salvar alteracoes' : 'Criar fonte/destino'}
        </Botao>
      </div>
    </form>
  )
}
