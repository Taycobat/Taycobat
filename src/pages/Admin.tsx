import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useAdmin } from '../hooks/useAdmin'
import { Navigate } from 'react-router-dom'

function fmt(n: number) { return n.toLocaleString('fr-FR') }

function dateFR(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function PlanBadge({ plan }: { plan: string | null }) {
  const map: Record<string, string> = {
    solo: 'bg-blue-100 text-blue-700',
    pro: 'bg-emerald-100 text-emerald-700',
    business: 'bg-purple-100 text-purple-700',
  }
  const label = plan || 'Essai'
  const cls = (plan && map[plan]) || 'bg-gray-100 text-gray-500'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuthStore()
  const { isAdmin, artisans, loading, stats } = useAdmin(user?.email ?? undefined)

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Administration</h1>
        <p className="text-sm text-gray-500 mb-8">Vue d'ensemble des artisans inscrits et revenus</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="MRR" value={`${fmt(stats.mrr)} €`} sub="Revenu mensuel récurrent" color="text-[#1a9e52]" />
        <StatCard label="Artisans inscrits" value={stats.total} color="text-gray-900" />
        <StatCard label="Abonnés actifs" value={stats.actifs} sub={`${stats.solo} Solo · ${stats.pro} Pro · ${stats.business} Biz`} color="text-blue-600" />
        <StatCard label="En essai gratuit" value={stats.trial} color="text-amber-600" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Tous les artisans <span className="text-gray-400 font-normal">({stats.total})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Chargement…</div>
        ) : artisans.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Aucun artisan inscrit</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="px-5 py-3">Artisan</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Inscription</th>
                  <th className="px-5 py-3">Fin d'essai</th>
                  <th className="px-5 py-3">Stripe ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {artisans.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {a.full_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{a.email}</td>
                    <td className="px-5 py-3.5"><PlanBadge plan={a.plan} /></td>
                    <td className="px-5 py-3.5 text-gray-500">{dateFR(a.created_at)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{dateFR(a.trial_ends_at)}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                      {a.stripe_customer_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
