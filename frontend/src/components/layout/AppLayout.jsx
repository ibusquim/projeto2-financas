import { Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth.js'
import MenuLateral from './MenuLateral.jsx'

/** Shell das telas autenticadas: menu lateral, cabecalho e area de conteudo. */
export default function AppLayout() {
  const { usuario, logout } = useAuth()
  const navegar = useNavigate()

  function sair() {
    logout()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a className="pular-para-conteudo" href="#conteudo">
        Pular para o conteudo
      </a>

      <MenuLateral />

      <div className="app-principal">
        <header className="app-topo">
          <span className="app-topo__titulo">Controle Financeiro Pessoal</span>

          <div className="app-topo__usuario">
            {usuario ? (
              <span className="app-topo__nome" title={usuario.email}>
                {usuario.nome}
              </span>
            ) : null}
            <button type="button" className="botao botao--secundario botao--pequeno" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <main id="conteudo" className="app-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
