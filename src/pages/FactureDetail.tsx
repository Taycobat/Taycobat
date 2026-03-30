import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { loadImageAsBase64 } from '../lib/storage'
import { loadLignes } from '../hooks/useFactureLignes'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface FactureData {
  id: string; numero: string; type: string; statut: string
  montant_ht: number; montant_ttc: number; tva_pct: number
  date_emission: string; date_echeance: string | null
  avancement_pct: number; retenue_garantie_pct: number
  date_paiement: string | null; mode_paiement: string | null; montant_paye: number
  client_id: string | null; devis_id: string | null; user_id: string; created_at: string
}

interface ClientInfo { nom: string; prenom: string; email: string; adresse: string; ville: string; code_postal: string }

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) }
function toNum(v: unknown): number { if (v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isNaN(n) ? 0 : n }

const typeLabel: Record<string, string> = { facture: 'Facture', directe: 'Facture directe', acompte: 'Acompte', situation: 'Situation', solde: 'Solde', avoir: 'Avoir' }
const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  envoyee: { label: 'Envoyee', cls: 'bg-blue-100 text-blue-700' },
  payee: { label: 'Payee', cls: 'bg-emerald-100 text-emerald-700' },
  impayee: { label: 'Impayee', cls: 'bg-red-100 text-red-600' },
  annulee: { label: 'Annulee', cls: 'bg-gray-100 text-gray-400' },
}

