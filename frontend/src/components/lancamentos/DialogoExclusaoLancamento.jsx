import Alerta from '../ui/Alerta.jsx'
import Botao from '../ui/Botao.jsx'
import Modal from '../ui/Modal.jsx'

export default function DialogoExclusaoLancamento({
  lancamento,
  aoFechar,
  aoConfirmar,
  processando,
  erro,
}) {
  const parcelado = lancamento.totalParcelas > 1

  return (
    <Modal titulo="Excluir lancamento" aoFechar={aoFechar} largura="pequeno">
      <p className="modal__descricao">
        {parcelado
          ? `"${lancamento.descricao}" e a parcela ${lancamento.parcelaAtual}/${lancamento.totalParcelas}. O que deseja excluir?`
          : `Deseja excluir "${lancamento.descricao}"? Esta acao nao pode ser desfeita.`}
      </p>

      {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}

      <div className="modal__acoes modal__acoes--coluna">
        <Botao variante="secundario" onClick={aoFechar} disabled={processando}>
          Cancelar
        </Botao>
        <Botao
          variante="perigo"
          onClick={() => aoConfirmar('parcela')}
          carregando={processando}
        >
          {parcelado ? 'Somente esta parcela' : 'Excluir'}
        </Botao>
        {parcelado ? (
          <Botao variante="perigo" onClick={() => aoConfirmar('grupo')} disabled={processando}>
            Todas as parcelas
          </Botao>
        ) : null}
      </div>
    </Modal>
  )
}
