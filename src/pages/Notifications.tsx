import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

function toNum(v: unknown): number { if (v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isNaN(n) ? 0 : n }
function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

interface Relance { id: string; numero: string; montant_ttc: number; statut: string; created_at: string; client_display: string; jours: number }

export default function Notifications() {
  const { user } = useAuthStore()
  const [relances, setRelances] = useState<Relance[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  const fetchRelances = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: factures } = await supabase.from('factures').select('id, numero, montant_ttc, statut, created_at, client_id').eq('user_id', user.id).eq('statut', 'impayee')
    const rows = factures ?? []
    const clientIds = [...new Set(rows.map((f) => f.client_id).filter(Boolean))]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
      for (const c of clients ?? []) clientMap[c.id] = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }
    const now = Date.now()
    setRelances(rows.map((f) => ({
      ...f, montant_ttc: toNum(f.montant_ttc),
      client_display: f.client_id ? clientMap[f.client_id] ?? '' : '',
      jours: Math.floor((now - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    })).sort((a, b) => b.jours - a.jours))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRelances() }, [fetchRelances])

  async function sendRelance(id: string) {
    setSending(id)
    // Placeholder: In production, call Resend API via Supabase Edge Function
    await new Promise((r) => setTimeout(r, 1000))
    setSending(null)
  }

  const totalImpaye = relances.reduce((s, r) => s + r.montant_ttc, 0)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications & relances</h1>
        <p className="text-gray-500 text-sm mt-0.5">{relances.length} factures impayées &middot; Total : {fmt(totalImpaye)}</p>
      </motion.div>

      {/* Alert banner */}
      {relances.filter((r) => r.jours > 30).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="text-sm text-red-700 font-medium">{relances.filter((r) => r.jours > 30).length} facture(s) impayée(s) depuis plus de 30 jours</span>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6"><div className="h-40 bg-gray-50 rounded-xl animate-pulse" /></div>
        : relances.length === 0 ? <div className="text-center py-16"><div className="text-4xl mb-3">🎉</div><p className="text-sm text-gray-500">Aucune facture impayée — tout est à jour !</p></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100">
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Facture</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Client</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-3">Montant</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Retard</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-3">Action</th>
        </tr></thead><tbody>
          {relances.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-6 py-4"><span className="text-sm font-mono font-medium text-gray-900">{r.numero}</span></td>
              <td className="px-6 py-4 text-sm text-gray-700">{r.client_display || '—'}</td>
              <td className="px-6 py-4 text-right"><span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(r.montant_ttc)}</span></td>
              <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.jours > 30 ? 'bg-red-50 text-red-600' : r.jours > 14 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{r.jours}j</span></td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => sendRelance(r.id)} disabled={sending === r.id}
                  className="px-3 py-1.5 text-xs font-semibold text-[#1a9e52] border border-[#1a9e52]/30 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                  {sending === r.id ? 'Envoi...' : 'Relancer'}
                </button>
              </td>
            </tr>
          ))}
        </tbody></table></div>}
      </motion.div>
    </div>
  )
}
