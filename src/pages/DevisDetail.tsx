import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { DevisLigne } from '../hooks/useDevis'
import { useEmail } from '../hooks/useEmail'
import { wrapDocText } from '../lib/exportUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DevisDetail {
  id: string; numero: string; titre: string; client_id: string | null
  montant_ht: number; montant_ttc: number; tva_pct: number; statut: string
  date_devis: string | null; date_validite: string | null
  user_id: string; created_at: string
}

interface ClientInfo {
  nom: string; prenom: string; email: string; telephone: string
  adresse: string; ville: string; code_postal: string; entreprise: string
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}

const statutConfig: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  envoye: { label: 'Envoyé', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  signe: { label: 'Signé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  accepte: { label: 'Accepté', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-600 border-red-200' },
}

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [devis, setDevis] = useState<DevisDetail | null>(null)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [lignes, setLignes] = useState<DevisLigne[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const { sendDevis } = useEmail()

  const fetchData = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)

    const { data: d } = await supabase.from('devis')
      .select('id, numero, titre, client_id, montant_ht, montant_ttc, tva_pct, statut, date_devis, date_validite, user_id, created_at')
      .eq('id', id).eq('user_id', user.id).single()

    if (!d) { setLoading(false); return }

    setDevis({ ...d, montant_ht: toNum(d.montant_ht), montant_ttc: toNum(d.montant_ttc), tva_pct: toNum(d.tva_pct) })

    if (d.client_id) {
      const { data: c } = await supabase.from('clients')
        .select('nom, prenom, email, telephone, adresse, ville, code_postal, entreprise')
        .eq('id', d.client_id).single()
      setClient(c ?? null)
    }

    const { data: l } = await supabase.from('devis_lignes')
      .select('id, devis_id, description, quantite, unite, prix_unitaire, total_ht')
      .eq('devis_id', id).order('ordre')

    setLignes((l ?? []).map((row) => ({
      ...row,
      quantite: toNum(row.quantite), prix_unitaire: toNum(row.prix_unitaire), total_ht: toNum(row.total_ht),
    })))
    setLoading(false)
  }, [id, user])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleEnvoyer() {
    if (!devis) return
    setActionLoading('envoyer')
    await supabase.from('devis').update({ statut: 'envoye' }).eq('id', devis.id)
    // Envoyer l'email au client si email disponible
    if (client?.email) {
      const meta = user?.user_metadata ?? {}
      const artisanName = meta.entreprise || `${meta.prenom || ''} ${meta.nom || ''}`.trim() || 'Votre artisan'
      const clientName = client.entreprise || `${client.prenom || ''} ${client.nom || ''}`.trim()
      const montantTTC = devis.montant_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
      await sendDevis(client.email, {
        clientName,
        devisNumero: devis.numero,
        montantTTC,
        artisanName,
      })
    }
    setDevis({ ...devis, statut: 'envoye' })
    setActionLoading('')
  }

  async function handleConvertir() {
    if (!devis || !user) return
    setActionLoading('convertir')
    const year = new Date().getFullYear()
    const { count } = await supabase.from('factures').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).like('numero', `FA-${year}-%`)
    const numero = `FA-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: devis.id, client_id: devis.client_id, type: 'facture',
      montant_ht: devis.montant_ht, montant_ttc: devis.montant_ttc, tva_pct: devis.tva_pct,
      statut: 'brouillon', date_emission: new Date().toISOString().split('T')[0],
      retenue_garantie_pct: 0, user_id: user.id,
    })
    setActionLoading('')
    if (!error) navigate('/factures')
  }

  function handlePDF() {
    if (!devis) return
    const doc = new jsPDF()
    wrapDocText(doc)
    const green: [number, number, number] = [26, 158, 82]
    const meta = user?.user_metadata ?? {}
    const entreprise = meta.entreprise || 'TAYCOBAT'
    const siret = meta.siret || ''

    doc.setFillColor(...green); doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(entreprise, 14, 15)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    if (siret) doc.text(`SIRET : ${siret}`, 14, 22)
    doc.text(`DEVIS N° ${devis.numero}`, 196, 15, { align: 'right' })
    doc.text(`Date : ${new Date(devis.created_at).toLocaleDateString('fr-FR')}`, 196, 22, { align: 'right' })

    doc.setTextColor(50, 50, 50); doc.setDrawColor(200, 200, 200)
    doc.roundedRect(120, 38, 76, 28, 2, 2)
    doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text('DESTINATAIRE', 124, 43)
    doc.setTextColor(30, 30, 30); doc.setFontSize(10)
    if (client) {
      doc.setFont('helvetica', 'bold'); doc.text(`${client.prenom} ${client.nom}`, 124, 50)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      if (client.adresse) doc.text(client.adresse, 124, 56)
      doc.text(`${client.code_postal || ''} ${client.ville || ''}`.trim(), 124, 61)
    }

    if (devis.titre) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
      doc.text(devis.titre, 14, 46); doc.setTextColor(30, 30, 30)
    }

    const tableData = lignes.map((l) => [l.description, String(l.quantite), l.unite, fmt(l.prix_unitaire), fmt(l.total_ht)])
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
    const tva = devis.montant_ttc - devis.montant_ht
    const boxX = 120; const boxY = finalY + 10
    doc.setFillColor(245, 250, 247); doc.roundedRect(boxX, boxY, 76, 32, 2, 2, 'F')
    doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text('Total HT', boxX + 4, boxY + 8); doc.text(fmt(devis.montant_ht), boxX + 72, boxY + 8, { align: 'right' })
    doc.text(`TVA ${devis.tva_pct}%`, boxX + 4, boxY + 16); doc.text(fmt(tva), boxX + 72, boxY + 16, { align: 'right' })
    doc.setDrawColor(200, 200, 200); doc.line(boxX + 4, boxY + 20, boxX + 72, boxY + 20)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text('Total TTC', boxX + 4, boxY + 28); doc.text(fmt(devis.montant_ttc), boxX + 72, boxY + 28, { align: 'right' })

    const sigY = boxY + 42; doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text("Signature de l'artisan", 14, sigY); doc.text('Signature du client (bon pour accord)', 120, sigY)
    doc.setDrawColor(200, 200, 200); doc.roundedRect(14, sigY + 4, 76, 25, 2, 2); doc.roundedRect(120, sigY + 4, 76, 25, 2, 2)
    doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`${entreprise} — Généré par TAYCOBAT`, 105, 285, { align: 'center' })
    doc.save(`${devis.numero}.pdf`)
  }

  if (loading) return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-6">
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-64" />
      <div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
    </div>
  )

  if (!devis) return (
    <div className="p-8 text-center py-20">
      <p className="text-gray-500 mb-4">Devis non trouvé</p>
      <Link to="/devis" className="text-[#1a9e52] font-medium hover:underline">Retour aux devis</Link>
    </div>
  )

  const st = statutConfig[devis.statut] ?? statutConfig.brouillon
  const tva = Math.round((devis.montant_ttc - devis.montant_ht) * 100) / 100
  const isBrouillon = devis.statut === 'brouillon'
  const canConvert = devis.statut === 'signe' || devis.statut === 'accepte' || devis.statut === 'envoye'

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Breadcrumb + actions */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/devis" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 font-mono tracking-tight">{devis.numero}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{devis.titre || 'Sans titre'} &middot; {new Date(devis.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isBrouillon && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleEnvoyer}
              disabled={actionLoading === 'envoyer'}
              className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer disabled:opacity-50">
              {actionLoading === 'envoyer' ? 'Envoi...' : 'Envoyer au client'}
            </motion.button>
          )}
          {canConvert && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleConvertir}
              disabled={actionLoading === 'convertir'}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50">
              {actionLoading === 'convertir' ? 'Création...' : 'Convertir en facture'}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handlePDF}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer">
            Générer PDF
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={async () => {
              if (!devis || !user) return
              setActionLoading('dupliquer')
              const year = new Date().getFullYear()
              const { count } = await supabase.from('devis').select('id', { count: 'exact', head: true }).eq('user_id', user.id).like('numero', `DE-${year}-%`)
              const numero = `DE-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
              const { data: nd } = await supabase.from('devis').insert({
                numero, titre: `${devis.titre} (copie)`, client_id: devis.client_id,
                montant_ht: devis.montant_ht, montant_ttc: devis.montant_ttc, tva_pct: devis.tva_pct,
                statut: 'brouillon', user_id: user.id,
              }).select('id').single()
              if (nd && lignes.length > 0) {
                await supabase.from('devis_lignes').insert(lignes.map((l, i) => ({
                  devis_id: nd.id, description: l.description, quantite: l.quantite,
                  unite: l.unite, prix_unitaire: l.prix_unitaire, total_ht: l.total_ht, ordre: i + 1,
                })))
              }
              setActionLoading('')
              if (nd) navigate(`/devis/${nd.id}`)
            }}
            disabled={actionLoading === 'dupliquer'}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer disabled:opacity-50">
            {actionLoading === 'dupliquer' ? 'Duplication...' : 'Dupliquer'}
          </motion.button>
          {isBrouillon && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/devis`)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer">
              Modifier
            </motion.button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lignes de travaux */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Lignes de travaux</h2>
              <p className="text-xs text-gray-400 mt-0.5">{lignes.length} ligne{lignes.length > 1 ? 's' : ''}</p>
            </div>
            {lignes.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">Aucune ligne de travaux</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-xs text-gray-400 uppercase font-medium">Désignation</th>
                    <th className="text-center px-4 py-3 text-xs text-gray-400 uppercase font-medium">Qté</th>
                    <th className="text-center px-4 py-3 text-xs text-gray-400 uppercase font-medium">Unité</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase font-medium">P.U. HT</th>
                    <th className="text-right px-6 py-3 text-xs text-gray-400 uppercase font-medium">Total HT</th>
                  </tr></thead>
                  <tbody>
                    {lignes.map((l, i) => (
                      <motion.tr key={l.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.03 }}
                        className="border-b border-gray-50 hover:bg-gray-50/30">
                        <td className="px-6 py-3 text-gray-900">{l.description}</td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">{l.quantite}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{l.unite}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{fmt(l.prix_unitaire)}</td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmt(l.total_ht)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Total HT</span><span className="font-medium text-gray-900 tabular-nums">{fmt(devis.montant_ht)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">TVA {devis.tva_pct}%</span><span className="font-medium text-gray-900 tabular-nums">{fmt(tva)}</span></div>
                <div className="flex justify-between text-lg pt-2 border-t border-gray-200"><span className="font-bold text-gray-900">Total TTC</span><span className="font-bold text-[#1a9e52] tabular-nums">{fmt(devis.montant_ttc)}</span></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column — client + infos */}
        <div className="space-y-6">
          {/* Client card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</h3>
            {client ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a9e52] to-emerald-400 flex items-center justify-center text-white font-semibold">
                    {(client.prenom?.[0] ?? client.nom?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{client.prenom} {client.nom}</div>
                    {client.entreprise && <div className="text-xs text-gray-400">{client.entreprise}</div>}
                  </div>
                </div>
                {client.email && <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {client.email}
                </div>}
                {client.telephone && <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {client.telephone}
                </div>}
                {(client.adresse || client.ville) && <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {[client.adresse, `${client.code_postal ?? ''} ${client.ville ?? ''}`.trim()].filter(Boolean).join(', ')}
                </div>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucun client associé</p>
            )}
          </motion.div>

          {/* Devis info card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informations</h3>
            <div className="space-y-3">
              {[
                { label: 'Numéro', value: devis.numero },
                { label: 'Date du devis', value: new Date(devis.date_devis || devis.created_at).toLocaleDateString('fr-FR') },
                { label: 'Valable jusqu\'au', value: devis.date_validite ? new Date(devis.date_validite).toLocaleDateString('fr-FR') : '—' },
                { label: 'TVA', value: devis.tva_pct === 0 ? 'Autoliquidation' : `${devis.tva_pct}%` },
                { label: 'Statut', value: st.label },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-medium text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick total card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-[#1a9e52] to-[#0e7a3c] rounded-2xl p-5 text-white">
            <div className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">Total TTC</div>
            <div className="text-3xl font-bold tabular-nums">{fmt(devis.montant_ttc)}</div>
            <div className="text-emerald-200 text-sm mt-1">HT : {fmt(devis.montant_ht)}</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
