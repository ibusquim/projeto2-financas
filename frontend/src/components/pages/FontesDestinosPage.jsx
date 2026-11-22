import { useState } from 'react'

import * as fontesDestinosService from '../../services/fontesDestinosService.js'
import { formatarMoeda } from '../../services/formatadores.js'
import useConsulta from '../../services/useConsulta.js'
import FormularioFonteDestino from '../fontes/FormularioFonteDestino.jsx'
import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import DialogoConfirmacao from '../ui/DialogoConfirmacao.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import Modal from '../ui/Modal.jsx'

const ROTULOS = {
  renda: 'Renda',
  conta: 'Conta',
  cartao_credito: 'Cartao de credito',
}

function TabelaDeFontes({ itens, aoEditar, aoExcluir }) {
  return (
    <div className="tabela-envolucro">
      <table className="tabela">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Detalhes</th>
            <th scope="col" className="tabela__acoes">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>
                {item.tipo === 'cartao_credito' ? (
                  <span className="texto-suave">
                    Fecha dia {item.diaFechamento} | vence dia {item.diaVencimento} | limite{' '}
                    {formatarMoeda(item.limite)}
                  </span>
                ) : (
                  <span className="texto-suave">—</span>
                )}
              </td>
              <td className="tabela__acoes">
                <Botao
                  variante="secundario"
                  className="botao--pequeno"
                  onClick={() => aoEditar(item)}
                >
                  Editar
                </Botao>
                <Botao
                  variante="perigo"
                  className="botao--pequeno"
                  onClick={() => aoExcluir(item)}
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

export default function FontesDestinosPage() {
  const { dados, carregando, erro, recarregar } = useConsulta(
    () => fontesDestinosService.listar(),
    [],
  )
  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [erroExclusao, setErroExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  function abrirNova() {
    setEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(item) {
    setEmEdicao(item)
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
      await fontesDestinosService.excluir(paraExcluir.id)
      setParaExcluir(null)
      recarregar()
    } catch (falha) {
      setErroExclusao(falha?.message ?? 'Nao foi possivel excluir a fonte/destino.')
    } finally {
      setExcluindo(false)
    }
  }

  const fontes = dados ?? []
  const grupos = ['renda', 'conta', 'cartao_credito'].map((tipo) => ({
    tipo,
    itens: fontes.filter((item) => item.tipo === tipo),
  }))

  return (
    <section className="pagina">
      <header className="pagina__cabecalho pagina__cabecalho--linha">
        <div>
          <h1 className="pagina__titulo">Fontes e destinos</h1>
          <p className="pagina__descricao">
            Cadastre rendas, contas e cartoes. Cartoes exigem fechamento, vencimento e limite.
          </p>
        </div>
        <Botao onClick={abrirNova}>Nova fonte/destino</Botao>
      </header>

      {erro ? <Alerta tipo="erro">{erro.message}</Alerta> : null}
      {carregando ? <EstadoCarregando mensagem="Carregando fontes e destinos..." /> : null}

      {!carregando && !erro && fontes.length === 0 ? (
        <div className="cartao">
          <EstadoVazio
            titulo="Nenhuma fonte ou destino cadastrado"
            descricao="Cadastre ao menos uma conta ou cartao para usar nos lancamentos."
          >
            <Botao onClick={abrirNova}>Cadastrar agora</Botao>
          </EstadoVazio>
        </div>
      ) : null}

      {!carregando && !erro && fontes.length > 0 ? (
        <div className="pilha">
          {grupos.map((grupo) =>
            grupo.itens.length > 0 ? (
              <div className="cartao" key={grupo.tipo}>
                <h2 className="secao__titulo">
                  {ROTULOS[grupo.tipo]} ({grupo.itens.length})
                </h2>
                <TabelaDeFontes
                  itens={grupo.itens}
                  aoEditar={abrirEdicao}
                  aoExcluir={setParaExcluir}
                />
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      {modalAberto ? (
        <Modal
          titulo={emEdicao ? 'Editar fonte/destino' : 'Nova fonte/destino'}
          aoFechar={fecharModal}
        >
          <FormularioFonteDestino
            fonte={emEdicao}
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
          titulo="Excluir fonte/destino"
          descricao={`Deseja excluir "${paraExcluir.nome}"? Itens com lancamentos associados nao podem ser excluidos.`}
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
