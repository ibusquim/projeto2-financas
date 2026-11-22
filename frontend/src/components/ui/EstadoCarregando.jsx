export default function EstadoCarregando({ mensagem = 'Carregando...', telaCheia = false }) {
  return (
    <div
      className={telaCheia ? 'estado estado--tela' : 'estado'}
      role="status"
      aria-live="polite"
    >
      <span className="estado__giro" aria-hidden="true" />
      <span>{mensagem}</span>
    </div>
  )
}
