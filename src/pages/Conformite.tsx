import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { sha256 } from '../lib/conformite'

interface AuditLog {
  id: string; action: string; document_type: string; document_numero: string
  montant_ttc: number; timestamp: string; hash: string; previous_hash: string
}

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) }

export default function Conformite() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [integrity, setIntegrity] = useState<'ok' | 'broken' | null>(null)
  const [stats, setStats] = useState({ devis: 0, factures: 0, total: 0 })

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(50)
    setLogs(data ?? [])

    const { count: dCount } = await supabase.from('devis').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const { count: fCount } = await supabase.from('factures').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    setStats({ devis: dCount ?? 0, factures: fCount ?? 0, total: (dCount ?? 0) + (fCount ?? 0) })
    setLoading(false)
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function verifyChain() {
    setVerifying(true); setIntegrity(null)
    const { data } = await supabase.from('audit_log').select('*').eq('user_id', user!.id).order('timestamp', { ascending: true })
    const entries = data ?? []
    let valid = true
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      const prevHash = i === 0 ? '0' : entries[i - 1].hash
      const payload = `${prevHash}|${e.action}|${e.document_type}|${e.document_numero}|${e.montant_ttc}|${e.timestamp}`
      const expected = await sha256(payload)
      if (expected !== e.hash) { valid = false; break }
    }
    setIntegrity(valid ? 'ok' : 'broken'); setVerifying(false)
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Conformité anti-fraude TVA</h1>
        <p className="text-gray-500 text-sm mt-0.5">NF 525 — Chaîne de hachage SHA-256, inaltérabilité, audit log</p>
      </motion.div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[{ label: 'Documents', value: stats.total, icon: '📄' }, { label: 'Devis', value: stats.devis, icon: '📋' }, { label: 'Factures', value: stats.factures, icon: '🧾' }].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2"><span className="text-2xl">{s.icon}</span><span className="text-sm text-gray-500">{s.label}</span></div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Verify button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <div className="flex items-center justify-between">
          <div><h2 className="text-base font-semibold text-gray-900">Vérification d'intégrité</h2><p className="text-sm text-gray-500 mt-0.5">Vérifie la chaîne de hachage SHA-256 de tous les documents</p></div>
          <div className="flex items-center gap-3">
            {integrity === 'ok' && <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Chaîne intègre ✓</span>}
            {integrity === 'broken' && <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">Rupture détectée ✗</span>}
            <motion.button onClick={verifyChain} disabled={verifying} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer">
              {verifying ? 'Vérification...' : 'Vérifier la chaîne'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Audit log */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-900">Journal d'audit (50 dernières entrées)</h2></div>
        {loading ? <div className="p-6"><div className="h-40 bg-gray-50 rounded-xl animate-pulse" /></div>
        : logs.length === 0 ? <div className="text-center py-12 text-sm text-gray-400">Aucune entrée d'audit</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
          <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase">Date</th>
          <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase">Action</th>
          <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase">Document</th>
          <th className="text-right px-6 py-3 text-xs text-gray-400 uppercase">Montant</th>
          <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase">Hash SHA-256</th>
        </tr></thead><tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-6 py-3 text-gray-500">{new Date(l.timestamp).toLocaleString('fr-FR')}</td>
              <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{l.action}</span></td>
              <td className="px-6 py-3 font-mono text-xs">{l.document_type} {l.document_numero}</td>
              <td className="px-6 py-3 text-right tabular-nums">{fmt(l.montant_ttc)}</td>
              <td className="px-6 py-3 font-mono text-[10px] text-gray-400 truncate max-w-[200px]">{l.hash}</td>
            </tr>
          ))}
        </tbody></table></div>}
      </motion.div>
    </div>
  )
}
