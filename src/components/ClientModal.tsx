import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client, ClientForm } from '../hooks/useClients'

interface Props {
  open: boolean
  client: Client | null
  onClose: () => void
  onSubmit: (form: ClientForm) => Promise<{ error: string | null }>
}

const empty: ClientForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  adresse: '',
  ville: '',
  code_postal: '',
  siret: '',
  entreprise: '',
}

export default function ClientModal({ open, client, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<ClientForm>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!client

  useEffect(() => {
    if (client) {
      setForm({
        nom: client.nom ?? '',
        prenom: client.prenom ?? '',
        email: client.email ?? '',
        telephone: client.telephone ?? '',
        adresse: client.adresse ?? '',
        ville: client.ville ?? '',
        code_postal: client.code_postal ?? '',
        siret: client.siret ?? '',
        entreprise: client.entreprise ?? '',
      })
    } else {
      setForm(empty)
    }
    setError('')
  }, [client, open])

  function set(key: keyof ClientForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await onSubmit(form)
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  const fields: { key: keyof ClientForm; label: string; type: string; required: boolean; span?: 2 }[] = [
    { key: 'prenom', label: 'Prénom', type: 'text', required: true },
    { key: 'nom', label: 'Nom', type: 'text', required: true },
    { key: 'entreprise', label: 'Entreprise', type: 'text', required: false, span: 2 },
    { key: 'email', label: 'Email', type: 'email', required: false },
    { key: 'telephone', label: 'Téléphone', type: 'tel', required: false },
    { key: 'adresse', label: 'Adresse', type: 'text', required: false, span: 2 },
    { key: 'ville', label: 'Ville', type: 'text', required: false },
    { key: 'code_postal', label: 'Code postal', type: 'text', required: false },
    { key: 'siret', label: 'SIRET', type: 'text', required: false, span: 2 },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEdit ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {f.label}
                      {f.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={form[f.key] as string}
                      onChange={(e) => set(f.key, e.target.value)}
                      required={f.required}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
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
                  ) : isEdit ? (
                    'Enregistrer'
                  ) : (
                    'Créer le client'
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
