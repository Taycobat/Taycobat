import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Colonnes réelles de audit_log : id, user_id, action, table_name, record_id, details, created_at
interface AuditLog {
  id: string
  action: string
  table_name: string
  record_id: string
  details: string
  created_at: string
}

const actionStyle: Record<string, string> = {
  create: 'bg-blue-50 text-blue-700',
  update: 'bg-blue-50 text-blue-700',
  delete: 'bg-red-50 text-red-600',
}

export default function Conformite() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ devis: 0, factures: 0, clients: 0, total: 0 })

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [{ data: logsData }, { count: dCount }, { count: fCount }, { count: cCount }] = await Promise.all([
      supabase.from('audit_log').select('id, action, table_name, record_id, details, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('devis').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    setLogs(logsData ?? [])
    const total = (dCount ?? 0) + (fCount ?? 0) + (cCount ?? 0)
    setStats({ devis: dCount ?? 0, factures: fCount ?? 0, clients: cCount ?? 0, total })
    setLoading(false)
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Conformité & journal d'audit</h1>
        <p className="text-gray-500 text-sm mt-0.5">Traçabilité complète — chaque action est enregistrée</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total documents', value: stats.total, icon: '📄' },
          { label: 'Devis', value: stats.devis, icon: '📋' },
          { label: 'Factures', value: stats.factures, icon: '🧾' },
          { label: 'Clients', value: stats.clients, icon: '👤' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm text-gray-500">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Audit log entries count */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Journal d'audit</h2>
            <p className="text-sm text-gray-500 mt-0.5">{logs.length} entrée{logs.length !== 1 ? 's' : ''} enregistrée{logs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Créations', count: logs.filter((l) => l.action === 'create').length, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Modifications', count: logs.filter((l) => l.action === 'update').length, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Suppressions', count: logs.filter((l) => l.action === 'delete').length, cls: 'bg-red-50 text-red-600' },
            ].map((p) => <span key={p.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.cls}`}>{p.count} {p.label}</span>)}
          </div>
        </div>
      </motion.div>

      {/* Log table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><div className="h-40 bg-gray-50 rounded-xl animate-pulse" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500 mb-1">Aucune entrée d'audit</p>
            <p className="text-xs text-gray-400">Les actions sur les devis, factures et clients seront enregistrées ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">Date</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">Action</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">Table</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">Détails</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">ID</th>
              </tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionStyle[l.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-6 py-3"><span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{l.table_name}</span></td>
                    <td className="px-6 py-3 text-gray-700 max-w-[400px] truncate">{l.details}</td>
                    <td className="px-6 py-3 font-mono text-[10px] text-gray-400 truncate max-w-[120px]">{l.record_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
