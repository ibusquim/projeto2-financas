import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth.js'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'

/** Login e cadastro redirecionam para o painel quando ja existe sessao. */
export default function RotaPublica() {
  const { autenticado, carregando } = useAuth()

  if (carregando) {
    return <EstadoCarregando mensagem="Verificando sua sessao..." telaCheia />
  }

  if (autenticado) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
