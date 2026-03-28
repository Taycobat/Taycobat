import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Parametres() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const meta = user?.user_metadata ?? {}
  const [prenom, setPrenom] = useState(meta.prenom || '')
  const [nom, setNom] = useState(meta.nom || '')
  const [entreprise, setEntreprise] = useState(meta.entreprise || '')
  const [siret, setSiret] = useState(meta.siret || '')
  const [telephone, setTelephone] = useState(meta.telephone || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { prenom, nom, entreprise, siret, telephone } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Profil et informations de l'entreprise</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Prénom</label>
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>
        </div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Téléphone</label>
          <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Email</label>
          <input type="email" value={user?.email ?? ''} disabled className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500" /></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Entreprise</h2>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom de l'entreprise</label>
          <input type="text" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">SIRET</label>
          <input type="text" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={17} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>

        {saved && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">Paramètres sauvegardés ✓</div>}

        <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Zone dangereuse</h2>
        <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
          Se déconnecter
        </button>
      </motion.div>
    </div>
  )
}
