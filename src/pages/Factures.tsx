import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useFactures } from '../hooks/useFactures'
import type { Facture } from '../hooks/useFactures'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuthStore } from '../store/authStore'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } }

const TYPES = [
  { key: 'all', label: 'Toutes' }, { key: 'facture', label: 'Factures' },
  { key: 'acompte', label: 'Acomptes' }, { key: 'situation', label: 'Situations' }, { key: 'avoir', label: 'Avoirs' },
]
const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  envoyee: { label: 'Envoyée', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  payee: { label: 'Payée', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  impayee: { label: 'Impayée', cls: 'bg-red-50 text-red-600 border-red-200' },
  annulee: { label: 'Annulée', cls: 'bg-gray-50 text-gray-400 border-gray-200' },
}
const typeLabel: Record<string, string> = { facture: 'Facture', acompte: 'Acompte', situation: 'Situation', avoir: 'Avoir' }

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

export default function Factures() {
  const { user } = useAuthStore()
  const { factures, loading, updateStatut, deleteFacture } = useFactures()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => factures.filter((f) => {
    if (filterType !== 'all' && f.type !== filterType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (f.numero ?? '').toLowerCase().includes(q) || (f.client_display ?? '').toLowerCase().includes(q)
  }), [factures, search, filterType])

  const totalPayee = factures.filter((f) => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0)
  const totalImpayee = factures.filter((f) => f.statut === 'impayee').reduce((s, f) => s + f.montant_ttc, 0)

  function generatePDF(f: Facture) {
    const doc = new jsPDF()
    const green: [number, number, number] = [26, 158, 82]
    const entreprise = user?.user_metadata?.entreprise || 'TAYCO BAT'
    doc.setFillColor(...green); doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text(entreprise, 14, 14)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`${typeLabel[f.type] ?? 'Facture'} N° ${f.numero}`, 196, 10, { align: 'right' })
    doc.text(`Date : ${new Date(f.date_emission || f.created_at).toLocaleDateString('fr-FR')}`, 196, 17, { align: 'right' })
    if (f.client_display) { doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.text(f.client_display, 14, 42) }
    autoTable(doc, {
      startY: 55, head: [['Description', 'Montant HT', 'TVA', 'Montant TTC']],
      body: [[typeLabel[f.type] ?? 'Facture', fmt(f.montant_ht), `${f.tva_pct}%`, fmt(f.montant_ttc)]],
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
    doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`${entreprise} — Généré par TAYCO BAT`, 105, 285, { align: 'center' })
    doc.save(`${f.numero}.pdf`)
  }

  async function handleDelete(id: string) { setDeletingId(id); await deleteFacture(id); setDeletingId(null) }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Factures</h1>
          <p className="text-gray-500 text-sm mt-0.5">{factures.length} factures &middot; Encaissé : {fmt(totalPayee)} &middot; Impayé : {fmt(totalImpayee)}</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-3 mb-6 flex-wrap">
        {[{ label: 'Payées', count: factures.filter((f) => f.statut === 'payee').length, cls: 'bg-emerald-50 text-emerald-700' },
          { label: 'Impayées', count: factures.filter((f) => f.statut === 'impayee').length, cls: 'bg-red-50 text-red-600' },
          { label: 'Acomptes', count: factures.filter((f) => f.type === 'acompte').length, cls: 'bg-blue-50 text-blue-700' },
          { label: 'Avoirs', count: factures.filter((f) => f.type === 'avoir').length, cls: 'bg-amber-50 text-amber-700' },
        ].map((p) => <div key={p.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.cls}`}>{p.count} {p.label}</div>)}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
          {TYPES.map((t) => <button key={t.key} onClick={() => setFilterType(t.key)} className={`px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${filterType === t.key ? 'bg-[#1a9e52] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{t.label}</button>)}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16"><p className="text-sm text-gray-500">Aucune facture</p></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100">
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Numéro</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Client</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Type</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-3">Montant TTC</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Statut</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-3">Actions</th>
        </tr></thead><motion.tbody variants={container} initial="hidden" animate="show">
          {filtered.map((f) => { const st = statutStyle[f.statut] ?? statutStyle.brouillon; return (
            <motion.tr key={f.id} variants={row} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4"><span className="text-sm font-mono font-medium text-gray-900">{f.numero}</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-700">{f.client_display || '—'}</span></td>
              <td className="px-6 py-4"><span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{typeLabel[f.type] ?? f.type}</span></td>
              <td className="px-6 py-4 text-right"><span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(f.montant_ttc)}</span></td>
              <td className="px-6 py-4"><select value={f.statut} onChange={(e) => updateStatut(f.id, e.target.value)} className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer appearance-none ${st.cls}`}>
                <option value="brouillon">Brouillon</option><option value="envoyee">Envoyée</option><option value="payee">Payée</option><option value="impayee">Impayée</option><option value="annulee">Annulée</option>
              </select></td>
              <td className="px-6 py-4"><div className="flex items-center justify-end gap-1">
                <button onClick={() => generatePDF(f)} title="PDF" className="p-2 rounded-lg text-gray-400 hover:text-[#1a9e52] hover:bg-emerald-50 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button onClick={() => handleDelete(f.id)} disabled={deletingId === f.id} title="Supprimer" className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div></td>
            </motion.tr>)})}
        </motion.tbody></table></div>}
      </motion.div>
    </div>
  )
}
