import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="tela-auth">
      <section className="cartao tela-auth__cartao" aria-labelledby="titulo-404">
        <p className="tela-erro__codigo">Erro 404</p>
        <h1 id="titulo-404" className="pagina__titulo">
          Pagina nao encontrada
        </h1>
        <p className="pagina__descricao">
          O endereco acessado nao existe nesta aplicacao.
        </p>
        <p className="tela-auth__rodape">
          <Link to="/dashboard">Voltar para o painel</Link>
        </p>
      </section>
    </main>
  )
}
