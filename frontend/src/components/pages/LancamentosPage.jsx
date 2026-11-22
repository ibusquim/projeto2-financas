import { useState } from 'react'

import * as categoriasService from '../../services/categoriasService.js'
import * as fontesDestinosService from '../../services/fontesDestinosService.js'
import { formatarData, formatarMoeda, mesCorrenteISO } from '../../services/formatadores.js'
import * as lancamentosService from '../../services/lancamentosService.js'
import useConsulta from '../../services/useConsulta.js'
import FormularioLancamento from '../lancamentos/FormularioLancamento.jsx'
import FiltrosLancamentos from '../lancamentos/FiltrosLancamentos.jsx'
import DialogoExclusaoLancamento from '../lancamentos/DialogoExclusaoLancamento.jsx'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import Modal from '../ui/Modal.jsx'
import Paginacao from '../ui/Paginacao.jsx'

const PERIODO_INICIAL = mesCorrenteISO()
const FILTROS_INICIAIS = {
  ...PERIODO_INICIAL,
  tipo: '',
  categoriaId: '',
  fonteDestinoId: '',
}

export default function LancamentosPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [pagina, setPagina] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [erroExclusao, setErroExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [aviso, setAviso] = useState('')

  const categorias = useConsulta(() => categoriasService.listar(), [])
  const fontes = useConsulta(() => fontesDestinosService.listar(), [])
  const consulta = useConsulta(
    () => lancamentosService.listar({ ...filtros, pagina, porPagina: 20 }),
    [
      filtros.inicio,
      filtros.fim,
      filtros.tipo,
      filtros.categoriaId,
      filtros.fonteDestinoId,
      pagina,
    ],
  )

  const itens = consulta.dados?.itens ?? []
  const paginacao = consulta.dados?.paginacao
  const totais = consulta.dados?.totais ?? { entradas: '0.00', saidas: '0.00', saldo: '0.00' }

  function aplicarFiltros(novos) {
    setFiltros(novos)
    setPagina(1)
    setAviso('')
  }

  function abrirNovo() {
    setEmEdicao(null)
    setModalAberto(true)
    setAviso('')
  }

  function abrirEdicao(item) {
    setEmEdicao(item)
    setModalAberto(true)
    setAviso('')
  }

  function fecharModal() {
    setModalAberto(false)
    setEmEdicao(null)
  }

  function aposSalvar() {
    fecharModal()
    setAviso(emEdicao ? 'Lancamento atualizado com sucesso.' : 'Lancamento registrado com sucesso.')
    consulta.recarregar()
  }

  function pedirExclusao(item) {
    setParaExcluir(item)
    setErroExclusao('')
    setAviso('')
  }

  async function confirmarExclusao(escopo) {
    setExcluindo(true)
    setErroExclusao('')
    try {
      await lancamentosService.excluir(paraExcluir.id, escopo)
      setParaExcluir(null)
      setAviso(escopo === 'grupo' ? 'Todas as parcelas foram excluidas.' : 'Lancamento excluido.')
      consulta.recarregar()
    } catch (falha) {
      setErroExclusao(falha?.message ?? 'Nao foi possivel excluir o lancamento.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section className="pagina">
      <header className="pagina__cabecalho pagina__cabecalho--linha">
        <div>
          <h1 className="pagina__titulo">Lancamentos</h1>
          <p className="pagina__descricao">
            Registre entradas e saidas. Compras no cartao podem ser parceladas de 1 a 48 vezes.
          </p>
        </div>
        <Botao onClick={abrirNovo}>Novo lancamento</Botao>
      </header>

      <div className="resumos">
        <CartaoResumo titulo="Entradas" valor={formatarMoeda(totais.entradas)} tipo="entrada" />
        <CartaoResumo titulo="Saidas" valor={formatarMoeda(totais.saidas)} tipo="saida" />
        <CartaoResumo titulo="Saldo" valor={formatarMoeda(totais.saldo)} tipo="saldo" />
      </div>

      <FiltrosLancamentos
        filtros={filtros}
        categorias={categorias.dados ?? []}
        fontes={fontes.dados ?? []}
        aoAplicar={aplicarFiltros}
      />

      {aviso ? <Alerta tipo="sucesso">{aviso}</Alerta> : null}
      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}

      <div className="cartao">
        {consulta.carregando ? (
          <EstadoCarregando mensagem="Carregando lancamentos..." />
        ) : null}

        {!consulta.carregando && !consulta.erro && itens.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum lancamento no periodo"
            descricao="Ajuste os filtros ou registre o primeiro lancamento."
          >
            <Botao onClick={abrirNovo}>Registrar lancamento</Botao>
          </EstadoVazio>
        ) : null}

        {!consulta.carregando && itens.length > 0 ? (
          <div className="tabela-envolucro">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Descricao</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Fonte/destino</th>
                  <th scope="col">Parcela</th>
                  <th scope="col" className="tabela__numero">
                    Valor
                  </th>
                  <th scope="col" className="tabela__acoes">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td>{formatarData(item.data)}</td>
                    <td>{item.descricao}</td>
                    <td>{item.categoria?.nome ?? '—'}</td>
                    <td>{item.fonteDestino?.nome ?? '—'}</td>
                    <td>
                      {item.totalParcelas > 1 ? (
                        <span className="etiqueta">
                          {item.parcelaAtual}/{item.totalParcelas}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      className={`tabela__numero ${
                        item.tipo === 'entrada' ? 'valor-positivo' : 'valor-negativo'
                      }`}
                    >
                      {item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}
                    </td>
                    <td className="tabela__acoes">
                      <Botao
                        variante="secundario"
                        className="botao--pequeno"
                        onClick={() => abrirEdicao(item)}
                      >
                        Editar
                      </Botao>
                      <Botao
                        variante="perigo"
                        className="botao--pequeno"
                        onClick={() => pedirExclusao(item)}
                      >
                        Excluir
                      </Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {paginacao ? (
        <Paginacao
          pagina={paginacao.pagina}
          totalPaginas={paginacao.totalPaginas}
          totalItens={paginacao.totalItens}
          aoMudar={(nova) => setPagina(Math.max(1, nova))}
        />
      ) : null}

      {modalAberto ? (
        <Modal
          titulo={emEdicao ? 'Editar lancamento' : 'Novo lancamento'}
          aoFechar={fecharModal}
        >
          <FormularioLancamento
            lancamento={emEdicao}
            categorias={categorias.dados ?? []}
            fontes={fontes.dados ?? []}
            aoSalvar={aposSalvar}
            aoCancelar={fecharModal}
          />
        </Modal>
      ) : null}

      {paraExcluir ? (
        <DialogoExclusaoLancamento
          lancamento={paraExcluir}
          aoFechar={() => {
            setParaExcluir(null)
            setErroExclusao('')
          }}
          aoConfirmar={confirmarExclusao}
          processando={excluindo}
          erro={erroExclusao}
        />
      ) : null}
    </section>
  )
}
