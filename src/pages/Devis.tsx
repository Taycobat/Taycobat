import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDevis } from '../hooks/useDevis'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import type { DevisCreatePayload, DevisRow } from '../hooks/useDevis'
import DevisModal from '../components/DevisModal'
import { loadImageAsBase64 } from '../lib/storage'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } }

const STATUTS = [
  { key: 'all', label: 'Tous' },
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'envoye', label: 'Envoyé' },
  { key: 'signe', label: 'Signé' },
  { key: 'refuse', label: 'Refusé' },
]

const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  envoye: { label: 'Envoyé', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  signe: { label: 'Signé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  accepte: { label: 'Accepté', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-600 border-red-200' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function fmt2(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}
function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

export default function Devis() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { devisList, loading, createDevis, duplicateDevis, deleteDevis, updateStatut } = useDevis()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pdfingId, setPdfingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return devisList.filter((d) => {
      if (filterStatut !== 'all' && d.statut !== filterStatut) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (d.numero ?? '').toLowerCase().includes(q) ||
        (d.titre ?? '').toLowerCase().includes(q) ||
        (d.client_display ?? '').toLowerCase().includes(q)
    })
  }, [devisList, search, filterStatut])

  async function handleCreate(payload: DevisCreatePayload) { return createDevis(payload) }

  async function handleDelete(id: string) { setDeletingId(id); await deleteDevis(id); setDeletingId(null) }

  async function handlePDF(d: DevisRow) {
    setPdfingId(d.id)
    const green: [number, number, number] = [26, 158, 82]
    const meta = user?.user_metadata ?? {}
    const entreprise = meta.entreprise || 'TAYCO BAT'
    const siretE = meta.siret || ''

    // Fetch client
    let client: { nom: string; prenom: string; adresse?: string; ville?: string; code_postal?: string } | undefined
    if (d.client_id) {
      const { data: c } = await supabase.from('clients').select('nom,prenom,adresse,ville,code_postal').eq('id', d.client_id).single()
      if (c) client = c
    }

    // Load artisan logo
    const artisanLogoUrl = meta.logo_url as string | undefined
    let artisanLogoB64: string | null = null
    if (artisanLogoUrl) artisanLogoB64 = await loadImageAsBase64(artisanLogoUrl)

    // Fetch lignes
    const { data: lignesData } = await supabase.from('devis_lignes').select('*').eq('devis_id', d.id).order('ordre')
    const lignes = (lignesData ?? []).map((l) => ({
      description: l.description, quantite: toNum(l.quantite), unite: l.unite,
      prix_unitaire: toNum(l.prix_unitaire), total_ht: toNum(l.total_ht),
    }))

    const doc = new jsPDF()

    // Header
    doc.setFillColor(...green); doc.rect(0, 0, 210, 32, 'F')
    // Artisan logo in header
    let textX = 14
    if (artisanLogoB64) {
      try { doc.addImage(artisanLogoB64, 'PNG', 10, 4, 24, 24) } catch { /* ignore */ }
      textX = 38
    }
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(entreprise, textX, 15)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`SIRET : ${siretE}`, textX, 22)
    doc.text(`DEVIS N° ${d.numero}`, 196, 15, { align: 'right' })
    doc.text(`Date : ${new Date(d.date_devis || d.created_at).toLocaleDateString('fr-FR')}`, 196, 22, { align: 'right' })
    if (d.date_validite) doc.text(`Valable jusqu'au : ${new Date(d.date_validite).toLocaleDateString('fr-FR')}`, 196, 27, { align: 'right' })

    // Client box
    doc.setTextColor(50, 50, 50); doc.setDrawColor(200, 200, 200)
    doc.roundedRect(120, 38, 76, 28, 2, 2)
    doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text('DESTINATAIRE', 124, 43)
    doc.setTextColor(30, 30, 30); doc.setFontSize(10)
    if (client) {
      doc.setFont('helvetica', 'bold'); doc.text(`${client.prenom} ${client.nom}`, 124, 50)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      if (client.adresse) doc.text(client.adresse, 124, 56)
      doc.text(`${client.code_postal || ''} ${client.ville || ''}`.trim(), 124, 61)
    } else if (d.client_display) {
      doc.setFont('helvetica', 'bold'); doc.text(d.client_display, 124, 50)
    }

    if (d.titre) { doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green); doc.text(d.titre, 14, 46); doc.setTextColor(30, 30, 30) }

    // Table
    const tableData = lignes.map((l) => [l.description, String(l.quantite), l.unite, fmt2(l.prix_unitaire), fmt2(l.total_ht)])
    autoTable(doc, {
      startY: 75, head: [['Désignation', 'Qté', 'Unité', 'P.U. HT', 'Total HT']],
      body: tableData.length > 0 ? tableData : [['—', '', '', '', '']],
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [245, 250, 247] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } },
      margin: { left: 14, right: 14 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 140
    const tva = d.montant_ttc - d.montant_ht
    const boxX = 120; const boxY = finalY + 10
    doc.setFillColor(245, 250, 247); doc.roundedRect(boxX, boxY, 76, 32, 2, 2, 'F')
    doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text('Total HT', boxX + 4, boxY + 8); doc.text(fmt2(d.montant_ht), boxX + 72, boxY + 8, { align: 'right' })
    doc.text(`TVA ${d.tva_pct}%`, boxX + 4, boxY + 16); doc.text(fmt2(tva), boxX + 72, boxY + 16, { align: 'right' })
    doc.setDrawColor(200, 200, 200); doc.line(boxX + 4, boxY + 20, boxX + 72, boxY + 20)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text('Total TTC', boxX + 4, boxY + 28); doc.text(fmt2(d.montant_ttc), boxX + 72, boxY + 28, { align: 'right' })

    // Signature
    const sigY = boxY + 42; doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text("Signature de l'artisan", 14, sigY); doc.text('Signature du client (bon pour accord)', 120, sigY)
    doc.setDrawColor(200, 200, 200)
    doc.roundedRect(14, sigY + 4, 76, 25, 2, 2); doc.roundedRect(120, sigY + 4, 76, 25, 2, 2)

    // Autoliquidation mention if TVA = 0
    if (d.tva_pct === 0) {
      const alY = sigY + 35
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0)
      doc.text('AUTOLIQUIDATION DE LA TVA', 14, alY)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 90, 0)
      doc.text('Article 283-2 nonies du CGI. TVA due par le preneur assujetti.', 14, alY + 5)
    }

    doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`${entreprise} — Généré par TAYCO BAT`, 105, 285, { align: 'center' })

    doc.save(`${d.numero}.pdf`)
    setPdfingId(null)
  }

  const totalCA = devisList.filter((d) => d.statut === 'signe' || d.statut === 'accepte').reduce((s, d) => s + d.montant_ttc, 0)
  const counts = { brouillon: 0, envoye: 0, signe: 0, refuse: 0 }
  devisList.forEach((d) => { if (d.statut in counts) counts[d.statut as keyof typeof counts]++ })

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Devis</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {devisList.length} devis &middot; CA signé : {fmt(totalCA)}
          </p>
        </div>
        <motion.button onClick={() => setModalOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nouveau devis
        </motion.button>
      </motion.div>

      {/* KPI pills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: 'Brouillon', count: counts.brouillon, cls: 'bg-gray-100 text-gray-600' },
          { label: 'Envoyé', count: counts.envoye, cls: 'bg-blue-50 text-blue-700' },
          { label: 'Signé', count: counts.signe, cls: 'bg-emerald-50 text-emerald-700' },
          { label: 'Refusé', count: counts.refuse, cls: 'bg-red-50 text-red-600' },
        ].map((p) => (
          <div key={p.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.cls}`}>
            {p.count} {p.label}
          </div>
        ))}
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par numéro, titre, client..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
          {STATUTS.map((s) => (
            <button key={s.key} onClick={() => setFilterStatut(s.key)}
              className={`px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                filterStatut === s.key ? 'bg-[#1a9e52] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>{s.label}</button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">{search || filterStatut !== 'all' ? 'Aucun résultat' : 'Aucun devis pour le moment'}</p>
            <p className="text-xs text-gray-400">{search ? 'Essayez un autre terme' : 'Créez votre premier devis'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Numéro</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Titre / Client</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Montant TTC</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Statut</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr></thead>
              <motion.tbody variants={container} initial="hidden" animate="show">
                {filtered.map((devis) => {
                  const st = statutStyle[devis.statut] ?? statutStyle.brouillon
                  return (
                    <motion.tr key={devis.id} variants={row} onClick={() => navigate(`/devis/${devis.id}`)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4"><span className="text-sm font-mono font-medium text-gray-900">{devis.numero}</span></td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{devis.titre || '—'}</div>
                        {devis.client_display && <div className="text-xs text-gray-400 truncate max-w-[250px]">{devis.client_display}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(devis.montant_ttc)}</span>
                        <div className="text-xs text-gray-400">HT {fmt(devis.montant_ht)}</div>
                        {devis.tva_pct === 0 && <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Autoliquidation</span>}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select value={devis.statut} onChange={(e) => updateStatut(devis.id, e.target.value)}
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer appearance-none bg-none ${st.cls}`}>
                          <option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option>
                          <option value="signe">Signé</option><option value="refuse">Refusé</option>
                        </select>
                      </td>
                      <td className="px-6 py-4"><span className="text-sm text-gray-500">{new Date(devis.created_at).toLocaleDateString('fr-FR')}</span></td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Duplicate button */}
                          <button onClick={() => duplicateDevis(devis.id)} title="Dupliquer"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          {/* PDF button */}
                          <button onClick={() => handlePDF(devis)} title="Générer PDF" disabled={pdfingId === devis.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#1a9e52] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40">
                            {pdfingId === devis.id ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            )}
                          </button>
                          {/* Delete button */}
                          <button onClick={() => handleDelete(devis.id)} title="Supprimer" disabled={deletingId === devis.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40">
                            {deletingId === devis.id ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      <DevisModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  )
}
