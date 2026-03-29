import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client, ClientForm } from '../hooks/useClients'
import { uploadFile } from '../lib/storage'
import { searchSiret } from '../lib/siret'

interface Props {
  open: boolean
  client: Client | null
  onClose: () => void
  onSubmit: (form: ClientForm) => Promise<{ error: string | null }>
}

const empty: ClientForm = {
  nom: '', prenom: '', email: '', telephone: '', adresse: '', ville: '', code_postal: '',
  siret: '', entreprise: '', type_client: 'particulier', raison_sociale: '', nom_contact: '',
  tva_intracom: '', adresse_chantier: '', ville_chantier: '', code_postal_chantier: '', notes: '', logo_url: '',
}

const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all'

export default function ClientModal({ open, client, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<ClientForm>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [searchingSiret, setSearchingSiret] = useState(false)
  const [siretFound, setSiretFound] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = !!client

  useEffect(() => {
    if (client) {
      setForm({ ...empty, ...Object.fromEntries(Object.entries(client).filter(([, v]) => v != null).map(([k, v]) => [k, v ?? ''])) } as ClientForm)
    } else {
      setForm(empty)
    }
    setError('')
  }, [client, open])

  function set(key: keyof ClientForm, value: string) { setForm((f) => ({ ...f, [key]: value })) }
  const isSociete = form.type_client === 'societe'

  async function handleSiretSearch() {
    const val = form.siret.replace(/\s/g, '')
    if (val.length < 9) return
    setSearchingSiret(true); setSiretFound(false)
    const r = await searchSiret(val)
    if (r) {
      setForm((f) => ({
        ...f,
        raison_sociale: r.raisonSociale || f.raison_sociale,
        adresse: r.adresse || f.adresse,
        ville: r.ville || f.ville,
        code_postal: r.codePostal || f.code_postal,
        siret: r.siret || f.siret,
        tva_intracom: r.tvaIntracom || f.tva_intracom,
      }))
      setSiretFound(true)
      setTimeout(() => setSiretFound(false), 4000)
    }
    setSearchingSiret(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `logos/client_${Date.now()}_${file.name}`
    const url = await uploadFile(path, file)
    if (url) set('logo_url', url)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const res = await onSubmit(form); setSaving(false)
    if (res.error) setError(res.error); else onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

              {/* Type tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {[{ key: 'particulier', label: 'Particulier' }, { key: 'societe', label: 'Société' }].map((t) => (
                  <button key={t.key} type="button" onClick={() => set('type_client', t.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      form.type_client === t.key ? 'bg-white text-[#1a9e52] shadow-sm' : 'text-gray-500'
                    }`}>{t.label}</button>
                ))}
              </div>

              {/* Société fields */}
              {isSociete ? (
                <div className="space-y-4">
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Raison sociale <span className="text-red-400">*</span></label>
                    <input type="text" value={form.raison_sociale} onChange={(e) => set('raison_sociale', e.target.value)} required placeholder="SCI Belvédère" className={ic} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom contact</label>
                      <input type="text" value={form.nom_contact} onChange={(e) => set('nom_contact', e.target.value)} placeholder="Jean Dupont" className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Téléphone</label>
                      <input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={ic} /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Adresse siège</label>
                    <input type="text" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} className={ic} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Ville</label>
                      <input type="text" value={form.ville} onChange={(e) => set('ville', e.target.value)} className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Code postal</label>
                      <input type="text" value={form.code_postal} onChange={(e) => set('code_postal', e.target.value)} className={ic} /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">SIRET</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.siret} onChange={(e) => set('siret', e.target.value)} maxLength={17} placeholder="123 456 789 00012" className={ic + ' font-mono flex-1'} />
                      <button type="button" onClick={handleSiretSearch} disabled={searchingSiret || form.siret.replace(/\s/g, '').length < 9}
                        className="px-3 py-2.5 text-xs font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0 flex items-center gap-1.5">
                        {searchingSiret ? (
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                        Rechercher
                      </button>
                    </div>
                    {siretFound ? (
                      <p className="text-[11px] text-[#1a9e52] font-semibold mt-1">Informations trouvees — champs pre-remplis</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1">Pre-remplit raison sociale et adresse automatiquement</p>
                    )}
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">TVA intracommunautaire</label>
                    <input type="text" value={form.tva_intracom} onChange={(e) => set('tva_intracom', e.target.value)} placeholder="FR12345678901" className={ic} /></div>
                </div>
              ) : (
                /* Particulier fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Prénom <span className="text-red-400">*</span></label>
                      <input type="text" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} required className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom <span className="text-red-400">*</span></label>
                      <input type="text" value={form.nom} onChange={(e) => set('nom', e.target.value)} required className={ic} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Email</label>
                      <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Téléphone</label>
                      <input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={ic} /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Adresse</label>
                    <input type="text" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} className={ic} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Ville</label>
                      <input type="text" value={form.ville} onChange={(e) => set('ville', e.target.value)} className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Code postal</label>
                      <input type="text" value={form.code_postal} onChange={(e) => set('code_postal', e.target.value)} className={ic} /></div>
                  </div>
                </div>
              )}

              {/* Adresse chantier */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-400 uppercase">Adresse chantier (si différente)</div>
                <input type="text" value={form.adresse_chantier} onChange={(e) => set('adresse_chantier', e.target.value)} placeholder="Adresse du chantier"
                  className={ic} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={form.ville_chantier} onChange={(e) => set('ville_chantier', e.target.value)} placeholder="Ville chantier" className={ic} />
                  <input type="text" value={form.code_postal_chantier} onChange={(e) => set('code_postal_chantier', e.target.value)} placeholder="Code postal" className={ic} />
                </div>
              </div>

              {/* Logo client */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Logo client</label>
                <div className="flex items-center gap-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    </div>
                  )}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="text-sm font-medium text-[#1a9e52] hover:text-emerald-700 cursor-pointer disabled:opacity-50">
                      {uploading ? 'Upload...' : form.logo_url ? 'Changer le logo' : 'Ajouter un logo'}
                    </button>
                    <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG. Visible sur les devis et factures PDF.</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Notes internes</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Notes sur ce client (non visibles sur les documents)"
                  className={ic + ' resize-none'} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer">Annuler</button>
                <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer">
                  {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le client'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
