import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

interface SousTraitant { id: string; nom: string; entreprise: string; metier: string; email: string; telephone: string; siret: string; user_id: string; created_at: string }

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } }

export default function SousTraitants() {
  const { user } = useAuthStore()
  const [list, setList] = useState<SousTraitant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('sous_traitants').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setList(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const filtered = list.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return [s.nom, s.entreprise, s.metier, s.email].some((v) => (v ?? '').toLowerCase().includes(q))
  })

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sous-traitants</h1>
          <p className="text-gray-500 text-sm mt-0.5">{list.length} sous-traitant{list.length !== 1 ? 's' : ''}</p></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16"><p className="text-sm text-gray-500">Aucun sous-traitant</p></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100">
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Nom</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Entreprise</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Métier</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Contact</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">SIRET</th>
        </tr></thead><motion.tbody variants={container} initial="hidden" animate="show">
          {filtered.map((s) => (
            <motion.tr key={s.id} variants={row} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-6 py-4"><div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E40AF] to-blue-400 flex items-center justify-center text-white text-xs font-bold">{(s.nom?.[0] ?? '?').toUpperCase()}</div>
                <span className="text-sm font-medium text-gray-900">{s.nom}</span>
              </div></td>
              <td className="px-6 py-4 text-sm text-gray-700">{s.entreprise || '—'}</td>
              <td className="px-6 py-4"><span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{s.metier || '—'}</span></td>
              <td className="px-6 py-4"><div className="text-sm text-gray-700">{s.email || '—'}</div><div className="text-xs text-gray-400">{s.telephone || '—'}</div></td>
              <td className="px-6 py-4 text-xs text-gray-400 font-mono">{s.siret || '—'}</td>
            </motion.tr>
          ))}
        </motion.tbody></table></div>}
      </motion.div>
    </div>
  )
}
