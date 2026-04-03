import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useChantiers } from '../hooks/useChantiers'

const COLORS = ['bg-[#1E40AF]', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']

export default function Planning() {
  const { chantiers, loading } = useChantiers()

  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const totalDays = 90
  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate); d.setDate(d.getDate() + i); return d
  })

  const months = useMemo(() => {
    const m: { label: string; span: number }[] = []
    let cur = ''; let count = 0
    for (const d of days) {
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      if (label !== cur) { if (cur) m.push({ label: cur, span: count }); cur = label; count = 1 }
      else count++
    }
    if (cur) m.push({ label: cur, span: count })
    return m
  }, [days])

  function dayIndex(date: string | null) {
    if (!date) return -1
    const d = new Date(date)
    return Math.round((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Planning</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vue Gantt des chantiers — 3 prochains mois</p>
      </motion.div>

      {loading ? <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" /> : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: totalDays * 28 + 200 }}>
              {/* Month headers */}
              <div className="flex border-b border-gray-100">
                <div className="w-[200px] flex-shrink-0 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Chantier</div>
                <div className="flex-1 flex">
                  {months.map((m, i) => (
                    <div key={i} style={{ width: m.span * 28 }} className="px-2 py-2 text-xs font-semibold text-gray-500 border-l border-gray-100">{m.label}</div>
                  ))}
                </div>
              </div>

              {/* Week numbers */}
              <div className="flex border-b border-gray-50">
                <div className="w-[200px] flex-shrink-0" />
                <div className="flex-1 flex">
                  {days.map((d, i) => (
                    <div key={i} style={{ width: 28 }} className={`text-center text-[10px] py-1 ${
                      d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50 text-gray-300' : 'text-gray-400'
                    } ${d.toDateString() === today.toDateString() ? 'bg-blue-50 text-[#1E40AF] font-bold' : ''}`}>
                      {d.getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chantier rows */}
              {chantiers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">Aucun chantier à planifier</div>
              ) : chantiers.map((c, ci) => {
                const start = dayIndex(c.date_debut)
                const end = dayIndex(c.date_fin)
                const barStart = Math.max(0, start)
                const barEnd = Math.min(totalDays - 1, end >= 0 ? end : totalDays - 1)
                const hasBar = start >= 0 || end >= 0

                return (
                  <div key={c.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                    <div className="w-[200px] flex-shrink-0 px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate">{c.nom}</div>
                      <div className="text-xs text-gray-400">{c.client_display || '—'}</div>
                    </div>
                    <div className="flex-1 flex items-center relative" style={{ height: 40 }}>
                      {days.map((d, i) => (
                        <div key={i} style={{ width: 28 }} className={`h-full ${
                          d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/50' : ''
                        } ${d.toDateString() === today.toDateString() ? 'border-l-2 border-[#1E40AF]' : ''}`} />
                      ))}
                      {hasBar && barStart <= barEnd && (
                        <div className={`absolute top-2 h-6 rounded-full ${COLORS[ci % COLORS.length]} opacity-80`}
                          style={{ left: barStart * 28 + 2, width: Math.max(20, (barEnd - barStart + 1) * 28 - 4) }}>
                          <span className="text-[10px] text-white font-medium px-2 leading-6 truncate block">{c.nom}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
