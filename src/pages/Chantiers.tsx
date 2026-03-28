import { useState } from 'react'
import { motion } from 'framer-motion'
import { useChantiers } from '../hooks/useChantiers'
import type { Chantier } from '../hooks/useChantiers'

const statutStyle: Record<string, { label: string; cls: string; bar: string }> = {
  planifie: { label: 'Planifié', cls: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-500' },
  en_cours: { label: 'En cours', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-gradient-to-r from-[#1a9e52] to-emerald-400' },
  termine: { label: 'Terminé', cls: 'bg-gray-50 text-gray-600 border-gray-200', bar: 'bg-gray-400' },
  suspendu: { label: 'Suspendu', cls: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
}

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } }

export default function Chantiers() {
  const { chantiers, loading, updateChantier, deleteChantier } = useChantiers()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const enCours = chantiers.filter((c) => c.statut === 'en_cours').length
  const totalBudget = chantiers.reduce((s, c) => s + c.budget_prevu, 0)

  async function handleDelete(id: string) { setDeletingId(id); await deleteChantier(id); setDeletingId(null) }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Chantiers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{chantiers.length} chantiers &middot; {enCours} en cours &middot; Budget : {fmt(totalBudget)}</p>
        </div>
      </motion.div>

      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse" />)}</div>
      : chantiers.length === 0 ? <div className="text-center py-20"><p className="text-gray-500">Aucun chantier</p></div>
      : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {chantiers.map((c) => {
          const st = statutStyle[c.statut] ?? statutStyle.planifie
          const pct = Math.min(100, Math.max(0, c.progression))
          const budgetPct = c.budget_prevu > 0 ? Math.round((c.budget_realise / c.budget_prevu) * 100) : 0
          return (
            <motion.div key={c.id} variants={item} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{c.nom}</h3>
                  {c.client_display && <p className="text-xs text-gray-400 mt-0.5">{c.client_display}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.cls}`}>{st.label}</span>
              </div>
              {c.adresse && <p className="text-xs text-gray-500 mb-3">{c.adresse}</p>}

              {/* Progression */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Progression</span><span className="font-medium text-gray-900">{pct}%</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${st.bar}`} style={{ width: `${pct}%` }} /></div>
              </div>

              {/* Budget */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Budget</span><span className={`font-medium ${budgetPct > 100 ? 'text-red-600' : 'text-gray-900'}`}>{budgetPct}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">Prévu : {fmt(c.budget_prevu)}</span><span className="text-gray-400">Réalisé : {fmt(c.budget_realise)}</span></div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                <span>{c.date_debut ? new Date(c.date_debut).toLocaleDateString('fr-FR') : '—'} → {c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '—'}</span>
                <div className="flex gap-1">
                  <select value={c.statut} onChange={(e) => updateChantier(c.id, { statut: e.target.value as Chantier['statut'] })}
                    className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 cursor-pointer">
                    <option value="planifie">Planifié</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="suspendu">Suspendu</option>
                  </select>
                  <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )})}
        </div>}
    </div>
  )
}
