import Botao from './Botao.jsx'
import Modal from './Modal.jsx'

export default function DialogoConfirmacao({
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  aoConfirmar,
  aoCancelar,
  processando = false,
  children,
}) {
  return (
    <Modal titulo={titulo} aoFechar={aoCancelar} largura="pequeno">
      <p className="modal__descricao">{descricao}</p>
      {children}
      <div className="modal__acoes">
        <Botao variante="secundario" onClick={aoCancelar} disabled={processando}>
          Cancelar
        </Botao>
        <Botao variante="perigo" onClick={aoConfirmar} carregando={processando}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  )
}
