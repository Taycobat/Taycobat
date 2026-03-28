import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DevisWithClient {
  id: string
  numero: string
  titre: string
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  created_at: string
  date_validite?: string
  description?: string
  client_nom?: string
  client?: {
    nom: string; prenom: string; email: string; telephone: string
    adresse: string; ville: string; code_postal: string; siret: string
  }
}

interface Ligne {
  designation: string; quantite: number; unite: string
  prix_unitaire: number; montant_ht: number; ordre?: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  envoye: { label: 'Envoyé', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  signe: { label: 'Signé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  accepte: { label: 'Accepté', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-600 border-red-200' },
}

const row = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

export default function PDFExport() {
  const { user } = useAuthStore()
  const [devisList, setDevisList] = useState<DevisWithClient[]>([])
  const [lignesMap, setLignesMap] = useState<Record<string, Ligne[]>>({})
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<DevisWithClient | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: devis } = await supabase
      .from('devis')
      .select('id, numero, titre, montant_ht, montant_ttc, tva_pct, statut, created_at, date_validite, description, client_id, client_nom')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const list: DevisWithClient[] = []
    const ids: string[] = []
    for (const d of devis ?? []) {
      ids.push(d.id)
      let client = undefined
      if (d.client_id) {
        const { data: c } = await supabase.from('clients').select('nom,prenom,email,telephone,adresse,ville,code_postal,siret').eq('id', d.client_id).single()
        client = c ?? undefined
      }
      list.push({ ...d, montant_ht: toNum(d.montant_ht), montant_ttc: toNum(d.montant_ttc), tva_pct: toNum(d.tva_pct), client })
    }

    if (ids.length > 0) {
      const { data: lignes } = await supabase.from('devis_lignes').select('*').in('devis_id', ids).order('ordre')
      const map: Record<string, Ligne[]> = {}
      for (const l of lignes ?? []) {
        const id = l.devis_id
        if (!map[id]) map[id] = []
        map[id].push({ designation: l.designation, quantite: toNum(l.quantite), unite: l.unite, prix_unitaire: toNum(l.prix_unitaire), montant_ht: toNum(l.montant_ht ?? l.total_ht), ordre: l.ordre })
      }
      setLignesMap(map)
    }

    setDevisList(list)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  function generatePDF(d: DevisWithClient) {
    setGenerating(d.id)
    const doc = new jsPDF()
    const green: [number, number, number] = [26, 158, 82]
    const meta = user?.user_metadata ?? {}
    const entreprise = meta.entreprise || 'TAYCO BAT'
    const siretEntreprise = meta.siret || ''

    // Header
    doc.setFillColor(...green)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(entreprise, 14, 15)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`SIRET : ${siretEntreprise}`, 14, 22)
    doc.text(`DEVIS N° ${d.numero}`, 196, 15, { align: 'right' })
    doc.text(`Date : ${new Date(d.created_at).toLocaleDateString('fr-FR')}`, 196, 22, { align: 'right' })

    // Client box
    doc.setTextColor(50, 50, 50)
    doc.setDrawColor(200, 200, 200)
    doc.roundedRect(120, 38, 76, 30, 2, 2)
    doc.setFontSize(8)
    doc.setTextColor(130, 130, 130)
    doc.text('DESTINATAIRE', 124, 43)
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(10)
    const c = d.client
    if (c) {
      doc.setFont('helvetica', 'bold')
      doc.text(`${c.prenom} ${c.nom}`, 124, 50)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      if (c.adresse) doc.text(c.adresse, 124, 56)
      doc.text(`${c.code_postal || ''} ${c.ville || ''}`.trim(), 124, 61)
    } else if (d.client_nom) {
      doc.setFont('helvetica', 'bold')
      doc.text(d.client_nom, 124, 50)
    }

