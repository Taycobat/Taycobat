import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClients, clientDisplayName } from '../hooks/useClients'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

interface Ligne { description: string; quantite: number; unite: string; prix_unitaire: number }

const TVA_OPTIONS = [
  { label: '5,5%', tag: 'Isolation', value: 5.5 },
  { label: '10%', tag: 'Renovation', value: 10 },
  { label: '20%', tag: 'Standard', value: 20 },
]
const UNITES = ['u', 'm\u00b2', 'ml', 'm\u00b3', 'h', 'j', 'forfait', 'kg', 'lot']

const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all'
const lb = 'block text-xs font-semibold text-gray-400 uppercase mb-1.5'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (params: {
    client_id: string; montant_ht: number; montant_ttc: number; tva_pct: number
    date_emission: string; date_echeance: string; retenue_garantie_pct: number
  }) => Promise<{ error: string | null; id: string | null }>
}

export default function FactureDirecteModal({ open, onClose, onSubmit }: Props) {
  const { user } = useAuthStore()
  const { clients } = useClients()
  const [clientId, setClientId] = useState('')
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().split('T')[0])
  const [dateEcheance, setDateEcheance] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]
  })
  const [tvaPct, setTvaPct] = useState(10)
  const [autoliquidation, setAutoliquidation] = useState(false)
  const [retenue, setRetenue] = useState(0)
  const [lignes, setLignes] = useState<Ligne[]>([{ description: '', quantite: 1, unite: 'u', prix_unitaire: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Inline new client
  const [showNewClient, setShowNewClient] = useState(false)
  const [newType, setNewType] = useState<'particulier' | 'societe'>('particulier')
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newRaisonSociale, setNewRaisonSociale] = useState('')
  const [newTel, setNewTel] = useState('')
  const [newEmail, setNewEmail] = useState('')

  function setLigne(i: number, key: keyof Ligne, val: string | number) {
    setLignes((ls) => ls.map((l, j) => j === i ? { ...l, [key]: val } : l))
  }
  function addLigne() { setLignes((ls) => [...ls, { description: '', quantite: 1, unite: 'u', prix_unitaire: 0 }]) }
  function removeLigne(i: number) { setLignes((ls) => ls.filter((_, j) => j !== i)) }

  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
  const effectiveTva = autoliquidation ? 0 : tvaPct
  const totalTVA = Math.round(totalHT * effectiveTva / 100 * 100) / 100
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100
  const retenueAmount = Math.round(totalTTC * retenue / 100 * 100) / 100

  async function handleCreateClient() {
    if (!user) return
    const payload: Record<string, string> = { user_id: user.id, type_client: newType }
    if (newType === 'particulier') { payload.nom = newNom; payload.prenom = newPrenom }
    else { payload.raison_sociale = newRaisonSociale; payload.nom_contact = newNom }
    if (newTel) payload.telephone = newTel
    if (newEmail) payload.email = newEmail
    const { data } = await supabase.from('clients').insert(payload).select('id').single()
    if (data) {
      setClientId(data.id)
      setShowNewClient(false)
      setNewNom(''); setNewPrenom(''); setNewRaisonSociale(''); setNewTel(''); setNewEmail('')
    }
  }

  async function handleSubmit() {
    if (!clientId) { setError('Selectionnez un client'); return }
    if (lignes.every((l) => !l.description)) { setError('Ajoutez au moins une ligne'); return }
    setSaving(true); setError('')
    const res = await onSubmit({
      client_id: clientId, montant_ht: Math.round(totalHT * 100) / 100,
      montant_ttc: totalTTC, tva_pct: effectiveTva,
      date_emission: dateEmission, date_echeance: dateEcheance,
      retenue_garantie_pct: retenue,
    })
    setSaving(false)
    if (res.error) setError(res.error); else onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Nouvelle facture directe</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

            {/* Client */}
            <div>
              <label className={lb}>Client</label>
              <div className="flex gap-2">
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={ic + ' flex-1 cursor-pointer'}>
                  <option value="">-- Selectionner --</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewClient(!showNewClient)} title="Nouveau client"
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${showNewClient ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-400 hover:text-[#1a9e52] hover:border-[#1a9e52]'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            {/* Inline new client */}
            {showNewClient && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                <div className="flex gap-2">
                  {(['particulier', 'societe'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setNewType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${newType === t ? 'bg-white text-[#1a9e52] shadow-sm border border-[#1a9e52]/20' : 'text-gray-500'}`}>
                      {t === 'particulier' ? 'Particulier' : 'Societe'}
                    </button>
                  ))}
                </div>
                {newType === 'particulier' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prenom" className={ic} />
                    <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom *" className={ic} />
                  </div>
                ) : (
                  <input type="text" value={newRaisonSociale} onChange={(e) => setNewRaisonSociale(e.target.value)} placeholder="Raison sociale *" className={ic} />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input type="tel" value={newTel} onChange={(e) => setNewTel(e.target.value)} placeholder="Telephone" className={ic} />
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className={ic} />
                </div>
                <button type="button" onClick={handleCreateClient}
                  className="w-full py-2 rounded-xl bg-[#1a9e52] text-white text-sm font-semibold cursor-pointer hover:bg-emerald-700 transition-colors">
                  Creer le client
                </button>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lb}>Date facture</label>
                <input type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} className={ic} /></div>
              <div><label className={lb}>Date echeance</label>
                <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} className={ic} /></div>
            </div>

            {/* TVA */}
            <div>
              <label className={lb}>TVA</label>
              <div className="grid grid-cols-4 gap-2">
                {TVA_OPTIONS.map((t) => (
                  <button key={t.value} type="button" onClick={() => { setTvaPct(t.value); setAutoliquidation(false) }}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${!autoliquidation && tvaPct === t.value ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52] ring-2 ring-emerald-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {t.label}<span className="block text-[10px] font-normal mt-0.5 opacity-60">{t.tag}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setAutoliquidation(true)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${autoliquidation ? 'border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  0%<span className="block text-[10px] font-normal mt-0.5 opacity-60">Autoliquid.</span>
                </button>
              </div>
              {autoliquidation && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  Autoliquidation TVA — Art. 283-2 nonies du CGI. TVA due par le preneur assujetti.
                </div>
              )}
            </div>

            {/* Retenue de garantie */}
            <div>
              <label className={lb}>Retenue de garantie (%)</label>
              <input type="number" value={retenue} onChange={(e) => setRetenue(parseFloat(e.target.value) || 0)} min={0} max={10} className={ic + ' max-w-[120px]'} />
            </div>

            {/* Lignes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={lb + ' mb-0'}>Lignes de travaux</label>
                <button type="button" onClick={addLigne} className="text-xs font-semibold text-[#1a9e52] hover:text-emerald-700 cursor-pointer">+ Ajouter une ligne</button>
              </div>
              <div className="space-y-3">
                {lignes.map((l, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input type="text" value={l.description} onChange={(e) => setLigne(i, 'description', e.target.value)} placeholder="Description" className={ic + ' flex-1'} />
                    <input type="number" value={l.quantite} onChange={(e) => setLigne(i, 'quantite', parseFloat(e.target.value) || 0)} min={0} className={ic + ' w-16 text-center'} />
                    <select value={l.unite} onChange={(e) => setLigne(i, 'unite', e.target.value)} className={ic + ' w-20 cursor-pointer'}>
                      {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" value={l.prix_unitaire} onChange={(e) => setLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)} min={0} step={0.01} placeholder="P.U." className={ic + ' w-24'} />
                    <div className="w-20 py-2.5 text-right text-sm font-medium text-gray-700">{(l.quantite * l.prix_unitaire).toFixed(2)}</div>
                    {lignes.length > 1 && (
                      <button type="button" onClick={() => removeLigne(i)} className="p-2 text-gray-300 hover:text-red-500 cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>Total HT</span><span className="font-medium">{totalHT.toFixed(2)} EUR</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>TVA {effectiveTva}%</span><span className="font-medium">{totalTVA.toFixed(2)} EUR</span></div>
              {retenue > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Retenue garantie {retenue}%</span><span className="font-medium">-{retenueAmount.toFixed(2)} EUR</span></div>}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold text-[#1a9e52]">
                <span>Total TTC</span><span>{totalTTC.toFixed(2)} EUR</span>
              </div>
              {retenue > 0 && (
                <div className="flex justify-between text-sm font-semibold text-gray-900"><span>Net a payer</span><span>{(totalTTC - retenueAmount).toFixed(2)} EUR</span></div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer">Annuler</button>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={saving} onClick={handleSubmit}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer">
                {saving ? 'Creation...' : 'Creer la facture'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
