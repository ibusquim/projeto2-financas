import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout.jsx'
import RotaProtegida from './components/layout/RotaProtegida.jsx'
import RotaPublica from './components/layout/RotaPublica.jsx'
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
import SaudeFinanceiraPage from './components/pages/SaudeFinanceiraPage.jsx'

import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
      </Route>

      <Route element={<RotaProtegida />}>
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
          <Route path="/saude-financeira" element={<SaudeFinanceiraPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
