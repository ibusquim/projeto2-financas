import { useState } from 'react'

import * as categoriasService from '../../services/categoriasService.js'
import useConsulta from '../../services/useConsulta.js'
import FormularioCategoria from '../categorias/FormularioCategoria.jsx'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import DialogoConfirmacao from '../ui/DialogoConfirmacao.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import Modal from '../ui/Modal.jsx'

function TabelaDeCategorias({ itens, aoEditar, aoExcluir }) {
  return (
    <div className="tabela-envolucro">
      <table className="tabela">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col" className="tabela__acoes">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((categoria) => (
            <tr key={categoria.id}>
              <td>{categoria.nome}</td>
              <td className="tabela__acoes">
                <Botao
                  variante="secundario"
                  className="botao--pequeno"
                  onClick={() => aoEditar(categoria)}
                >
                  Editar
                </Botao>
                <Botao
                  variante="perigo"
                  className="botao--pequeno"
                  onClick={() => aoExcluir(categoria)}
                >
                  Excluir
                </Botao>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CategoriasPage() {
  const { dados, carregando, erro, recarregar } = useConsulta(() => categoriasService.listar(), [])
  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [erroExclusao, setErroExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  function abrirNova() {
    setEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(categoria) {
    setEmEdicao(categoria)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEmEdicao(null)
  }

  async function confirmarExclusao() {
    setExcluindo(true)
    setErroExclusao('')
    try {
      await categoriasService.excluir(paraExcluir.id)
      setParaExcluir(null)
      recarregar()
    } catch (falha) {
      setErroExclusao(falha?.message ?? 'Nao foi possivel excluir a categoria.')
    } finally {
      setExcluindo(false)
    }
  }

  const categorias = dados ?? []
  const entradas = categorias.filter((item) => item.tipo === 'entrada')
  const saidas = categorias.filter((item) => item.tipo === 'saida')

  return (
    <section className="pagina">
      <header className="pagina__cabecalho pagina__cabecalho--linha">
        <div>
          <h1 className="pagina__titulo">Categorias</h1>
          <p className="pagina__descricao">
            Organize entradas e saidas. O nome precisa ser unico dentro de cada tipo.
          </p>
        </div>
        <Botao onClick={abrirNova}>Nova categoria</Botao>
      </header>

      {erro ? <Alerta tipo="erro">{erro.message}</Alerta> : null}

      {carregando ? <EstadoCarregando mensagem="Carregando categorias..." /> : null}

      {!carregando && !erro && categorias.length === 0 ? (
        <div className="cartao">
          <EstadoVazio
            titulo="Nenhuma categoria cadastrada"
            descricao="Crie a primeira categoria para classificar seus lancamentos."
          >
            <Botao onClick={abrirNova}>Criar categoria</Botao>
          </EstadoVazio>
        </div>
      ) : null}

      {!carregando && !erro && categorias.length > 0 ? (
        <div className="grade-duas-colunas">
          <div className="cartao">
            <h2 className="secao__titulo">Entradas ({entradas.length})</h2>
            {entradas.length > 0 ? (
              <TabelaDeCategorias
                itens={entradas}
                aoEditar={abrirEdicao}
                aoExcluir={setParaExcluir}
              />
            ) : (
              <p className="texto-suave">Nenhuma categoria de entrada.</p>
            )}
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Saidas ({saidas.length})</h2>
            {saidas.length > 0 ? (
              <TabelaDeCategorias itens={saidas} aoEditar={abrirEdicao} aoExcluir={setParaExcluir} />
            ) : (
              <p className="texto-suave">Nenhuma categoria de saida.</p>
            )}
          </div>
        </div>
      ) : null}

      {modalAberto ? (
        <Modal
          titulo={emEdicao ? 'Editar categoria' : 'Nova categoria'}
          aoFechar={fecharModal}
          largura="pequeno"
        >
          <FormularioCategoria
            categoria={emEdicao}
            aoSalvar={() => {
              fecharModal()
              recarregar()
            }}
            aoCancelar={fecharModal}
          />
        </Modal>
      ) : null}

      {paraExcluir ? (
        <DialogoConfirmacao
          titulo="Excluir categoria"
          descricao={`Deseja excluir "${paraExcluir.nome}"? Categorias com lancamentos associados nao podem ser excluidas.`}
          rotuloConfirmar="Excluir"
          aoConfirmar={confirmarExclusao}
          aoCancelar={() => {
            setParaExcluir(null)
            setErroExclusao('')
          }}
          processando={excluindo}
        >
          {erroExclusao ? <Alerta tipo="erro">{erroExclusao}</Alerta> : null}
        </DialogoConfirmacao>
      ) : null}
    </section>
  )
}
