import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Client } from '../hooks/useClients'
import type { DevisCreatePayload, DevisLigne } from '../hooks/useDevis'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: DevisCreatePayload) => Promise<{ error: string | null }>
}

const TVA_OPTIONS = [
  { value: 5.5, label: '5,5 %' },
  { value: 10, label: '10 %' },
  { value: 20, label: '20 %' },
]

const emptyLigne = (): Omit<DevisLigne, 'id' | 'devis_id'> => ({
  designation: '',
  quantite: 1,
  unite: 'u',
  prix_unitaire: 0,
  montant_ht: 0,
})

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n)
}

export default function DevisModal({ open, onClose, onSubmit }: Props) {
  const { user } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [titre, setTitre] = useState('')
  const [clientId, setClientId] = useState('')
  const [tvaPct, setTvaPct] = useState(20)
  const [lignes, setLignes] = useState<Omit<DevisLigne, 'id' | 'devis_id'>[]>([emptyLigne()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchClients = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('id, nom, prenom, entreprise')
      .eq('user_id', user.id)
      .order('nom')
    setClients((data as Client[]) ?? [])
  }, [user])

  useEffect(() => {
    if (open) {
      fetchClients()
      setTitre('')
      setClientId('')
      setTvaPct(20)
      setLignes([emptyLigne()])
      setError('')
    }
  }, [open, fetchClients])

  function updateLigne(i: number, field: string, raw: string) {
    setLignes((prev) => {
      const next = [...prev]
      const l = { ...next[i], [field]: field === 'designation' || field === 'unite' ? raw : parseFloat(raw) || 0 }
      l.montant_ht = Math.round(l.quantite * l.prix_unitaire * 100) / 100
      next[i] = l
      return next
    })
  }

  function addLigne() {
    setLignes((p) => [...p, emptyLigne()])
  }

  function removeLigne(i: number) {
    setLignes((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)))
  }

  const totalHT = lignes.reduce((s, l) => s + l.montant_ht, 0)
  const totalTVA = Math.round(totalHT * (tvaPct / 100) * 100) / 100
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100

  const selectedClient = clients.find((c) => c.id === clientId)
  const clientNom = selectedClient
    ? `${selectedClient.prenom ?? ''} ${selectedClient.nom ?? ''}`.trim() +
      (selectedClient.entreprise ? ` — ${selectedClient.entreprise}` : '')
    : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lignes.every((l) => !l.designation)) {
      setError('Ajoutez au moins une ligne de travaux')
      return
    }
    setSaving(true)
    setError('')
    const res = await onSubmit({
      titre,
      client_id: clientId || null,
      client_nom: clientNom,
      tva_pct: tvaPct,
      lignes: lignes.filter((l) => l.designation),
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau devis</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
              )}

              {/* Infos devis */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre du devis</label>
                  <input
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder="Ex: Rénovation cuisine Mme Dupont"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">TVA</label>
                  <select
                    value={tvaPct}
                    onChange={(e) => setTvaPct(parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all cursor-pointer"
                  >
                    {TVA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all cursor-pointer"
                >
                  <option value="">— Sélectionner un client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}{c.entreprise ? ` — ${c.entreprise}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lignes de travaux */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Lignes de travaux</label>
                  <button
                    type="button"
                    onClick={addLigne}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#1a9e52] hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter une ligne
                  </button>
                </div>

                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_70px_60px_100px_90px_32px] gap-2 mb-2 px-1">
                  <span className="text-xs font-medium text-gray-400 uppercase">Désignation</span>
                  <span className="text-xs font-medium text-gray-400 uppercase">Qté</span>
                  <span className="text-xs font-medium text-gray-400 uppercase">Unité</span>
                  <span className="text-xs font-medium text-gray-400 uppercase">PU HT</span>
                  <span className="text-xs font-medium text-gray-400 uppercase text-right">Total HT</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {lignes.map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_70px_60px_100px_90px_32px] gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={l.designation}
                        onChange={(e) => updateLigne(i, 'designation', e.target.value)}
                        placeholder="Désignation"
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
                      />
                      <input
                        type="number"
                        value={l.quantite || ''}
                        onChange={(e) => updateLigne(i, 'quantite', e.target.value)}
                        min={0}
                        step="any"
                        className="px-2 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
                      />
                      <select
                        value={l.unite}
                        onChange={(e) => updateLigne(i, 'unite', e.target.value)}
                        className="px-1 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all cursor-pointer"
                      >
                        <option value="u">u</option>
                        <option value="m²">m²</option>
                        <option value="ml">ml</option>
                        <option value="m³">m³</option>
                        <option value="h">h</option>
                        <option value="j">j</option>
                        <option value="f">f</option>
                        <option value="kg">kg</option>
                        <option value="lot">lot</option>
                      </select>
                      <input
                        type="number"
                        value={l.prix_unitaire || ''}
                        onChange={(e) => updateLigne(i, 'prix_unitaire', e.target.value)}
                        min={0}
                        step="any"
                        placeholder="0,00"
                        className="px-2 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
                      />
                      <span className="text-sm font-medium text-gray-900 text-right tabular-nums">
                        {fmt(l.montant_ht)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLigne(i)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-30"
                        disabled={lignes.length <= 1}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total HT</span>
                  <span className="font-medium text-gray-900 tabular-nums">{fmt(totalHT)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA ({tvaPct} %)</span>
                  <span className="font-medium text-gray-900 tabular-nums">{fmt(totalTVA)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total TTC</span>
                  <span className="font-bold text-[#1a9e52] tabular-nums text-lg">{fmt(totalTTC)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <svg className="animate-spin h-4 w-4 mx-auto text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    'Créer le devis'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
