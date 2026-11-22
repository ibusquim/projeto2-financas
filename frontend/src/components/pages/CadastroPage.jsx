import { Link } from 'react-router-dom'

import FormularioCadastro from '../auth/FormularioCadastro.jsx'

export default function CadastroPage() {
  return (
    <main className="tela-auth">
      <section className="cartao tela-auth__cartao" aria-labelledby="titulo-cadastro">
        <div className="tela-auth__marca">
          <span className="tela-auth__selo">Controle Financeiro</span>
          <h1 id="titulo-cadastro" className="pagina__titulo">
            Criar conta
          </h1>
          <p className="pagina__descricao">
            Seus dados ficam isolados: cada usuario enxerga apenas os proprios lancamentos.
          </p>
        </div>

        <FormularioCadastro />

        <p className="tela-auth__rodape">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  )
}
