export default function Paginacao({ pagina, totalPaginas, totalItens, aoMudar }) {
  if (!totalPaginas || totalPaginas <= 1) return null

  return (
    <nav className="paginacao" aria-label="Paginacao de resultados">
      <button
        type="button"
        className="botao botao--secundario botao--pequeno"
        onClick={() => aoMudar(pagina - 1)}
        disabled={pagina <= 1}
      >
        Anterior
      </button>

      <span className="paginacao__texto">
        Pagina {pagina} de {totalPaginas}
        {typeof totalItens === 'number' ? ` | ${totalItens} registro(s)` : null}
      </span>

      <button
        type="button"
        className="botao botao--secundario botao--pequeno"
        onClick={() => aoMudar(pagina + 1)}
        disabled={pagina >= totalPaginas}
      >
        Proxima
      </button>
    </nav>
  )
}