export default function FactureDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [facture, setFacture] = useState<FactureData | null>(null)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    const { data: f } = await supabase.from('factures').select('*').eq('id', id).eq('user_id', user.id).single()
    if (!f) { setLoading(false); return }
    setFacture({ ...f, montant_ht: toNum(f.montant_ht), montant_ttc: toNum(f.montant_ttc), montant_paye: toNum(f.montant_paye), avancement_pct: toNum(f.avancement_pct), retenue_garantie_pct: toNum(f.retenue_garantie_pct) })
    if (f.client_id) {
      const { data: c } = await supabase.from('clients').select('nom,prenom,email,adresse,ville,code_postal').eq('id', f.client_id).single()
      setClient(c ?? null)
    }
    setLoading(false)
  }, [id, user])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatut(statut: string) {
    if (!facture) return
    await supabase.from('factures').update({ statut }).eq('id', facture.id)
    setFacture({ ...facture, statut })
  }

  async function handlePDF() {
    if (!facture) return
    const doc = new jsPDF()
    const green: [number, number, number] = [26, 158, 82]
    const mu = user?.user_metadata ?? {}
    const entreprise = mu.entreprise || 'TAYCOBAT'
    const siret = mu.siret || ''
    const typeName = typeLabel[facture.type] || 'Facture'

    const artisanLogoUrl = mu.logo_url as string | undefined
    let artisanLogoB64: string | null = null
    if (artisanLogoUrl) artisanLogoB64 = await loadImageAsBase64(artisanLogoUrl)

    let infoX = 14
    if (artisanLogoB64) { try { doc.addImage(artisanLogoB64, 'PNG', 14, 10, 20, 20) } catch { /* */ }; infoX = 38 }
    doc.setTextColor(30, 30, 30); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(entreprise, infoX, 17)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    if (siret) doc.text(`SIRET : ${siret}`, infoX, 23)
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text(typeName.toUpperCase(), 196, 16, { align: 'right' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(`N\u00b0 ${facture.numero}`, 196, 23, { align: 'right' })
    doc.setDrawColor(...green); doc.setLineWidth(0.8); doc.line(14, 30, 196, 30)

    let y = 36
    if (client) { doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${client.prenom} ${client.nom}`, 14, y); y += 6 }
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(`Date : ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, 14, y); y += 10

    // Fetch invoice line items from factures_lignes
    const lignes = await loadLignes(facture.id)
    const prestations = lignes.filter((l) => l.type === 'prestation' && l.description)
    const tableData = prestations.map((l) => [l.description, String(l.quantite), l.unite, fmt(l.prix_unitaire), `${l.tva_pct}%`, fmt(l.total_ht)])

    autoTable(doc, {
      startY: y, head: [['Designation', 'Qte', 'Unite', 'P.U. HT', 'TVA', 'Total HT']],
      body: tableData.length > 0 ? tableData : [[typeName, '', '', '', `${facture.tva_pct}%`, fmt(facture.montant_ht)]],
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [245, 250, 247] },
      margin: { left: 14, right: 14 },
    })
    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 30

    // Totals block
    let totY = finalY + 8
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text('Total HT', 140, totY); doc.text(fmt(facture.montant_ht), 196, totY, { align: 'right' }); totY += 5
    doc.text(`TVA ${facture.tva_pct}%`, 140, totY); doc.text(fmt(facture.montant_ttc - facture.montant_ht), 196, totY, { align: 'right' }); totY += 5
    doc.setDrawColor(200, 200, 200); doc.line(140, totY, 196, totY); totY += 5
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text(`Net a payer : ${fmt(facture.montant_ttc)}`, 196, totY, { align: 'right' })
    doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.text(`${entreprise} — TAYCOBAT`, 105, 285, { align: 'center' })
    doc.save(`${facture.numero}.pdf`)
  }

  if (loading) return <div className="p-8"><div className="h-40 bg-gray-50 rounded-2xl animate-pulse" /></div>
  if (!facture) return <div className="p-8 text-center text-gray-500">Facture introuvable</div>

  const st = statutStyle[facture.statut] ?? statutStyle.brouillon
  const retenue = facture.retenue_garantie_pct > 0 ? Math.round(facture.montant_ttc * facture.retenue_garantie_pct / 100 * 100) / 100 : 0

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <Link to="/factures" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Retour aux factures
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{facture.numero}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{typeLabel[facture.type] || facture.type}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${st.cls}`}>{st.label}</span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Date emission</p><p className="text-sm font-medium text-gray-900">{new Date(facture.date_emission).toLocaleDateString('fr-FR')}</p></div>
            <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Echeance</p><p className="text-sm font-medium text-gray-900">{facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : '—'}</p></div>
            <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Montant TTC</p><p className="text-lg font-bold text-[#1a9e52]">{fmt(facture.montant_ttc)}</p></div>
            <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">TVA</p><p className="text-sm font-medium text-gray-900">{facture.tva_pct}%</p></div>
          </div>

          {/* Client */}
          {client && (
            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Client</p>
              <p className="text-sm font-semibold text-gray-900">{client.prenom} {client.nom}</p>
              {client.adresse && <p className="text-sm text-gray-500">{client.adresse}</p>}
              {(client.code_postal || client.ville) && <p className="text-sm text-gray-500">{client.code_postal} {client.ville}</p>}
              {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
            </div>
          )}

          {/* Totaux */}
          <div className="bg-emerald-50 rounded-xl p-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Total HT</span><span className="font-medium">{fmt(facture.montant_ht)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">TVA {facture.tva_pct}%</span><span className="font-medium">{fmt(facture.montant_ttc - facture.montant_ht)}</span></div>
            {retenue > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Retenue garantie {facture.retenue_garantie_pct}%</span><span>-{fmt(retenue)}</span></div>}
            <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-[#1a9e52]"><span>Total TTC</span><span>{fmt(facture.montant_ttc)}</span></div>
          </div>

          {/* Paiement */}
          {facture.date_paiement && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
              <p className="text-xs text-emerald-700 uppercase font-semibold mb-1">Paiement enregistre</p>
              <p className="text-sm text-emerald-800">{fmt(facture.montant_paye)} — {facture.mode_paiement} — {new Date(facture.date_paiement).toLocaleDateString('fr-FR')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handlePDF} className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer">Telecharger PDF</button>
            {facture.statut !== 'payee' && facture.statut !== 'annulee' && (
              <button onClick={() => handleStatut('payee')} className="px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer">Marquer payee</button>
            )}
            {facture.statut === 'brouillon' && (
              <button onClick={() => handleStatut('envoyee')} className="px-4 py-2.5 text-sm font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">Marquer envoyee</button>
            )}
            <button onClick={() => navigate('/factures')} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">Retour</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
