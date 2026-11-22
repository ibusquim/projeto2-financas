export default function CartaoResumo({ titulo, valor, detalhe, tipo = 'neutro' }) {
  return (
    <article className={`resumo resumo--${tipo}`}>
      <span className="resumo__titulo">{titulo}</span>
      <strong className="resumo__valor">{valor}</strong>
      {detalhe ? <span className="resumo__detalhe">{detalhe}</span> : null}
    </article>
  )
}
