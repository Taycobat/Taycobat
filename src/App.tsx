import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import DevisPage from './pages/Devis'
import Bibliotheque from './pages/Bibliotheque'
import PDFExport from './pages/PDFExport'
import SignaturePage from './pages/Signature'
import Tarifs from './pages/Tarifs'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function App() {
  useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/devis" element={<DevisPage />} />
          <Route path="/factures" element={<PDFExport />} />
          <Route path="/chantiers" element={<SignaturePage />} />
          <Route path="/planning" element={<Tarifs />} />
          <Route path="/bibliotheque" element={<Bibliotheque />} />
          <Route path="/ia-audio" element={<Dashboard />} />
          <Route path="/parametres" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
