import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <main className="tela-auth">
      <section className="cartao tela-auth__cartao" aria-labelledby="titulo-login">
        <h1 id="titulo-login" className="pagina__titulo">
          Entrar
        </h1>
        <p className="pagina__descricao">
          Estrutura inicial da aplicacao. O formulario de login, o AuthContext e a
          sessao JWT serao implementados na Issue de autenticacao.
        </p>
        <p className="tela-auth__rodape">
          Ainda nao tem conta? <Link to="/cadastro">Ver tela de cadastro</Link>
        </p>
      </section>
    </main>
  )
}
