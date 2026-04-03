import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { downloadCSV, downloadFEC, downloadPDFTable, type FactureForFEC } from '../lib/exportUtils'
import { getPlanComptable } from '../lib/planComptable'

function toNum(v: unknown): number { if (v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isNaN(n) ? 0 : n }
function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) }
function fmt0(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }
function dateFR(d: string | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

interface Row {
  id: string; numero: string; type: string; statut: string
  montant_ht: number; montant_ttc: number; tva_pct: number
  date_emission: string; date_echeance: string | null
  date_paiement: string | null; mode_paiement: string | null; montant_paye: number
  client_id: string | null; client_display: string
}

const TABS = ['Journal des ventes', 'Synthese ventes', 'Synthese TVA', 'Encaissements'] as const
type Tab = typeof TABS[number]

const ic = 'px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]'

export default function Rapports() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('Journal des ventes')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [dateDebut, setDateDebut] = useState(`${now.getFullYear()}-01-01`)
  const [dateFin, setDateFin] = useState(now.toISOString().split('T')[0])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: factures } = await supabase.from('factures').select('*').eq('user_id', user.id)
      .gte('date_emission', dateDebut).lte('date_emission', dateFin).order('date_emission')
    const fRows = (factures ?? []).map((f) => ({
      ...f, montant_ht: toNum(f.montant_ht), montant_ttc: toNum(f.montant_ttc), montant_paye: toNum(f.montant_paye),
    }))
    // Resolve client names
    const cIds = [...new Set(fRows.map((f) => f.client_id).filter(Boolean))] as string[]
    let cMap: Record<string, string> = {}
    if (cIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom, raison_sociale, type_client').in('id', cIds)
      for (const c of clients ?? []) cMap[c.id] = c.type_client === 'societe' ? (c.raison_sociale || c.nom) : `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }
    setRows(fRows.map((f) => ({ ...f, client_display: f.client_id ? cMap[f.client_id] ?? '' : '' })))
    setLoading(false)
  }, [user, dateDebut, dateFin])

  useEffect(() => { fetchData() }, [fetchData])

  const validRows = rows.filter((r) => r.statut !== 'annulee' && r.type !== 'avoir')
  const totalHT = validRows.reduce((s, r) => s + r.montant_ht, 0)
  const totalTTC = validRows.reduce((s, r) => s + r.montant_ttc, 0)
  const totalTVA = totalTTC - totalHT

  // --- Monthly grouping ---
  const monthly = useMemo(() => {
    const map: Record<string, { mois: string; ht: number; ttc: number; tva: number; count: number }> = {}
    for (const r of validRows) {
      const d = new Date(r.date_emission)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      if (!map[key]) map[key] = { mois: label, ht: 0, ttc: 0, tva: 0, count: 0 }
      map[key].ht += r.montant_ht; map[key].ttc += r.montant_ttc; map[key].tva += r.montant_ttc - r.montant_ht; map[key].count++
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [validRows])

  // --- TVA by rate ---
  const tvaByRate = useMemo(() => {
    const map: Record<number, { ht: number; tva: number }> = {}
    for (const r of validRows) {
      if (!map[r.tva_pct]) map[r.tva_pct] = { ht: 0, tva: 0 }
      map[r.tva_pct].ht += r.montant_ht; map[r.tva_pct].tva += r.montant_ttc - r.montant_ht
    }
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, v]) => ({ rate: Number(rate), ...v }))
  }, [validRows])

  // --- Top clients ---
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; ht: number; count: number }> = {}
    for (const r of validRows) {
      const key = r.client_display || 'Sans client'
      if (!map[key]) map[key] = { name: key, ht: 0, count: 0 }
      map[key].ht += r.montant_ht; map[key].count++
    }
    return Object.values(map).sort((a, b) => b.ht - a.ht).slice(0, 10)
  }, [validRows])

  // --- Encaissements ---
  const encaissements = rows.filter((r) => r.date_paiement)
  const totalEncaisse = encaissements.reduce((s, r) => s + r.montant_paye, 0)
  const enAttente = rows.filter((r) => !r.date_paiement && r.statut !== 'annulee')
  const totalAttente = enAttente.reduce((s, r) => s + r.montant_ttc, 0)

  // --- Export helpers ---
  const fecData: FactureForFEC[] = validRows.map((r) => ({
    numero: r.numero, date_emission: r.date_emission, montant_ht: r.montant_ht,
    montant_ttc: r.montant_ttc, tva_pct: r.tva_pct, client_display: r.client_display,
    client_id: r.client_id, statut: r.statut,
  }))

  function exportCSV() {
    const headers = ['Date', 'Numero', 'Client', 'Type', 'HT', 'TVA', 'TTC', 'Paiement']
    const data = validRows.map((r) => [
      dateFR(r.date_emission), r.numero, r.client_display, r.type,
      r.montant_ht.toFixed(2), (r.montant_ttc - r.montant_ht).toFixed(2), r.montant_ttc.toFixed(2),
      r.mode_paiement || '',
    ])
    downloadCSV(`journal_ventes_${dateDebut}_${dateFin}.csv`, headers, data)
  }

  function exportPDF() {
    const headers = ['Date', 'Numero', 'Client', 'HT', 'TVA', 'TTC']
    const data = validRows.map((r) => [
      dateFR(r.date_emission), r.numero, r.client_display,
      fmt(r.montant_ht), fmt(r.montant_ttc - r.montant_ht), fmt(r.montant_ttc),
    ])
    const totals = ['TOTAL', '', '', fmt(totalHT), fmt(totalTVA), fmt(totalTTC)]
    downloadPDFTable(`journal_ventes_${dateDebut}_${dateFin}.pdf`, `Journal des ventes — ${dateFR(dateDebut)} au ${dateFR(dateFin)}`, headers, data, totals)
  }

  function exportFEC() {
    const pc = getPlanComptable(user?.user_metadata ?? {})
    downloadFEC(`FEC_PROVISOIRE_${dateDebut}_${dateFin}.txt`, fecData, pc)
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rapports comptables</h1>
          <p className="text-gray-500 text-sm mt-0.5">{validRows.length} factures — CA HT : {fmt0(totalHT)}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={ic} />
          <span className="text-gray-400 text-sm">au</span>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={ic} />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${tab === t ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-6">
        <button onClick={exportPDF} className="px-3 py-2 text-xs font-semibold text-[#1E40AF] border border-[#1E40AF]/30 hover:bg-blue-50 rounded-lg transition-all cursor-pointer">Export PDF</button>
        <button onClick={exportCSV} className="px-3 py-2 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-all cursor-pointer">Export CSV</button>
        <button onClick={exportFEC} className="px-3 py-2 text-xs font-semibold text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg transition-all cursor-pointer">FEC Provisoire</button>
      </div>

      {loading ? <div className="h-60 bg-gray-50 rounded-2xl animate-pulse" /> : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* ========== JOURNAL DES VENTES ========== */}
          {tab === 'Journal des ventes' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Numero</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase text-right">HT</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase text-right">TVA</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase text-right">TTC</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Paiement</th>
                  </tr></thead>
                  <tbody>
                    {validRows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500">{dateFR(r.date_emission)}</td>
                        <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.numero}</td>
                        <td className="px-5 py-3 text-gray-700 truncate max-w-[180px]">{r.client_display || '—'}</td>
                        <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.type}</span></td>
                        <td className="px-5 py-3 text-right tabular-nums">{fmt(r.montant_ht)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-500">{fmt(r.montant_ttc - r.montant_ht)}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold">{fmt(r.montant_ttc)}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{r.mode_paiement || '—'}</td>
                      </tr>
                    ))}
                    {/* Monthly subtotals */}
                    {monthly.length > 1 && monthly.map((m) => (
                      <tr key={m.mois} className="bg-blue-50/50 border-b border-blue-100">
                        <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-[#1E40AF]">{m.mois} ({m.count} factures)</td>
                        <td className="px-5 py-2 text-right text-xs font-semibold text-[#1E40AF]">{fmt(m.ht)}</td>
                        <td className="px-5 py-2 text-right text-xs font-semibold text-[#1E40AF]">{fmt(m.tva)}</td>
                        <td className="px-5 py-2 text-right text-xs font-semibold text-[#1E40AF]">{fmt(m.ttc)}</td>
                        <td />
                      </tr>
                    ))}
                    {/* Total */}
                    <tr className="bg-[#1E40AF]/5 font-bold">
                      <td colSpan={4} className="px-5 py-3 text-[#1E40AF]">TOTAL GENERAL</td>
                      <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalHT)}</td>
                      <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalTVA)}</td>
                      <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalTTC)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== SYNTHESE VENTES ========== */}
          {tab === 'Synthese ventes' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">CA HT</p><p className="text-xl font-bold text-gray-900">{fmt0(totalHT)}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">CA TTC</p><p className="text-xl font-bold text-[#1E40AF]">{fmt0(totalTTC)}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Factures</p><p className="text-xl font-bold text-gray-900">{validRows.length}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Clients</p><p className="text-xl font-bold text-gray-900">{topClients.length}</p></div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolution mensuelle du CA</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [fmt(Number(v)), 'CA HT']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="ht" fill="#1E40AF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top clients */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Top clients</h3>
                <div className="space-y-2">
                  {topClients.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        <span className="text-xs text-gray-400">{c.count} factures</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{fmt0(c.ht)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== SYNTHESE TVA ========== */}
          {tab === 'Synthese TVA' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">TVA collectee</p><p className="text-xl font-bold text-[#1E40AF]">{fmt0(totalTVA)}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Base HT</p><p className="text-xl font-bold text-gray-900">{fmt0(totalHT)}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Autoliquidation</p><p className="text-xl font-bold text-amber-600">{fmt0(validRows.filter((r) => r.tva_pct === 0).reduce((s, r) => s + r.montant_ht, 0))}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">A declarer</p><p className="text-xl font-bold text-red-600">{fmt0(totalTVA)}</p></div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Taux TVA</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Base HT</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">TVA collectee</th>
                  </tr></thead>
                  <tbody>
                    {tvaByRate.map((t) => (
                      <tr key={t.rate} className="border-b border-gray-50">
                        <td className="px-5 py-3 font-medium">{t.rate === 0 ? 'Autoliquidation 0%' : `${t.rate}%`}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{fmt(t.ht)}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold">{fmt(t.tva)}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#1E40AF]/5 font-bold">
                      <td className="px-5 py-3 text-[#1E40AF]">TOTAL TVA A DECLARER</td>
                      <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalHT)}</td>
                      <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalTVA)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Compatible declaration CA3. Les montants d'autoliquidation (0%) doivent etre reportes en ligne 2 du formulaire CA3.</p>
            </div>
          )}

          {/* ========== ENCAISSEMENTS ========== */}
          {tab === 'Encaissements' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total encaisse</p><p className="text-xl font-bold text-[#1E40AF]">{fmt0(totalEncaisse)}</p><p className="text-xs text-gray-400">{encaissements.length} encaissements</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">En attente</p><p className="text-xl font-bold text-amber-600">{fmt0(totalAttente)}</p><p className="text-xs text-gray-400">{enAttente.length} factures</p></div>
                <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Taux encaissement</p><p className="text-xl font-bold text-gray-900">{totalTTC > 0 ? Math.round(totalEncaisse / totalTTC * 100) : 0}%</p></div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Encaissements recus</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Facture</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mode</th>
                    </tr></thead>
                    <tbody>
                      {encaissements.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500">{dateFR(r.date_paiement)}</td>
                          <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.numero}</td>
                          <td className="px-5 py-3 text-gray-700">{r.client_display || '—'}</td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold text-[#1E40AF]">{fmt(r.montant_paye)}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{r.mode_paiement || '—'}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#1E40AF]/5 font-bold">
                        <td colSpan={3} className="px-5 py-3 text-[#1E40AF]">TOTAL ENCAISSE</td>
                        <td className="px-5 py-3 text-right text-[#1E40AF]">{fmt(totalEncaisse)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      )}
    </div>
  )
}
