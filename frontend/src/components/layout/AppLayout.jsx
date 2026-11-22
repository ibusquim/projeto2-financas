import { Outlet } from 'react-router-dom'

import MenuLateral from './MenuLateral.jsx'

/**
 * Shell das telas autenticadas: menu lateral, cabecalho e area de conteudo.
 * A verificacao de sessao sera adicionada com o AuthContext.
 */
export default function AppLayout() {
  return (
    <div className="app-shell">
      <a className="pular-para-conteudo" href="#conteudo">
        Pular para o conteudo
      </a>

      <MenuLateral />

      <div className="app-principal">
        <header className="app-topo">
          <span className="app-topo__titulo">Controle Financeiro Pessoal</span>
          <span className="app-topo__selo">Estrutura inicial</span>
        </header>

        <main id="conteudo" className="app-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
