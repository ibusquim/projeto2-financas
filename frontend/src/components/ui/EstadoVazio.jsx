export default function EstadoVazio({ titulo, descricao, children }) {
  return (
    <div className="estado-vazio">
      <h3 className="estado-vazio__titulo">{titulo}</h3>
      {descricao ? <p className="estado-vazio__descricao">{descricao}</p> : null}
      {children ? <div className="estado-vazio__acao">{children}</div> : null}
    </div>
  )
}
