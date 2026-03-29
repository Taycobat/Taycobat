import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { uploadFile } from '../lib/storage'
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
  const [photoUrl, setPhotoUrl] = useState(meta.photo_url || '')
  const [logoUrl, setLogoUrl] = useState(meta.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `photos/artisan_${user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const url = await uploadFile(path, file)
    if (url) setPhotoUrl(url)
    setUploading(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `logos/artisan_${user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const url = await uploadFile(path, file)
    if (url) setLogoUrl(url)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { prenom, nom, entreprise, siret, telephone, photo_url: photoUrl, logo_url: logoUrl } })
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

        {/* Photo profil */}
        <div className="flex items-center gap-5">
          {photoUrl ? (
            <img src={photoUrl} alt="Photo" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a9e52] to-emerald-400 flex items-center justify-center text-white font-bold text-xl">
              {(prenom || nom || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
              className="text-sm font-medium text-[#1a9e52] hover:text-emerald-700 cursor-pointer disabled:opacity-50">
              {uploading ? 'Upload...' : photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            <p className="text-[11px] text-gray-400 mt-0.5">Visible sur vos devis et factures PDF</p>
          </div>
        </div>

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

        {/* Logo entreprise */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Logo de mon entreprise</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </div>
            )}
            <div>
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading}
                className="text-sm font-medium text-[#1a9e52] hover:text-emerald-700 cursor-pointer disabled:opacity-50">
                {uploading ? 'Upload...' : logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
              </button>
              <p className="text-[11px] text-gray-400 mt-0.5">Affiche sur vos devis et factures PDF</p>
            </div>
          </div>
        </div>

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
