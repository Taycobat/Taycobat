import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../store/authStore'
import { useDashboardData } from '../hooks/useDashboardData'
import { getDisplayName } from '../lib/user'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function statutBadge(statut: string) {
  const map: Record<string, { label: string; cls: string }> = {
    en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    accepte: { label: 'Accepté', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-600 border-red-200' },
  }
  const s = map[statut] ?? map.en_attente
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  )
}

const kpiConfig = [
  {
    key: 'caMonth' as const,
    label: 'CA du mois',
    link: '/factures',
    format: formatMoney,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'from-[#1a9e52] to-emerald-400',
    bgLight: 'bg-emerald-50',
    textColor: 'text-[#1a9e52]',
  },
  {
    key: 'devisEnAttente' as const,
    label: 'Devis en attente',
    link: '/devis',
    format: (n: number) => String(n),
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-amber-500 to-orange-400',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    key: 'facturesImpayees' as const,
    label: 'Factures impayées',
    link: '/factures',
    format: (n: number) => String(n),
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'from-red-500 to-rose-400',
    bgLight: 'bg-red-50',
    textColor: 'text-red-500',
  },
  {
    key: 'clientsActifs' as const,
    label: 'Clients actifs',
    link: '/clients',
    format: (n: number) => String(n),
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-blue-500 to-indigo-400',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { kpis, recentDevis, recentFactures, caData, loading } = useDashboardData()
  const displayName = getDisplayName(user)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bonjour, {displayName}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Voici le résumé de votre activité
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button onClick={() => navigate('/devis?new=1')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Nouveau devis
          </motion.button>
          <motion.button onClick={() => navigate('/factures?new=1')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            Nouvelle facture
          </motion.button>
          <motion.button onClick={() => navigate('/ia-audio')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Nouveau devis IA
          </motion.button>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
      >
        {kpiConfig.map((kpi) => (
          <motion.div
            key={kpi.key}
            variants={item}
            onClick={() => navigate(kpi.link)}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${kpi.bgLight} flex items-center justify-center ${kpi.textColor}`}>
                {kpi.icon}
              </div>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${kpi.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {loading ? (
                <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                kpi.format(kpis[kpi.key])
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts & Table row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Chiffre d'affaires</h2>
              <p className="text-sm text-gray-400 mt-0.5">6 derniers mois</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded-full bg-[#1a9e52]" />
              CA mensuel
            </div>
          </div>

          {loading ? (
            <div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={caData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a9e52" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#1a9e52" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="mois"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '10px 14px',
                  }}
                  formatter={(value) => [formatMoney(Number(value)), 'CA']}
                  labelStyle={{ color: '#6b7280', fontWeight: 500, marginBottom: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="montant"
                  stroke="#1a9e52"
                  strokeWidth={2.5}
                  fill="url(#caGradient)"
                  dot={{ r: 4, fill: '#1a9e52', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#1a9e52', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
        >
          {/* Factures directes KPI */}
          {kpis.facturesDirectes > 0 && (
            <div className="mb-5 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                </div>
                <div><span className="text-xs font-semibold text-blue-700">{kpis.facturesDirectes} factures directes</span>
                <span className="block text-[11px] text-blue-500">{formatMoney(kpis.facturesDirectesMontant)}</span></div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Dernieres factures</h2>
            <button onClick={() => navigate('/factures')} className="text-sm text-[#1a9e52] hover:text-emerald-700 font-medium transition-colors cursor-pointer">Voir tout</button>
          </div>

          {loading ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : recentFactures.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-1">Aucune facture pour le moment</p>
              <p className="text-xs text-gray-400">Creez une facture depuis un devis ou directement</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFactures.map((f, i) => {
                const factureStatut: Record<string, { label: string; cls: string }> = {
                  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
                  payee: { label: 'Payee', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  impayee: { label: 'Impayee', cls: 'bg-red-50 text-red-600 border-red-200' },
                  envoyee: { label: 'Envoyee', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                }
                const st = factureStatut[f.statut] ?? factureStatut.brouillon
                return (
                  <motion.div key={f.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                    onClick={() => navigate(`/factures/${f.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${f.type === 'directe' ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-emerald-50 group-hover:bg-emerald-100'}`}>
                      <svg className={`w-4 h-4 ${f.type === 'directe' ? 'text-blue-600' : 'text-[#1a9e52]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{f.numero}</span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>{st.label}</span>
                        {f.type === 'directe' && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Directe</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(f.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatMoney(f.montant_ttc)}</span>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Derniers devis */}
          {recentDevis.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-6 mb-4 pt-4 border-t border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Derniers devis</h2>
                <button onClick={() => navigate('/devis')} className="text-sm text-[#1a9e52] hover:text-emerald-700 font-medium transition-colors cursor-pointer">Voir tout</button>
              </div>
              <div className="space-y-3">
                {recentDevis.map((devis, i) => (
                  <motion.div key={devis.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }}
                    onClick={() => navigate(`/devis/${devis.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                      <svg className="w-4 h-4 text-[#1a9e52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{devis.numero}</span>
                        {statutBadge(devis.statut)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(devis.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatMoney(devis.montant_ttc)}</span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
