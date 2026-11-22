import { useState } from 'react'

import Botao from '../ui/Botao.jsx'
import CampoSelecao from '../ui/CampoSelecao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

export default function FiltrosLancamentos({ filtros, categorias, fontes, aoAplicar }) {
  const [formulario, setFormulario] = useState(filtros)

  function atualizar(nome) {
    return (evento) => setFormulario((atual) => ({ ...atual, [nome]: evento.target.value }))
  }

  function aoEnviar(evento) {
    evento.preventDefault()
    aoAplicar(formulario)
  }

  function limpar() {
    const limpo = {
      inicio: filtros.inicio,
      fim: filtros.fim,
      tipo: '',
      categoriaId: '',
      fonteDestinoId: '',
    }
    setFormulario(limpo)
    aoAplicar(limpo)
  }

  return (
    <form className="cartao filtros" onSubmit={aoEnviar}>
      <div className="filtros__grade">
        <CampoTexto
          id="filtro-inicio"
          rotulo="De"
          type="date"
          value={formulario.inicio}
          onChange={atualizar('inicio')}
        />
        <CampoTexto
          id="filtro-fim"
          rotulo="Ate"
          type="date"
          value={formulario.fim}
          onChange={atualizar('fim')}
        />
        <CampoSelecao
          id="filtro-tipo"
          rotulo="Tipo"
          value={formulario.tipo}
          onChange={atualizar('tipo')}
        >
          <option value="">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saidas</option>
        </CampoSelecao>
        <CampoSelecao
          id="filtro-categoria"
          rotulo="Categoria"
          value={formulario.categoriaId}
          onChange={atualizar('categoriaId')}
        >
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          id="filtro-fonte"
          rotulo="Fonte/destino"
          value={formulario.fonteDestinoId}
          onChange={atualizar('fonteDestinoId')}
        >
          <option value="">Todas</option>
          {fontes.map((fonte) => (
            <option key={fonte.id} value={fonte.id}>
              {fonte.nome}
            </option>
          ))}
        </CampoSelecao>
      </div>

      <div className="filtros__acoes">
        <Botao variante="secundario" type="button" onClick={limpar}>
          Limpar filtros
        </Botao>
        <Botao type="submit">Aplicar filtros</Botao>
      </div>
    </form>
  )
}
