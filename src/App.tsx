import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import DevisPage from './pages/Devis'
import DevisDetail from './pages/DevisDetail'
import Factures from './pages/Factures'
import Chantiers from './pages/Chantiers'
import Planning from './pages/Planning'
import Bibliotheque from './pages/Bibliotheque'
import SignaturePage from './pages/Signature'
import SousTraitants from './pages/SousTraitants'
import Notifications from './pages/Notifications'
import Conformite from './pages/Conformite'
import AttestationTVA from './pages/AttestationTVA'
import ExportFEC from './pages/ExportFEC'
import PDFExport from './pages/PDFExport'
import Tarifs from './pages/Tarifs'
import Parametres from './pages/Parametres'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function App() {
  useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/devis" element={<DevisPage />} />
            <Route path="/devis/:id" element={<DevisDetail />} />
            <Route path="/factures" element={<Factures />} />
            <Route path="/chantiers" element={<Chantiers />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/bibliotheque" element={<Bibliotheque />} />
            <Route path="/signature" element={<SignaturePage />} />
            <Route path="/sous-traitants" element={<SousTraitants />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/conformite" element={<Conformite />} />
            <Route path="/attestation-tva" element={<AttestationTVA />} />
            <Route path="/export-fec" element={<ExportFEC />} />
            <Route path="/pdf-export" element={<PDFExport />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
