import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout.jsx'
import CadastroPage from './components/pages/CadastroPage.jsx'
import CategoriasPage from './components/pages/CategoriasPage.jsx'
import DashboardPage from './components/pages/DashboardPage.jsx'
import FaturasPage from './components/pages/FaturasPage.jsx'
import FontesDestinosPage from './components/pages/FontesDestinosPage.jsx'
import LancamentosPage from './components/pages/LancamentosPage.jsx'
import LoginPage from './components/pages/LoginPage.jsx'
import NotFoundPage from './components/pages/NotFoundPage.jsx'
import RelatorioCategoriasPage from './components/pages/RelatorioCategoriasPage.jsx'
import RelatorioFontesDestinosPage from './components/pages/RelatorioFontesDestinosPage.jsx'

import './App.css'

/**
 * Mapa de rotas da SPA.
 *
 * Nesta etapa as telas sao apenas estruturais: nao existe AuthContext, cliente
 * HTTP nem chamada a API. A protecao real de rotas entra na Issue de autenticacao.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/lancamentos" element={<LancamentosPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/fontes-destinos" element={<FontesDestinosPage />} />
        <Route path="/relatorios/categorias" element={<RelatorioCategoriasPage />} />
        <Route
          path="/relatorios/fontes-destinos"
          element={<RelatorioFontesDestinosPage />}
        />
        <Route path="/faturas" element={<FaturasPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
