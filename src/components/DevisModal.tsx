import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { clientDisplayName } from '../hooks/useClients'
import type { Client } from '../hooks/useClients'
import type { DevisCreatePayload, DevisLigne } from '../hooks/useDevis'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: DevisCreatePayload) => Promise<{ error: string | null }>
}

const TVA_OPTIONS = [
  { value: 5.5, label: '5,5 %', tag: 'Isolation' },
  { value: 10, label: '10 %', tag: 'Rénovation' },
  { value: 20, label: '20 %', tag: 'Standard' },
]

const emptyLigne = (): Omit<DevisLigne, 'id' | 'devis_id'> => ({
  description: '',
  quantite: 1,
  unite: 'u',
  prix_unitaire: 0,
  total_ht: 0,
})

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}

export default function DevisModal({ open, onClose, onSubmit }: Props) {
  const { user } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [titre, setTitre] = useState('')
  const [clientId, setClientId] = useState('')
  const [tvaPct, setTvaPct] = useState(10)
  const [autoliquidation, setAutoliquidation] = useState(false)
  const [dateDevis, setDateDevis] = useState(new Date().toISOString().split('T')[0])
  const [dateValidite, setDateValidite] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
  const [adresseChantier, setAdresseChantier] = useState('')
  const [lignes, setLignes] = useState<Omit<DevisLigne, 'id' | 'devis_id'>[]>([emptyLigne()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Quick client creation
  const [showNewClient, setShowNewClient] = useState(false)
  const [newType, setNewType] = useState<'particulier' | 'societe'>('particulier')
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newRaisonSociale, setNewRaisonSociale] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTel, setNewTel] = useState('')
  const [newVille, setNewVille] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('clients').select('id, nom, prenom, entreprise, adresse, ville, code_postal, adresse_chantier, ville_chantier, code_postal_chantier')
      .eq('user_id', user.id).order('nom')
    setClients((data as Client[]) ?? [])
  }, [user])

  useEffect(() => {
    if (open) {
      fetchClients()
      setTitre(''); setClientId(''); setTvaPct(10); setAutoliquidation(false); setAdresseChantier('')
      setDateDevis(new Date().toISOString().split('T')[0])
      setDateValidite(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      setLignes([emptyLigne()]); setError(''); setShowNewClient(false)
    }
  }, [open, fetchClients])

  async function handleCreateClient() {
    if (!user) return
    if (newType === 'societe' && !newRaisonSociale) return
    if (newType === 'particulier' && !newNom) return
    setCreatingClient(true)
    const insert = newType === 'societe'
      ? { type_client: 'societe', raison_sociale: newRaisonSociale, nom_contact: newNom, email: newEmail, telephone: newTel, ville: newVille, nom: '', prenom: '', user_id: user.id }
      : { type_client: 'particulier', nom: newNom, prenom: newPrenom, email: newEmail, telephone: newTel, ville: newVille, user_id: user.id }
    const { data, error: err } = await supabase.from('clients').insert(insert).select('id').single()
    setCreatingClient(false)
    if (err) { setError(err.message); return }
    await fetchClients()
    setClientId(data.id)
    setShowNewClient(false)
    setNewNom(''); setNewPrenom(''); setNewEmail(''); setNewTel(''); setNewVille(''); setNewRaisonSociale('')
  }

  function updateLigne(i: number, field: string, raw: string) {
    setLignes((prev) => {
      const next = [...prev]
      const l = { ...next[i], [field]: field === 'description' || field === 'unite' ? raw : parseFloat(raw) || 0 }
      l.total_ht = Math.round(l.quantite * l.prix_unitaire * 100) / 100
      next[i] = l
      return next
    })
  }

  function addLigne() { setLignes((p) => [...p, emptyLigne()]) }
  function removeLigne(i: number) { setLignes((p) => p.length <= 1 ? p : p.filter((_, idx) => idx !== i)) }

  const totalHT = lignes.reduce((s, l) => s + l.total_ht, 0)
  const totalTVA = autoliquidation ? 0 : Math.round(totalHT * (tvaPct / 100) * 100) / 100
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100

  const selectedClient = clients.find((c) => c.id === clientId)
  const entreprise = user?.user_metadata?.entreprise || 'TAYCOBAT'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lignes.every((l) => !l.description)) { setError('Ajoutez au moins une ligne de travaux'); return }
    setSaving(true); setError('')
    const res = await onSubmit({
      titre, client_id: clientId || null,
      tva_pct: autoliquidation ? 0 : tvaPct, autoliquidation,
      date_devis: dateDevis, date_validite: dateValidite,
      adresse_chantier: adresseChantier || undefined,
      lignes: lignes.filter((l) => l.description),
    })
    setSaving(false)
    if (res.error) setError(res.error); else onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-[#f8f9fb]">
          {/* Top bar */}
          <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h1 className="text-base font-semibold text-gray-900">Nouveau devis</h1>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer">Annuler</button>
              <motion.button onClick={handleSubmit} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2">
                {saving ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                Créer le devis
              </motion.button>
            </div>
          </div>

          <div className="flex h-[calc(100vh-56px)] overflow-hidden">
            {/* LEFT — Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto space-y-6">
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

                {/* Header fields */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Titre du devis</label>
                      <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex: Rénovation cuisine"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Client</label>
                      <div className="flex gap-2">
                        <select value={clientId} onChange={(e) => {
                          setClientId(e.target.value)
                          const c = clients.find((x) => x.id === e.target.value) as Record<string, string> | undefined
                          if (c) { const parts = [c.adresse_chantier, c.ville_chantier, c.code_postal_chantier].filter(Boolean); if (parts.length) setAdresseChantier(parts.join(', ')) }
                        }}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all cursor-pointer">
                          <option value="">— Client —</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowNewClient(!showNewClient)} title="Nouveau client"
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${showNewClient ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-400 hover:text-[#1a9e52] hover:border-[#1a9e52]'}`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick client creation */}
                  {showNewClient && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="border border-[#1a9e52]/20 bg-emerald-50/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-[#1a9e52] uppercase tracking-wider">Nouveau client</div>
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                          <button type="button" onClick={() => setNewType('particulier')} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${newType === 'particulier' ? 'bg-white text-[#1a9e52] shadow-sm' : 'text-gray-500'}`}>Particulier</button>
                          <button type="button" onClick={() => setNewType('societe')} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${newType === 'societe' ? 'bg-white text-[#1a9e52] shadow-sm' : 'text-gray-500'}`}>Société</button>
                        </div>
                      </div>
                      {newType === 'societe' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={newRaisonSociale} onChange={(e) => setNewRaisonSociale(e.target.value)} placeholder="Raison sociale *"
                            className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom contact"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="tel" value={newTel} onChange={(e) => setNewTel(e.target.value)} placeholder="Téléphone"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="text" value={newVille} onChange={(e) => setNewVille(e.target.value)} placeholder="Ville"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prénom"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom *"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="tel" value={newTel} onChange={(e) => setNewTel(e.target.value)} placeholder="Téléphone"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                          <input type="text" value={newVille} onChange={(e) => setNewVille(e.target.value)} placeholder="Ville"
                            className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowNewClient(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer">Annuler</button>
                        <button type="button" onClick={handleCreateClient} disabled={creatingClient || (newType === 'societe' ? !newRaisonSociale : !newNom)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer">
                          {creatingClient ? 'Création...' : 'Créer et sélectionner'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Adresse chantier */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Adresse du chantier</label>
                  <input type="text" value={adresseChantier} onChange={(e) => setAdresseChantier(e.target.value)}
                    placeholder="12 rue des Artisans, 95000 Cergy"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
                  <p className="text-[11px] text-gray-400 mt-1">Pre-rempli depuis la fiche client si disponible</p>
                </div>

                {/* TVA selector — 4 boutons incluant Autoliquidation */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Taux de TVA</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TVA_OPTIONS.map((o) => (
                      <button key={o.value} type="button" onClick={() => { setTvaPct(o.value); setAutoliquidation(false) }}
                        className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                          !autoliquidation && tvaPct === o.value ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {o.label}
                        <span className="block text-[10px] font-normal mt-0.5 opacity-60">{o.tag}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setAutoliquidation(true)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        autoliquidation ? 'border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}>
                      0%
                      <span className="block text-[10px] font-normal mt-0.5 opacity-60">Autoliquid.</span>
                    </button>
                  </div>
                  {autoliquidation && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span><strong>Autoliquidation TVA</strong> — Article 283-2 nonies du CGI. TVA due par le preneur assujetti. La mention légale sera ajoutée automatiquement sur le devis et le PDF.</span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dates</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Date du devis</label>
                      <input type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Date de validité</label>
                      <input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                    </div>
                  </div>
                </div>

                {/* Mentions légales automatiques */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Mentions légales automatiques</div>
                  <ul className="text-[11px] text-gray-500 space-y-1">
                    <li>Devis valable jusqu'au {dateValidite ? new Date(dateValidite).toLocaleDateString('fr-FR') : '—'}.</li>
                    <li>Pénalités de retard : 3x le taux d'intérêt légal. Indemnité forfaitaire : 40 €.</li>
                    {autoliquidation && <li className="text-amber-700 font-medium">Autoliquidation de la TVA - Article 283-2 nonies du CGI.</li>}
                    <li>Délai de rétractation : 14 jours (contrats hors établissement).</li>
                  </ul>
                </div>

                {/* Lignes de travaux */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lignes de travaux</label>
                    <button type="button" onClick={addLigne} className="flex items-center gap-1.5 text-sm font-medium text-[#1a9e52] hover:text-emerald-700 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Ajouter
                    </button>
                  </div>

                  <div className="hidden sm:grid grid-cols-[3fr_80px_80px_100px_100px_40px] gap-2 mb-2 px-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Désignation</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Qté</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Unité</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">PU HT</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase text-right">Total HT</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {lignes.map((l, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-[3fr_80px_80px_100px_100px_40px] gap-2 items-start bg-gray-50/50 rounded-xl p-2 border border-gray-100">
                        <textarea value={l.description} onChange={(e) => { updateLigne(i, 'description', e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(160, Math.max(72, e.target.scrollHeight)) + 'px' }}
                          placeholder="Ex: Pose carrelage 60x60 salle de bain, preparation support, joints epoxy, fourniture comprise..." rows={3}
                          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[14px] leading-5 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all resize-vertical min-h-[72px] max-h-[160px]" />
                        <input type="number" value={l.quantite || ''} onChange={(e) => updateLigne(i, 'quantite', e.target.value)} min={0} step="any"
                          className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
                        <select value={l.unite} onChange={(e) => updateLigne(i, 'unite', e.target.value)}
                          className="px-1 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all cursor-pointer">
                          {['u', 'm²', 'ml', 'm³', 'h', 'j', 'forfait', 'kg', 'lot'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={l.prix_unitaire || ''} onChange={(e) => updateLigne(i, 'prix_unitaire', e.target.value)} min={0} step="any" placeholder="0,00"
                          className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
                        <span className="text-sm font-semibold text-[#1a9e52] text-right tabular-nums">{fmt(l.total_ht)}</span>
                        <button type="button" onClick={() => removeLigne(i)} disabled={lignes.length <= 1}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total HT</span><span className="font-medium text-gray-900 tabular-nums">{fmt(totalHT)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">TVA {tvaPct} %</span><span className="font-medium text-gray-900 tabular-nums">{fmt(totalTVA)}</span></div>
                    <div className="flex justify-between text-lg pt-3 border-t border-gray-200"><span className="font-bold text-gray-900">Total TTC</span><span className="font-bold text-[#1a9e52] tabular-nums">{fmt(totalTTC)}</span></div>
                    {autoliquidation && <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">Autoliquidation TVA - Art. 283-2 nonies du CGI. TVA due par le preneur assujetti.</div>}
                  </div>
                </div>
              </form>
            </div>

            {/* RIGHT — Live preview */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="hidden xl:flex w-[380px] border-l border-gray-200 bg-white flex-col flex-shrink-0">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aperçu en direct</span>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm text-[11px] leading-relaxed">
                  {/* Preview header */}
                  <div className="bg-gradient-to-r from-[#1a9e52] to-[#0e7a3c] p-4 text-white">
                    <div className="flex justify-between items-start">
                      <div><div className="font-bold text-sm">{entreprise}</div>{user?.user_metadata?.siret && <div className="text-emerald-200 text-[10px] mt-0.5">SIRET : {user.user_metadata.siret}</div>}</div>
                      <div className="text-right"><div className="font-mono font-bold text-[10px]">DE-{new Date().getFullYear()}-XXXX</div><div className="text-emerald-200 text-[10px]">{new Date().toLocaleDateString('fr-FR')}</div></div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Client */}
                    {selectedClient && (
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Destinataire</div>
                        <div className="font-semibold text-gray-900">{selectedClient.prenom} {selectedClient.nom}</div>
                        {selectedClient.adresse && <div className="text-gray-500">{selectedClient.adresse}</div>}
                        {selectedClient.ville && <div className="text-gray-500">{selectedClient.code_postal} {selectedClient.ville}</div>}
                      </div>
                    )}
                    {titre && <div className="font-bold text-gray-900 text-xs">{titre}</div>}

                    {/* Lines table */}
                    {lignes.some((l) => l.description) && (
                      <table className="w-full">
                        <thead><tr className="border-b border-gray-200">
                          <th className="text-left py-1 text-[9px] text-gray-400 uppercase">Désig.</th>
                          <th className="text-center py-1 text-[9px] text-gray-400 uppercase">Qté</th>
                          <th className="text-right py-1 text-[9px] text-gray-400 uppercase">PU</th>
                          <th className="text-right py-1 text-[9px] text-gray-400 uppercase">Total</th>
                        </tr></thead>
                        <tbody>
                          {lignes.filter((l) => l.description).map((l, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="py-1 text-gray-800 max-w-[120px] truncate">{l.description}</td>
                              <td className="py-1 text-center text-gray-500">{l.quantite} {l.unite}</td>
                              <td className="py-1 text-right text-gray-500">{fmt(l.prix_unitaire)}</td>
                              <td className="py-1 text-right font-medium text-gray-900">{fmt(l.total_ht)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-2.5 space-y-1">
                      <div className="flex justify-between"><span className="text-gray-400">Total HT</span><span className="font-medium tabular-nums">{fmt(totalHT)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">TVA {tvaPct}%</span><span className="font-medium tabular-nums">{fmt(totalTVA)}</span></div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 text-xs"><span className="font-bold text-gray-900">Total TTC</span><span className="font-bold text-[#1a9e52] tabular-nums">{fmt(totalTTC)}</span></div>
                    </div>

                    {/* Signature zones */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div><div className="text-[9px] text-gray-400 mb-1">Signature artisan</div><div className="h-10 border border-dashed border-gray-200 rounded-lg" /></div>
                      <div><div className="text-[9px] text-gray-400 mb-1">Bon pour accord</div><div className="h-10 border border-dashed border-gray-200 rounded-lg" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
