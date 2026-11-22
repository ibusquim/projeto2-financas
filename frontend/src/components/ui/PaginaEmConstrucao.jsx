/**
 * Placeholder reutilizavel das telas que ainda nao possuem regra de negocio.
 * Evita duplicar markup enquanto as Issues de cada funcionalidade nao chegam.
 */
export default function PaginaEmConstrucao({ titulo, descricao, etapa }) {
  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">{titulo}</h1>
        {descricao ? <p className="pagina__descricao">{descricao}</p> : null}
      </header>

      <div className="cartao">
        <p>
          Estrutura criada. A implementacao funcional desta tela pertence a etapa:{' '}
          <strong>{etapa}</strong>.
        </p>
      </div>
    </section>
  )
}
