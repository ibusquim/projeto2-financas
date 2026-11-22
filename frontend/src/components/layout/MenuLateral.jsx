import { NavLink } from 'react-router-dom'

const ITENS_GESTAO = [
  { para: '/dashboard', rotulo: 'Painel' },
  { para: '/lancamentos', rotulo: 'Lancamentos' },
  { para: '/categorias', rotulo: 'Categorias' },
  { para: '/fontes-destinos', rotulo: 'Fontes e destinos' },
]

const ITENS_ANALISES = [
  { para: '/relatorios/categorias', rotulo: 'Por categoria' },
  { para: '/relatorios/fontes-destinos', rotulo: 'Por fonte/destino' },
  { para: '/faturas', rotulo: 'Faturas' },
]

const classeDoLink = ({ isActive }) =>
  isActive ? 'menu-lateral__link ativo' : 'menu-lateral__link'

function GrupoDeLinks({ rotulo, itens }) {
  return (
    <div className="menu-lateral__grupo">
      <span className="menu-lateral__rotulo">{rotulo}</span>
      {itens.map((item) => (
        <NavLink key={item.para} to={item.para} className={classeDoLink}>
          {item.rotulo}
        </NavLink>
      ))}
    </div>
  )
}

export default function MenuLateral() {
  return (
    <aside className="menu-lateral">
      <div className="menu-lateral__marca">
        <strong>Controle Financeiro</strong>
        <span>Projeto 2 &middot; Full Stack</span>
      </div>

      <nav aria-label="Navegacao principal">
        <GrupoDeLinks rotulo="Gestao" itens={ITENS_GESTAO} />
        <GrupoDeLinks rotulo="Analises" itens={ITENS_ANALISES} />
      </nav>
    </aside>
  )
}
