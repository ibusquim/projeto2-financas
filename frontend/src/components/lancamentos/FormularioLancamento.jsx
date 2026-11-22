import { useState } from 'react'

import { ApiError } from '../../services/api.js'
import { converterValorParaDecimal, hojeISO } from '../../services/formatadores.js'
import * as lancamentosService from '../../services/lancamentosService.js'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CampoSelecao from '../ui/CampoSelecao.jsx'
import CampoTexto from '../ui/CampoTexto.jsx'

export default function FormularioLancamento({
  lancamento,
  categorias,
  fontes,
  aoSalvar,
  aoCancelar,
}) {
  const editando = Boolean(lancamento)

  const [tipo, setTipo] = useState(lancamento?.tipo ?? 'saida')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [valor, setValor] = useState(lancamento?.valor ?? '')
  const [data, setData] = useState(lancamento?.data ?? hojeISO())
  const [categoriaId, setCategoriaId] = useState(
    lancamento?.categoria?.id ? String(lancamento.categoria.id) : '',
  )
  const [fonteDestinoId, setFonteDestinoId] = useState(
    lancamento?.fonteDestino?.id ? String(lancamento.fonteDestino.id) : '',
  )
  const [parcelas, setParcelas] = useState('1')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const categoriasCompativeis = categorias.filter((item) => item.tipo === tipo)
  const fonteSelecionada = fontes.find((item) => String(item.id) === fonteDestinoId)
  const aceitaParcelamento = !editando && fonteSelecionada?.tipo === 'cartao_credito'

  function trocarTipo(novoTipo) {
    setTipo(novoTipo)
    const aindaValida = categorias.some(
      (item) => String(item.id) === categoriaId && item.tipo === novoTipo,
    )
    if (!aindaValida) setCategoriaId('')
  }

  async function aoEnviar(evento) {
    evento.preventDefault()

    const novosErros = {}
    const valorDecimal = converterValorParaDecimal(valor)

    if (!descricao.trim()) novosErros.descricao = 'Informe a descricao.'
    if (!valorDecimal || Number(valorDecimal) <= 0) {
      novosErros.valor = 'Informe um valor maior que zero, com ate duas casas decimais.'
    }
    if (!data) novosErros.data = 'Informe a data.'
    if (!categoriaId) novosErros.categoriaId = 'Selecione a categoria.'
    if (!fonteDestinoId) novosErros.fonteDestinoId = 'Selecione a fonte/destino.'

    let quantidadeParcelas = null
    if (aceitaParcelamento) {
      const numero = Number(parcelas)
      if (!Number.isInteger(numero) || numero < 1 || numero > 48) {
        novosErros.parcelas = 'Informe um numero de parcelas entre 1 e 48.'
      } else if (numero > 1) {
        quantidadeParcelas = numero
      }
    }

    setErros(novosErros)
    setErroGeral('')
    if (Object.keys(novosErros).length > 0) return

    const dados = {
      tipo,
      descricao: descricao.trim(),
      valor: valorDecimal,
      data,
      categoriaId: Number(categoriaId),
      fonteDestinoId: Number(fonteDestinoId),
    }
    if (quantidadeParcelas) dados.parcelas = quantidadeParcelas

    setEnviando(true)
    try {
      if (editando) await lancamentosService.atualizar(lancamento.id, dados)
      else await lancamentosService.criar(dados)
      aoSalvar()
    } catch (falha) {
      if (falha instanceof ApiError) {
        setErroGeral(falha.message)
        setErros(falha.campos ?? {})
      } else {
        setErroGeral('Nao foi possivel salvar o lancamento.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={aoEnviar} noValidate>
      <Alerta tipo="erro">{erroGeral}</Alerta>

      <div className="grade-campos">
        <CampoSelecao
          id="lancamento-tipo"
          rotulo="Tipo"
          value={tipo}
          onChange={(evento) => trocarTipo(evento.target.value)}
          erro={erros.tipo}
          disabled={editando}
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saida</option>
        </CampoSelecao>

        <CampoTexto
          id="lancamento-data"
          rotulo="Data"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          erro={erros.data}
        />
      </div>

      <CampoTexto
        id="lancamento-descricao"
        rotulo="Descricao"
        value={descricao}
        onChange={(evento) => setDescricao(evento.target.value)}
        erro={erros.descricao}
        maxLength={200}
        autoFocus
      />

      <div className="grade-campos">
        <CampoTexto
          id="lancamento-valor"
          rotulo="Valor (R$)"
          inputMode="decimal"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          erro={erros.valor}
          placeholder="0,00"
        />

        <CampoSelecao
          id="lancamento-categoria"
          rotulo="Categoria"
          value={categoriaId}
          onChange={(evento) => setCategoriaId(evento.target.value)}
          erro={erros.categoriaId}
        >
          <option value="">Selecione...</option>
          {categoriasCompativeis.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </CampoSelecao>
      </div>

      <CampoSelecao
        id="lancamento-fonte"
        rotulo="Fonte/destino"
        value={fonteDestinoId}
        onChange={(evento) => setFonteDestinoId(evento.target.value)}
        erro={erros.fonteDestinoId}
      >
        <option value="">Selecione...</option>
        {fontes.map((fonte) => (
          <option key={fonte.id} value={fonte.id}>
            {fonte.nome}
            {fonte.tipo === 'cartao_credito' ? ' (cartao)' : ''}
          </option>
        ))}
      </CampoSelecao>

      {aceitaParcelamento ? (
        <CampoTexto
          id="lancamento-parcelas"
          rotulo="Parcelas"
          type="number"
          min="1"
          max="48"
          value={parcelas}
          onChange={(evento) => setParcelas(evento.target.value)}
          erro={erros.parcelas}
          ajuda="Entre 1 e 48. A diferenca de arredondamento fica na primeira parcela."
        />
      ) : null}

      <div className="modal__acoes">
        <Botao variante="secundario" type="button" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando}>
          {editando ? 'Salvar alteracoes' : 'Registrar lancamento'}
        </Botao>
      </div>
    </form>
  )
}
