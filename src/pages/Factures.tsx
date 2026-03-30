import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFactures } from '../hooks/useFactures'
import { useDevis } from '../hooks/useDevis'
import { useAuthStore } from '../store/authStore'
import type { Facture } from '../hooks/useFactures'
import { loadImageAsBase64 } from '../lib/storage'
import FactureDirecteModal from '../components/FactureDirecteModal'
import { loadLignes } from '../hooks/useFactureLignes'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } }

const TYPES = [
  { key: 'all', label: 'Toutes' }, { key: 'facture', label: 'Factures' }, { key: 'directe', label: 'Directes' },
  { key: 'acompte', label: 'Acomptes' }, { key: 'situation', label: 'Situations' }, { key: 'solde', label: 'Solde' }, { key: 'avoir', label: 'Avoirs' },
]
const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  envoyee: { label: 'Envoyée', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  payee: { label: 'Payée', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  impayee: { label: 'Impayée', cls: 'bg-red-50 text-red-600 border-red-200' },
  annulee: { label: 'Annulée', cls: 'bg-gray-50 text-gray-400 border-gray-200' },
}
const typeLabel: Record<string, string> = { facture: 'Facture', directe: 'Facture', acompte: 'Acompte', situation: 'Situation', solde: 'Solde', avoir: 'Avoir' }

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) }
function fmt0(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

export default function Factures() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { factures, loading, factureFromDevis, createAcompte, createSituation, createSolde, createAvoir, createDirecte, enregistrerPaiement, updateStatut } = useFactures()
  const [directeOpen, setDirecteOpen] = useState(false)

  useEffect(() => { if (searchParams.get('new') === '1') { setDirecteOpen(true); setSearchParams({}, { replace: true }) } }, [searchParams, setSearchParams])
  const { devisList } = useDevis()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [modal, setModal] = useState<'facturer' | 'acompte' | 'situation' | 'solde' | 'avoir' | 'paiement' | null>(null)
  const [selectedDevis, setSelectedDevis] = useState('')
  const [selectedFacture, setSelectedFacture] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Acompte form
  const [acompteMode, setAcompteMode] = useState<'pct' | 'fixe'>('pct')
  const [acompteValeur, setAcompteValeur] = useState(30)
  // Situation form
  const [sitNumero, setSitNumero] = useState(1)
  const [sitTotal, setSitTotal] = useState(4)
  const [sitAvancement, setSitAvancement] = useState(25)
  const [sitRetenue, setSitRetenue] = useState(5)
  // Avoir form
  const [avoirMontant, setAvoirMontant] = useState(0)
  const [avoirPartiel, setAvoirPartiel] = useState(false)
  // Paiement form
  const [paiDate, setPaiDate] = useState(new Date().toISOString().split('T')[0])
  const [paiMode, setPaiMode] = useState('virement')
  const [paiMontant, setPaiMontant] = useState(0)

  const devisSignes = devisList.filter((d) => d.statut === 'signe' || d.statut === 'accepte')

  const filtered = useMemo(() => factures.filter((f) => {
    if (filterType !== 'all' && f.type !== filterType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (f.numero ?? '').toLowerCase().includes(q) || (f.client_display ?? '').toLowerCase().includes(q)
  }), [factures, search, filterType])

  const totalPayee = factures.filter((f) => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0)
  const totalImpayee = factures.filter((f) => f.statut === 'impayee' || f.statut === 'envoyee').reduce((s, f) => s + f.montant_ttc, 0)
  const totalRetenue = factures.filter((f) => f.retenue_garantie_pct > 0).reduce((s, f) => s + Math.round(f.montant_ttc * f.retenue_garantie_pct / 100 * 100) / 100, 0)

  function getDevis(id: string) { return devisList.find((d) => d.id === id) }

  function openModal(type: typeof modal, factureId?: string) {
    setModal(type); setError(''); setSelectedFacture(factureId ?? '')
    if (factureId) {
      const f = factures.find((x) => x.id === factureId)
      if (f) { setAvoirMontant(f.montant_ttc); setPaiMontant(f.montant_ttc) }
    }
  }

  async function handleFacturer() {
    if (!selectedDevis) return
    setSaving(true); setError('')
    const res = await factureFromDevis(selectedDevis)
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function handleAcompte() {
    const d = getDevis(selectedDevis)
    if (!d) return
    setSaving(true); setError('')
    const res = await createAcompte({ devis_id: d.id, client_id: d.client_id, montant_ttc_devis: d.montant_ttc, tva_pct: d.tva_pct, mode: acompteMode, valeur: acompteValeur })
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function handleSituation() {
    const d = getDevis(selectedDevis)
    if (!d) return
    setSaving(true); setError('')
    const res = await createSituation({ devis_id: d.id, client_id: d.client_id, montant_ttc_devis: d.montant_ttc, tva_pct: d.tva_pct, avancement_pct: sitAvancement, retenue_garantie_pct: sitRetenue })
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function handleSolde() {
    const d = getDevis(selectedDevis)
    if (!d) return
    setSaving(true); setError('')
    const res = await createSolde({ devis_id: d.id, client_id: d.client_id, montant_ttc_devis: d.montant_ttc, tva_pct: d.tva_pct })
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function handleAvoir() {
    if (!selectedFacture) return
    setSaving(true); setError('')
    const res = await createAvoir(selectedFacture, avoirPartiel ? avoirMontant : undefined)
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function handlePaiement() {
    if (!selectedFacture) return
    setSaving(true); setError('')
    const res = await enregistrerPaiement(selectedFacture, { date: paiDate, mode: paiMode, montant: paiMontant })
    setSaving(false)
    if (res.error) setError(res.error); else setModal(null)
  }

  async function generatePDF(f: Facture) {
    const doc = new jsPDF()
    const green: [number, number, number] = [26, 158, 82]
    const mu = user?.user_metadata ?? {}
    const entreprise = mu.entreprise || 'TAYCOBAT'
    const siret = mu.siret || ''
    const formeJ = mu.forme_juridique || ''
    const adresseE = mu.adresse || ''
    const telephoneE = mu.telephone || ''
    const emailPro = mu.email_pro || ''
    const tvaIntraE = mu.tva_intracom || ''
    const ibanE = mu.iban || ''
    const condPaiement = mu.conditions_paiement || '30 jours'
    const tauxPen = mu.taux_penalites || '3 fois le taux legal'
    const nomComplet = formeJ ? `${entreprise} ${formeJ}` : entreprise
    const typeName = typeLabel[f.type] ?? 'Facture'

    // Load artisan logo
    const artisanLogoUrl = mu.logo_url as string | undefined
    let artisanLogoB64: string | null = null
    if (artisanLogoUrl) artisanLogoB64 = await loadImageAsBase64(artisanLogoUrl)

    // --- Header blanc professionnel (Art. 289 CGI) ---
    let infoX = 14; const infoY = 12
    if (artisanLogoB64) {
      try { doc.addImage(artisanLogoB64, 'PNG', 14, 10, 20, 20) } catch { /* ignore */ }
      infoX = 38
    }
    doc.setTextColor(30, 30, 30); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(nomComplet, infoX, infoY + 5)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    const hLines: string[] = []
    if (adresseE) hLines.push(adresseE)
    if (telephoneE) hLines.push(`Tel : ${telephoneE}`)
    if (emailPro) hLines.push(emailPro)
    if (siret) hLines.push(`SIRET : ${siret}`)
    if (tvaIntraE) hLines.push(`TVA : ${tvaIntraE}`)
    hLines.forEach((l, i) => doc.text(l, infoX, infoY + 11 + i * 4))

    // Document type + number
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text(typeName.toUpperCase(), 196, 16, { align: 'right' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(`N\u00b0 ${f.numero}`, 196, 23, { align: 'right' })
    doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text(`Date : ${new Date(f.date_emission || f.created_at).toLocaleDateString('fr-FR')}`, 196, 29, { align: 'right' })
    if (f.date_echeance) doc.text(`Echeance : ${new Date(f.date_echeance).toLocaleDateString('fr-FR')}`, 196, 34, { align: 'right' })

    // Green separator
    const sepY = Math.max(38, infoY + 11 + hLines.length * 4 + 2)
    doc.setDrawColor(...green); doc.setLineWidth(0.8)
    doc.line(14, sepY, 196, sepY)

    // --- Client + metadata ---
    let y = sepY + 6
    if (f.client_display) { doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(f.client_display, 14, y); y += 7 }
    if (f.devis_display) { doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.text(`Ref. devis : ${f.devis_display}`, 14, y); y += 7 }

    if (f.type === 'situation' && f.avancement_pct) {
      doc.setFontSize(9); doc.setTextColor(...green); doc.setFont('helvetica', 'bold')
      doc.text(`Situation - Avancement ${f.avancement_pct}%`, 14, y); y += 7
    }
    if (f.type === 'avoir') {
      doc.setFontSize(9); doc.setTextColor(200, 40, 40); doc.setFont('helvetica', 'bold')
      doc.text('AVOIR', 14, y); y += 7
    }

    // Adresse chantier
    if (f.adresse_chantier) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100)
      doc.text('Adresse du chantier :', 14, y); y += 4
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
      doc.text(f.adresse_chantier, 14, y); y += 7
    }

    y += 6
    // Fetch invoice line items from factures_lignes
    const lignes = await loadLignes(f.id)
    const prestations = lignes.filter((l) => l.type === 'prestation' && l.description)
    const tableData = prestations.map((l) => [l.description, String(l.quantite), l.unite, fmt(l.prix_unitaire), `${l.tva_pct}%`, fmt(l.total_ht)])

    autoTable(doc, {
      startY: y, head: [['Designation', 'Qte', 'Unite', 'P.U. HT', 'TVA', 'Total HT']],
      body: tableData.length > 0 ? tableData : [[typeName, '', '', '', `${f.tva_pct}%`, fmt(f.montant_ht)]],
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [245, 250, 247] },
      margin: { left: 14, right: 14 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 30

    // Totals block
    let totY = finalY + 8
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text('Total HT', 140, totY); doc.text(fmt(f.montant_ht), 196, totY, { align: 'right' }); totY += 5
    doc.text(`TVA ${f.tva_pct}%`, 140, totY); doc.text(fmt(f.montant_ttc - f.montant_ht), 196, totY, { align: 'right' }); totY += 5
    if (f.retenue_garantie_pct > 0) {
      const retenueAmount = Math.round(f.montant_ttc * f.retenue_garantie_pct / 100 * 100) / 100
      doc.setTextColor(180, 120, 0)
      doc.text(`Retenue garantie ${f.retenue_garantie_pct}%`, 140, totY); doc.text(`- ${fmt(retenueAmount)}`, 196, totY, { align: 'right' }); totY += 5
    }
    doc.setDrawColor(200, 200, 200); doc.line(140, totY, 196, totY); totY += 5
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text(`Net a payer : ${fmt(f.montant_ttc)}`, 196, totY, { align: 'right' })

    if (f.date_paiement) {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(`Paye le ${new Date(f.date_paiement!).toLocaleDateString('fr-FR')} par ${f.mode_paiement ?? '-'} - ${fmt(f.montant_paye)}`, 14, finalY + 20)
    }

    // --- Conditions de paiement & mentions legales (Art. 289 CGI) ---
    let condY = finalY + 28
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green)
    doc.text('CONDITIONS DE REGLEMENT', 14, condY)
    condY += 5
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(`Delai de paiement : ${condPaiement} a compter de la date de reception de la facture.`, 14, condY); condY += 4
    doc.text(`Modes de reglement acceptes : virement bancaire, cheque, carte bancaire.`, 14, condY); condY += 4
    if (ibanE) { doc.text(`Coordonnees bancaires (IBAN) : ${ibanE}`, 14, condY); condY += 4 }
    condY += 2
    doc.setFontSize(6.5); doc.setTextColor(120, 120, 120)
    doc.text(`Penalites de retard : ${tauxPen}. Exigibles sans rappel prealable (Art. L441-10 Code de commerce).`, 14, condY); condY += 3.5
    doc.text('Indemnite forfaitaire pour frais de recouvrement : 40 EUR (Art. D441-5 Code de commerce).', 14, condY); condY += 3.5
    doc.text('Pas d\'escompte pour paiement anticipe.', 14, condY)

    // --- Pied de page legal ---
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150)
    doc.setDrawColor(200, 200, 200); doc.line(14, 278, 196, 278)
    const footParts: string[] = [nomComplet]
    if (mu.capital_social) footParts.push(`Capital : ${mu.capital_social}`)
    if (mu.rcs) footParts.push(`RCS ${mu.rcs}`)
    if (siret) footParts.push(`SIRET : ${siret}`)
    if (tvaIntraE) footParts.push(`TVA : ${tvaIntraE}`)
    doc.text(footParts.join(' | '), 105, 282, { align: 'center' })
    if (adresseE || telephoneE || emailPro) {
      const footLine2 = [adresseE, telephoneE, emailPro].filter(Boolean).join(' | ')
      doc.text(footLine2, 105, 286, { align: 'center' })
    }

    doc.save(`${f.numero}.pdf`)
  }

  // Input class helper
  const ic = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Factures</h1>
          <p className="text-gray-500 text-sm mt-0.5">{factures.length} documents &middot; Encaissé : {fmt0(totalPayee)} &middot; Reste dû : {fmt0(totalImpayee)}{totalRetenue > 0 ? ` · Retenue : ${fmt0(totalRetenue)}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button onClick={() => navigate('/factures/nouvelle')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer bg-[#1a9e52] hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
            Nouvelle facture
          </motion.button>
          {[
            { label: 'Facturer un devis', modal: 'facturer' as const, cls: 'bg-white border border-[#1a9e52] text-[#1a9e52] hover:bg-emerald-50' },
            { label: 'Acompte', modal: 'acompte' as const, cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
            { label: 'Situation', modal: 'situation' as const, cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
            { label: 'Solde', modal: 'solde' as const, cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
          ].map((b) => (
            <motion.button key={b.label} onClick={() => openModal(b.modal)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${b.cls}`}>{b.label}</motion.button>
          ))}
        </div>
      </motion.div>

      {/* KPI pills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-3 mb-6 flex-wrap">
        {[{ label: 'Payées', c: factures.filter((f) => f.statut === 'payee').length, cls: 'bg-emerald-50 text-emerald-700' },
          { label: 'Impayées', c: factures.filter((f) => f.statut === 'impayee').length, cls: 'bg-red-50 text-red-600' },
          { label: 'Situations', c: factures.filter((f) => f.type === 'situation').length, cls: 'bg-blue-50 text-blue-700' },
          { label: 'Avoirs', c: factures.filter((f) => f.type === 'avoir').length, cls: 'bg-amber-50 text-amber-700' },
        ].map((p) => <div key={p.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.cls}`}>{p.c} {p.label}</div>)}
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all" />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
          {TYPES.map((t) => <button key={t.key} onClick={() => setFilterType(t.key)} className={`px-3 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${filterType === t.key ? 'bg-[#1a9e52] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{t.label}</button>)}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16"><p className="text-sm text-gray-500">Aucune facture</p><p className="text-xs text-gray-400 mt-1">Facturez un devis signé pour commencer</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Numéro</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Client / Devis</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Type</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-5 py-3">Montant</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-5 py-3">Retenue</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Statut</th>
          <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Paiement</th>
          <th className="text-right text-xs font-medium text-gray-400 uppercase px-5 py-3">Actions</th>
        </tr></thead><motion.tbody variants={container} initial="hidden" animate="show">
          {filtered.map((f) => { const st = statutStyle[f.statut] ?? statutStyle.brouillon; return (
            <motion.tr key={f.id} variants={row} onClick={() => navigate(`/factures/${f.id}`)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <td className="px-5 py-3"><span className="font-mono font-medium text-gray-900">{f.numero}</span></td>
              <td className="px-5 py-3"><div className="text-gray-900 truncate max-w-[180px]">{f.client_display || '—'}</div>
                {f.devis_display && <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{f.devis_display}</div>}
                {f.type === 'situation' && f.avancement_pct > 0 && <div className="text-[11px] text-[#1a9e52] font-medium">Situation — {f.avancement_pct}% avancement</div>}
              </td>
              <td className="px-5 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.type === 'avoir' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{typeLabel[f.type] ?? f.type}</span></td>
              <td className="px-5 py-3 text-right"><span className={`font-semibold tabular-nums ${f.type === 'avoir' ? 'text-red-600' : 'text-gray-900'}`}>{f.type === 'avoir' ? '- ' : ''}{fmt0(f.montant_ttc)}</span></td>
              <td className="px-5 py-3 text-right">{f.retenue_garantie_pct > 0 ? <span className="text-xs text-amber-600 font-medium">{f.retenue_garantie_pct}%</span> : <span className="text-gray-300">—</span>}</td>
              <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                <select value={f.statut} onChange={(e) => updateStatut(f.id, e.target.value)} className={`px-2 py-1 rounded-full text-[11px] font-medium border cursor-pointer appearance-none ${st.cls}`}>
                  <option value="brouillon">Brouillon</option><option value="envoyee">Envoyée</option><option value="payee">Payée</option><option value="impayee">Impayée</option><option value="annulee">Annulée</option>
                </select>
                {f.date_echeance && f.statut !== 'payee' && f.statut !== 'annulee' && new Date(f.date_echeance) < new Date() && (
                  <span className="block mt-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded w-fit">En retard</span>
                )}
                {f.date_echeance && <div className="text-[10px] text-gray-400 mt-0.5">Éch. {new Date(f.date_echeance).toLocaleDateString('fr-FR')}</div>}
              </td>
              <td className="px-5 py-3">{f.date_paiement
                ? <div><div className="text-xs text-emerald-600 font-medium">{fmt0(f.montant_paye ?? 0)}</div><div className="text-[10px] text-gray-400">{new Date(f.date_paiement).toLocaleDateString('fr-FR')} · {f.mode_paiement}</div></div>
                : <span className="text-gray-300 text-xs">—</span>}</td>
              <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-end gap-0.5">
                <button onClick={() => generatePDF(f)} title="PDF" className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a9e52] hover:bg-emerald-50 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
                {f.statut !== 'annulee' && f.type !== 'avoir' && <button onClick={() => openModal('paiement', f.id)} title="Paiement" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></button>}
                {f.statut !== 'annulee' && f.type !== 'avoir' && <button onClick={() => openModal('avoir', f.id)} title="Avoir" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></button>}
              </div></td>
            </motion.tr>)})}
        </motion.tbody></table></div>}
      </motion.div>

      {/* MODALS */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  {modal === 'facturer' && 'Facturer un devis signé'}
                  {modal === 'acompte' && "Facture d'acompte"}
                  {modal === 'situation' && 'Situation de travaux'}
                  {modal === 'solde' && 'Facture de solde'}
                  {modal === 'avoir' && 'Créer un avoir'}
                  {modal === 'paiement' && 'Enregistrer un paiement'}
                </h2>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

                {/* Facturer / Acompte / Situation / Solde — devis selector */}
                {['facturer', 'acompte', 'situation', 'solde'].includes(modal) && (
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Devis signé</label>
                    <select value={selectedDevis} onChange={(e) => setSelectedDevis(e.target.value)} className={ic + ' cursor-pointer'}>
                      <option value="">— Sélectionner un devis —</option>
                      {devisSignes.map((d) => <option key={d.id} value={d.id}>{d.numero} — {d.titre || d.client_display} — {fmt0(d.montant_ttc)}</option>)}
                    </select>
                    {selectedDevis && getDevis(selectedDevis) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
                        Montant TTC du devis : <span className="font-semibold text-gray-900">{fmt(getDevis(selectedDevis)!.montant_ttc)}</span>
                        {factures.filter((f) => f.devis_id === selectedDevis && f.statut !== 'annulee' && f.type !== 'avoir').length > 0 && (
                          <span className="ml-2">· Déjà facturé : <span className="font-semibold text-amber-600">{fmt0(factures.filter((f) => f.devis_id === selectedDevis && f.statut !== 'annulee' && f.type !== 'avoir').reduce((s, f) => s + f.montant_ttc, 0))}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Acompte fields */}
                {modal === 'acompte' && <>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Mode</label>
                    <div className="flex gap-2">
                      {[{ k: 'pct' as const, l: 'Pourcentage' }, { k: 'fixe' as const, l: 'Montant fixe' }].map((m) => (
                        <button key={m.k} onClick={() => setAcompteMode(m.k)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${acompteMode === m.k ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-500'}`}>{m.l}</button>
                      ))}
                    </div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">{acompteMode === 'pct' ? 'Pourcentage (%)' : 'Montant (€)'}</label>
                    <input type="number" value={acompteValeur} onChange={(e) => setAcompteValeur(parseFloat(e.target.value) || 0)} min={0} className={ic} />
                  </div>
                </>}

                {/* Situation fields */}
                {modal === 'situation' && <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Situation N°</label>
                      <input type="number" value={sitNumero} onChange={(e) => setSitNumero(parseInt(e.target.value) || 1)} min={1} className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Sur total</label>
                      <input type="number" value={sitTotal} onChange={(e) => setSitTotal(parseInt(e.target.value) || 1)} min={1} className={ic} /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Avancement cumulé (%)</label>
                    <input type="number" value={sitAvancement} onChange={(e) => setSitAvancement(parseFloat(e.target.value) || 0)} min={0} max={100} className={ic} />
                    <p className="text-xs text-gray-400 mt-1">Le montant de cette tranche = (avancement cumulé - situations précédentes) × montant devis</p>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Retenue de garantie (%)</label>
                    <input type="number" value={sitRetenue} onChange={(e) => setSitRetenue(parseFloat(e.target.value) || 0)} min={0} max={10} className={ic} /></div>
                </>}

                {/* Avoir fields */}
                {modal === 'avoir' && <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAvoirPartiel(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${!avoirPartiel ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-500'}`}>Avoir total</button>
                    <button onClick={() => setAvoirPartiel(true)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${avoirPartiel ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-500'}`}>Avoir partiel</button>
                  </div>
                  {avoirPartiel && <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Montant de l'avoir (€)</label>
                    <input type="number" value={avoirMontant} onChange={(e) => setAvoirMontant(parseFloat(e.target.value) || 0)} min={0} className={ic} /></div>}
                  <p className="text-xs text-gray-400">La facture source ne sera jamais supprimée — un avoir est créé en contrepartie.</p>
                </>}

                {/* Paiement fields */}
                {modal === 'paiement' && <>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Date d'encaissement</label>
                    <input type="date" value={paiDate} onChange={(e) => setPaiDate(e.target.value)} className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Mode de paiement</label>
                    <select value={paiMode} onChange={(e) => setPaiMode(e.target.value)} className={ic + ' cursor-pointer'}>
                      <option value="virement">Virement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option><option value="cb">Carte bancaire</option>
                    </select></div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Montant encaissé (€)</label>
                    <input type="number" value={paiMontant} onChange={(e) => setPaiMontant(parseFloat(e.target.value) || 0)} min={0} className={ic} />
                    <p className="text-xs text-gray-400 mt-1">Si le montant est inférieur au TTC, la facture restera en "impayée"</p></div>
                </>}

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button onClick={() => setModal(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer">Annuler</button>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={saving}
                    onClick={() => {
                      if (modal === 'facturer') handleFacturer()
                      else if (modal === 'acompte') handleAcompte()
                      else if (modal === 'situation') handleSituation()
                      else if (modal === 'solde') handleSolde()
                      else if (modal === 'avoir') handleAvoir()
                      else if (modal === 'paiement') handlePaiement()
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer">
                    {saving ? 'Création...' : modal === 'paiement' ? 'Enregistrer' : 'Créer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FactureDirecteModal open={directeOpen} onClose={() => setDirecteOpen(false)} onSubmit={createDirecte} />
    </div>
  )
}
