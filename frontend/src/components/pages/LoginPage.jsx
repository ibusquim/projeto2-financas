import { Link } from 'react-router-dom'

import FormularioLogin from '../auth/FormularioLogin.jsx'

export default function LoginPage() {
  return (
    <main className="tela-auth">
      <section className="cartao tela-auth__cartao" aria-labelledby="titulo-login">
        <div className="tela-auth__marca">
          <span className="tela-auth__selo">Controle Financeiro</span>
          <h1 id="titulo-login" className="pagina__titulo">
            Entrar
          </h1>
          <p className="pagina__descricao">
            Acesse sua conta para registrar e acompanhar suas financas.
          </p>
        </div>

        <FormularioLogin />

        <p className="tela-auth__rodape">
          Ainda nao tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </section>
    </main>
  )
}
