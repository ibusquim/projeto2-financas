import { Link } from 'react-router-dom'

export default function CadastroPage() {
  return (
    <main className="tela-auth">
      <section className="cartao tela-auth__cartao" aria-labelledby="titulo-cadastro">
        <h1 id="titulo-cadastro" className="pagina__titulo">
          Criar conta
        </h1>
        <p className="pagina__descricao">
          Estrutura inicial da aplicacao. O formulario de cadastro e as validacoes
          complementares serao implementados na Issue de autenticacao.
        </p>
        <p className="tela-auth__rodape">
          Ja tem conta? <Link to="/login">Ir para o login</Link>
        </p>
      </section>
    </main>
  )
}