    // Title
    if (d.titre) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...green)
      doc.text(d.titre, 14, 46)
      doc.setTextColor(30, 30, 30)
    }

    // Table
    const lignes = lignesMap[d.id] ?? []
    const tableData = lignes.map((l) => [
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire),
      fmt(l.montant_ht),
    ])

    autoTable(doc, {
      startY: 75,
      head: [['Désignation', 'Qté', 'Unité', 'P.U. HT', 'Total HT']],
      body: tableData.length > 0 ? tableData : [['—', '', '', '', '']],
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 247] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 140
    const tva = d.montant_ttc - d.montant_ht

    // Totals box
    const boxX = 120; const boxY = finalY + 10
    doc.setFillColor(245, 250, 247)
    doc.roundedRect(boxX, boxY, 76, 32, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Total HT', boxX + 4, boxY + 8)
    doc.text(fmt(d.montant_ht), boxX + 72, boxY + 8, { align: 'right' })
    doc.text(`TVA ${d.tva_pct}%`, boxX + 4, boxY + 16)
    doc.text(fmt(tva), boxX + 72, boxY + 16, { align: 'right' })
    doc.setDrawColor(200, 200, 200)
    doc.line(boxX + 4, boxY + 20, boxX + 72, boxY + 20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...green)
    doc.text('Total TTC', boxX + 4, boxY + 28)
    doc.text(fmt(d.montant_ttc), boxX + 72, boxY + 28, { align: 'right' })

    // Signature boxes
    const sigY = boxY + 42
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text("Signature de l'artisan", 14, sigY)
    doc.text('Signature du client', 120, sigY)
    doc.text('(Bon pour accord)', 120, sigY + 5)
    doc.setDrawColor(200, 200, 200)
    doc.roundedRect(14, sigY + 8, 76, 25, 2, 2)
    doc.roundedRect(120, sigY + 8, 76, 25, 2, 2)

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(`${entreprise} — Généré par TAYCO BAT`, 105, 285, { align: 'center' })

    doc.save(`${d.numero}.pdf`)
    setGenerating(null)
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Export PDF</h1>
          <p className="text-gray-500 text-sm mt-0.5">{devisList.length} devis disponibles</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />)}</div>
      ) : devisList.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Aucun devis à exporter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {devisList.map((d) => {
            const st = statutStyle[d.statut] ?? statutStyle.brouillon
            return (
              <motion.div key={d.id} variants={row} initial="hidden" animate="show"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-mono font-semibold text-gray-900">{d.numero}</span>
                    <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.cls}`}>{st.label}</span>
                  </div>
                  <span className="text-lg font-bold text-[#1a9e52]">{fmt(d.montant_ttc)}</span>
                </div>
                {d.titre && <p className="text-sm text-gray-700 truncate mb-1">{d.titre}</p>}
                <p className="text-xs text-gray-400 mb-4">
                  {d.client?.prenom ? `${d.client.prenom} ${d.client.nom}` : d.client_nom || '—'} &middot; {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  {(lignesMap[d.id]?.length ?? 0) > 0 && ` · ${lignesMap[d.id].length} ligne${lignesMap[d.id].length > 1 ? 's' : ''}`}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Aperçu
                  </button>
                  <button onClick={() => generatePDF(d)} disabled={generating === d.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60">
                    {generating === d.id ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    PDF
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setPreview(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Aperçu — {preview.numero}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { generatePDF(preview); setPreview(null) }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer">Télécharger PDF</button>
                  <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1a9e52] to-[#0e7a3c] rounded-xl p-5 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xl font-bold">{user?.user_metadata?.entreprise || 'TAYCO BAT'}</div>
                      {user?.user_metadata?.siret && <div className="text-sm text-emerald-200 mt-1">SIRET : {user.user_metadata.siret}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">{preview.numero}</div>
                      <div className="text-sm text-emerald-200">{new Date(preview.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>
                {/* Client */}
                {(preview.client || preview.client_nom) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Destinataire</div>
                    <div className="font-semibold text-gray-900">{preview.client ? `${preview.client.prenom} ${preview.client.nom}` : preview.client_nom}</div>
                    {preview.client?.adresse && <div className="text-sm text-gray-500">{preview.client.adresse}</div>}
                    {preview.client && <div className="text-sm text-gray-500">{preview.client.code_postal} {preview.client.ville}</div>}
                  </div>
                )}
                {preview.titre && <h3 className="text-lg font-bold text-gray-900">{preview.titre}</h3>}
                {/* Lignes */}
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs text-gray-400 uppercase font-medium">Désignation</th>
                    <th className="text-center py-2 text-xs text-gray-400 uppercase font-medium">Qté</th>
                    <th className="text-center py-2 text-xs text-gray-400 uppercase font-medium">Unité</th>
                    <th className="text-right py-2 text-xs text-gray-400 uppercase font-medium">P.U. HT</th>
                    <th className="text-right py-2 text-xs text-gray-400 uppercase font-medium">Total HT</th>
                  </tr></thead>
                  <tbody>
                    {(lignesMap[preview.id] ?? []).map((l, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 text-gray-900">{l.designation}</td>
                        <td className="py-2 text-center text-gray-600">{l.quantite}</td>
                        <td className="py-2 text-center text-gray-600">{l.unite}</td>
                        <td className="py-2 text-right text-gray-600">{fmt(l.prix_unitaire)}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{fmt(l.montant_ht)}</td>
                      </tr>
                    ))}
                    {(lignesMap[preview.id] ?? []).length === 0 && (
                      <tr><td colSpan={5} className="py-4 text-center text-gray-400">Aucune ligne</td></tr>
                    )}
                  </tbody>
                </table>
                {/* Totals */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Total HT</span><span className="font-medium">{fmt(preview.montant_ht)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">TVA {preview.tva_pct}%</span><span className="font-medium">{fmt(preview.montant_ttc - preview.montant_ht)}</span></div>
                  <div className="flex justify-between text-base pt-2 border-t border-gray-200"><span className="font-bold">Total TTC</span><span className="font-bold text-[#1a9e52]">{fmt(preview.montant_ttc)}</span></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
