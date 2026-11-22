import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth.js'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'

/** Bloqueia rotas internas ate existir sessao valida. */
export default function RotaProtegida() {
  const { autenticado, carregando } = useAuth()
  const local = useLocation()

  if (carregando) {
    return <EstadoCarregando mensagem="Verificando sua sessao..." telaCheia />
  }

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />
  }

  return <Outlet />
}
