import { useState } from 'react'

import Botao from '../ui/Botao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

export default function SeletorPeriodo({ inicio, fim, aoAplicar }) {
  const [valores, setValores] = useState({ inicio, fim })
  const [erro, setErro] = useState('')

  function aoEnviar(evento) {
    evento.preventDefault()
    if (!valores.inicio || !valores.fim) {
      setErro('Informe o inicio e o fim do periodo.')
      return
    }
    if (valores.inicio > valores.fim) {
      setErro('A data inicial nao pode ser posterior a final.')
      return
    }
    setErro('')
    aoAplicar(valores)
  }

  return (
    <form className="seletor-periodo" onSubmit={aoEnviar}>
      <CampoTexto
        id="periodo-inicio"
        rotulo="De"
        type="date"
        value={valores.inicio}
        onChange={(evento) => setValores((atual) => ({ ...atual, inicio: evento.target.value }))}
      />
      <CampoTexto
        id="periodo-fim"
        rotulo="Ate"
        type="date"
        value={valores.fim}
        onChange={(evento) => setValores((atual) => ({ ...atual, fim: evento.target.value }))}
      />
      <Botao type="submit" variante="secundario">
        Atualizar periodo
      </Botao>
      {erro ? <p className="campo__erro seletor-periodo__erro">{erro}</p> : null}
    </form>
  )
}
