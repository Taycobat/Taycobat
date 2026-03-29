import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import DevisPage from './pages/Devis'
import DevisDetail from './pages/DevisDetail'
import Factures from './pages/Factures'
import FactureDetail from './pages/FactureDetail'
import ClientDetail from './pages/ClientDetail'
import Chantiers from './pages/Chantiers'
import Planning from './pages/Planning'
import Bibliotheque from './pages/Bibliotheque'
import SignaturePage from './pages/Signature'
import IAAudio from './pages/IAAudio'
import SousTraitants from './pages/SousTraitants'
import Notifications from './pages/Notifications'
import Conformite from './pages/Conformite'
import AttestationTVA from './pages/AttestationTVA'
import ExportFEC from './pages/ExportFEC'
import PDFExport from './pages/PDFExport'
import Tarifs from './pages/Tarifs'
import Admin from './pages/Admin'
import AbonnementSucces from './pages/AbonnementSucces'
import AbonnementAnnulation from './pages/AbonnementAnnulation'
import Parametres from './pages/Parametres'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'
import MentionsLegales from './pages/MentionsLegales'
import CGU from './pages/CGU'
import CookieBanner from './components/CookieBanner'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function HomeRedirect() {
  const { session, loading } = useAuthStore()
  if (loading) return null
  return session ? <Dashboard /> : <Landing />
}

function App() {
  useAuth()

  return (
    <BrowserRouter>
      <CookieBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgu" element={<CGU />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/devis" element={<DevisPage />} />
            <Route path="/devis/:id" element={<DevisDetail />} />
            <Route path="/factures" element={<Factures />} />
            <Route path="/factures/:id" element={<FactureDetail />} />
            <Route path="/chantiers" element={<Chantiers />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/bibliotheque" element={<Bibliotheque />} />
            <Route path="/ia-audio" element={<IAAudio />} />
            <Route path="/signature" element={<SignaturePage />} />
            <Route path="/sous-traitants" element={<SousTraitants />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/conformite" element={<Conformite />} />
            <Route path="/attestation-tva" element={<AttestationTVA />} />
            <Route path="/export-fec" element={<ExportFEC />} />
            <Route path="/pdf-export" element={<PDFExport />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/abonnement/succes" element={<AbonnementSucces />} />
            <Route path="/abonnement/annulation" element={<AbonnementAnnulation />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
