import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClients, clientDisplayName } from '../hooks/useClients'
import { searchSiret } from '../lib/siret'
import { logAudit } from '../lib/auditLog'
import { emptyLigne, saveLignes, UNITES, TVA_RATES, type LigneType } from '../hooks/useFactureLignes'
import { loadImageAsBase64 } from '../lib/storage'
import { DELAY_OPTIONS, METHOD_OPTIONS, loadCompanySettings, generateLegalBlock, DEFAULT_SETTINGS, type CompanyPaymentSettings, type PaymentDelayType } from '../lib/paymentConditions'
import { wrapDocText } from '../lib/exportUtils'
import LigneActions from '../components/LigneActions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Ligne = ReturnType<typeof emptyLigne>

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) }

const ic = 'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all'

export default function NouvelleFacture() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { clients } = useClients()
  const meta = user?.user_metadata ?? {}

  // Header state
  const [tab, setTab] = useState<'edition' | 'preview'>('edition')
  const [numero, setNumero] = useState('')
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().split('T')[0])
  const [dateEcheance, setDateEcheance] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })
  const [clientId, setClientId] = useState('')
  const [adresseChantier, setAdresseChantier] = useState('')
  const [retenueGarantie, setRetenueGarantie] = useState(0)
  const [description, setDescription] = useState('')
  const [ajustement, setAjustement] = useState(0)
  const [ajustementType, setAjustementType] = useState<'pct' | 'fixe'>('pct')
  const [companySettings, setCompanySettings] = useState<CompanyPaymentSettings>({ ...DEFAULT_SETTINGS })
  const [delayOverride, setDelayOverride] = useState<string>('')
  const [methodsOverride, setMethodsOverride] = useState<string[]>([])
  const [showConditions, setShowConditions] = useState(false)
  useEffect(() => { if (user) loadCompanySettings(user.id).then((s) => { setCompanySettings(s); setMethodsOverride(s.payment_methods) }) }, [user])

  // Lignes
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne(0)])

  // New client inline
  const [showNewClient, setShowNewClient] = useState(false)
  const [newType, setNewType] = useState<'particulier' | 'societe'>('particulier')
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newRaison, setNewRaison] = useState('')
  const [newSiret, setNewSiret] = useState('')
  const [searchingSiret, setSearchingSiret] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [factureId, setFactureId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate numero on mount
  useEffect(() => {
    if (!user) return
    const year = new Date().getFullYear()
    supabase.from('factures').select('id', { count: 'exact', head: true }).eq('user_id', user.id).like('numero', `FA-${year}-%`).then(({ count }) => {
      setNumero(`FA-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`)
    })
  }, [user])

  // Client change → pre-fill chantier address
  function handleClientChange(id: string) {
    setClientId(id)
    const c = clients.find((x) => x.id === id)
    if (c) {
      const parts = [c.adresse_chantier, c.ville_chantier, c.code_postal_chantier].filter(Boolean)
      if (parts.length) setAdresseChantier(parts.join(', '))
    }
  }

  // Inline client creation
  async function handleCreateClient() {
    if (!user) return
    const payload: Record<string, string> = { user_id: user.id, type_client: newType }
    if (newType === 'particulier') { payload.nom = newNom; payload.prenom = newPrenom }
    else { payload.raison_sociale = newRaison }
    const { data } = await supabase.from('clients').insert(payload).select('id').single()
    if (data) { setClientId(data.id); setShowNewClient(false); setNewNom(''); setNewPrenom(''); setNewRaison('') }
  }

  // Ligne operations
  function setLigne(i: number, key: keyof Ligne, val: string | number) {
    setLignes((ls) => ls.map((l, j) => {
      if (j !== i) return l
      const updated = { ...l, [key]: val }
      if (key === 'quantite' || key === 'prix_unitaire') {
        updated.total_ht = Math.round(Number(updated.quantite) * Number(updated.prix_unitaire) * 100) / 100
      }
      return updated
    }))
  }
  function addLigne(type: LigneType = 'prestation') { setLignes((ls) => [...ls, emptyLigne(ls.length, type)]) }
  function removeLigne(i: number) { if (lignes.length > 1) setLignes((ls) => ls.filter((_, j) => j !== i)) }
  function moveLigne(from: number, to: number) {
    if (to < 0 || to >= lignes.length) return
    setLignes((ls) => { const n = [...ls]; const [item] = n.splice(from, 1); n.splice(to, 0, item); return n })
  }
  function duplicateLigne(i: number) { setLignes((ls) => { const n = [...ls]; n.splice(i + 1, 0, { ...ls[i] }); return n }) }

  // Totals
  const prestations = lignes.filter((l) => l.type === 'prestation')
  const totalHT = prestations.reduce((s, l) => s + l.total_ht, 0)

  const ajustementAmount = ajustementType === 'pct' ? Math.round(totalHT * ajustement / 100 * 100) / 100 : ajustement
  const netHT = totalHT - ajustementAmount

  const tvaBreakdown = useMemo(() => {
    const map: Record<number, { base: number; tva: number }> = {}
    for (const l of prestations) {
      if (!map[l.tva_pct]) map[l.tva_pct] = { base: 0, tva: 0 }
      map[l.tva_pct].base += l.total_ht
      map[l.tva_pct].tva += Math.round(l.total_ht * l.tva_pct / 100 * 100) / 100
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, v]) => ({ rate: Number(rate), ...v }))
  }, [prestations])

  const totalTVA = tvaBreakdown.reduce((s, t) => s + t.tva, 0)
  const totalTTC = Math.round((netHT + totalTVA) * 100) / 100
  const retenueAmount = Math.round(totalTTC * retenueGarantie / 100 * 100) / 100
  const netAPayer = totalTTC - retenueAmount
  const hasAutoliquidation = prestations.some((l) => l.tva_pct === 0)

  // Save / Auto-save
  const doSave = useCallback(async (finalize = false) => {
    if (!user || !numero) return
    setSaving(true)
    const payload = {
      numero, client_id: clientId || null, devis_id: null, type: 'directe',
      montant_ht: Math.round(netHT * 100) / 100, montant_ttc: totalTTC,
      tva_pct: tvaBreakdown.length === 1 ? tvaBreakdown[0].rate : 0,
      statut: finalize ? 'envoyee' : 'brouillon',
      date_emission: dateEmission, date_echeance: dateEcheance,
      adresse_chantier: adresseChantier || null,
      retenue_garantie_pct: retenueGarantie, user_id: user.id,
      payment_delay_override: delayOverride || null,
      payment_methods_override: methodsOverride.length > 0 ? methodsOverride : null,
    }

    let id = factureId
    if (id) {
      await supabase.from('factures').update(payload).eq('id', id)
    } else {
      const { data } = await supabase.from('factures').insert(payload).select('id').single()
      if (data) { id = data.id; setFactureId(data.id) }
    }

    if (id) {
      await saveLignes(id, lignes)
      await logAudit({ user_id: user.id, action: factureId ? 'update' : 'create', table_name: 'factures', record_id: id, details: `Facture ${numero} ${finalize ? 'finalisee' : 'sauvegardee'}` })
    }

    setLastSaved(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    setSaving(false)

    if (finalize) navigate('/factures')
    return id
  }, [user, numero, clientId, netHT, totalTTC, tvaBreakdown, dateEmission, dateEcheance, adresseChantier, retenueGarantie, factureId, lignes, navigate])

  // Auto-save every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => { if (clientId && lignes.some((l) => l.description)) doSave() }, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [doSave, clientId, lignes])

  // PDF preview
  async function generatePreviewPDF() {
    const doc = new jsPDF()
    wrapDocText(doc)
    const blue: [number, number, number] = [30, 64, 175]
    const entreprise = meta.entreprise || 'TAYCOBAT'
    const siret = meta.siret || ''

    let artisanLogoB64: string | null = null
    if (meta.logo_url) artisanLogoB64 = await loadImageAsBase64(meta.logo_url as string)

    let infoX = 14
    if (artisanLogoB64) { try { doc.addImage(artisanLogoB64, 'PNG', 14, 10, 20, 20) } catch { /* */ }; infoX = 38 }
    doc.setTextColor(30, 30, 30); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(entreprise, infoX, 17)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    if (siret) doc.text(`SIRET : ${siret}`, infoX, 23)

    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue)
    doc.text('FACTURE', 196, 16, { align: 'right' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(`N\u00b0 ${numero}`, 196, 23, { align: 'right' })
    doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text(`Date : ${new Date(dateEmission).toLocaleDateString('fr-FR')}`, 196, 29, { align: 'right' })
    doc.setDrawColor(...blue); doc.setLineWidth(0.8); doc.line(14, 34, 196, 34)

    let y = 40
    const cl = clients.find((c) => c.id === clientId)
    if (cl) { doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(clientDisplayName(cl), 14, y); y += 7 }
    if (adresseChantier) { doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.text(`Chantier : ${adresseChantier}`, 14, y); y += 7 }

    y += 4
    const tableData = prestations.filter((l) => l.description).map((l) => [l.description, String(l.quantite), l.unite, fmt(l.prix_unitaire), `${l.tva_pct}%`, fmt(l.total_ht)])
    autoTable(doc, {
      startY: y, head: [['Designation', 'Qte', 'Unite', 'P.U. HT', 'TVA', 'Total HT']],
      body: tableData.length > 0 ? tableData : [['—', '', '', '', '', '']],
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: 14, right: 14 },
    })

    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 30
    let totY = finalY + 8
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(`Total HT`, 140, totY); doc.text(fmt(netHT), 196, totY, { align: 'right' }); totY += 5
    for (const t of tvaBreakdown) { doc.text(`TVA ${t.rate}%`, 140, totY); doc.text(fmt(t.tva), 196, totY, { align: 'right' }); totY += 5 }
    doc.setDrawColor(200, 200, 200); doc.line(140, totY, 196, totY); totY += 5
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue)
    doc.text('Net a payer', 140, totY); doc.text(fmt(netAPayer), 196, totY, { align: 'right' })

    if (hasAutoliquidation) {
      totY += 10; doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 120, 0)
      doc.text('Autoliquidation TVA — Art. 283-2 nonies du CGI. TVA due par le preneur assujetti.', 14, totY)
    }

    doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.text('TAYCOBAT', 105, 285, { align: 'center' })
    return doc.output('datauristring')
  }

  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null)
  useEffect(() => {
    if (tab === 'preview') generatePreviewPDF().then(setPdfDataUri)
  }, [tab, lignes, clientId, adresseChantier, netHT, totalTTC])

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      {/* HEADER FIXE */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/factures')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-base font-semibold text-gray-900">Nouvelle facture</h1>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {[{ k: 'edition' as const, l: 'Edition' }, { k: 'preview' as const, l: 'Previsualisation' }].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${tab === t.k ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500'}`}>{t.l}</button>
            ))}
          </div>
          {lastSaved && <span className="text-[11px] text-gray-400">Sauvegarde {lastSaved}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/factures')} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer">Annuler</button>
          <motion.button onClick={() => doSave()} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </motion.button>
          <motion.button onClick={() => doSave(true)} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
            Finaliser et envoyer
          </motion.button>
        </div>
      </div>

      {/* CONTENT */}
      {tab === 'preview' ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
          {pdfDataUri ? (
            <iframe src={pdfDataUri} className="w-full max-w-[800px] h-[85vh] rounded-xl border border-gray-200 shadow-lg bg-white" />
          ) : (
            <div className="text-gray-400 text-sm">Chargement de la previsualisation...</div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto space-y-6">

            {/* BLOC EN-TETE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gauche — Numero + dates */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Numero facture</label>
                  <input type="text" value={numero} readOnly className={ic + ' bg-gray-50 text-gray-500 font-mono'} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Date facture</label>
                    <input type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Date echeance</label>
                    <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} className={ic} /></div>
                </div>
              </div>

              {/* Droite — Client + chantier */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Client</label>
                  <div className="flex gap-2">
                    <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} className={ic + ' flex-1 cursor-pointer'}>
                      <option value="">-- Selectionner un client --</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNewClient(!showNewClient)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer flex-shrink-0 ${showNewClient ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]' : 'border-gray-200 text-gray-400 hover:text-[#1E40AF] hover:border-[#1E40AF]'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
                {showNewClient && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
                    <div className="flex gap-2">
                      {(['particulier', 'societe'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setNewType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${newType === t ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500'}`}>{t === 'particulier' ? 'Particulier' : 'Societe'}</button>
                      ))}
                    </div>
                    {newType === 'particulier' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prenom" className={ic} />
                        <input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom *" className={ic} />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={newRaison} onChange={(e) => setNewRaison(e.target.value)} placeholder="Raison sociale *" className={ic + ' flex-1'} />
                        <input value={newSiret} onChange={(e) => setNewSiret(e.target.value)} placeholder="SIRET" className={ic + ' w-40 font-mono'} />
                        <button type="button" disabled={searchingSiret || newSiret.length < 9} onClick={async () => {
                          setSearchingSiret(true); const r = await searchSiret(newSiret); if (r?.raisonSociale) setNewRaison(r.raisonSociale); setSearchingSiret(false)
                        }} className="px-3 py-2 text-xs font-semibold text-white bg-[#1E40AF] rounded-lg cursor-pointer disabled:opacity-40">
                          {searchingSiret ? '...' : 'SIRET'}
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={handleCreateClient} className="w-full py-2 rounded-lg bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer hover:bg-blue-700">Creer le client</button>
                  </div>
                )}
                <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Adresse du chantier</label>
                  <input type="text" value={adresseChantier} onChange={(e) => setAdresseChantier(e.target.value)} placeholder="12 rue des Artisans, 95000 Cergy" className={ic} /></div>
              </div>
            </div>

            {/* DESCRIPTION GENERALE */}
            {description !== null && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Description generale</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description generale de la facture (optionnel)..." className={ic + ' resize-vertical min-h-[44px]'} />
              </div>
            )}

            {/* TABLEAU LIGNES */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header tableau */}
              <div className="grid grid-cols-[40px_3fr_80px_80px_110px_90px_110px_40px] gap-1 px-4 py-2.5 bg-[#1E40AF] text-white text-[11px] font-semibold uppercase">
                <span>N°</span><span>Designation</span><span className="text-center">Qte</span><span className="text-center">Unite</span><span className="text-right">Prix U. HT</span><span className="text-center">TVA</span><span className="text-right">Total HT</span><span />
              </div>

              {/* Lignes */}
              <div className="divide-y divide-gray-50">
                {lignes.map((l, i) => {
                  if (l.type === 'section') return (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-l-4 border-[#1E40AF]">
                      <span className="text-xs font-bold text-[#1E40AF] uppercase w-10">{i + 1}</span>
                      <input type="text" value={l.description} onChange={(e) => setLigne(i, 'description', e.target.value)} placeholder="Titre de section..." className="flex-1 px-2 py-1.5 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20" />
                      <button onClick={() => removeLigne(i)} className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  )
                  if (l.type === 'texte') return (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-gray-50">
                      <span className="text-xs text-gray-400 w-10">{i + 1}</span>
                      <textarea value={l.description} onChange={(e) => setLigne(i, 'description', e.target.value)} placeholder="Texte libre..." rows={2} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 resize-vertical min-h-[40px]" />
                      <button onClick={() => removeLigne(i)} className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  )
                  if (l.type === 'saut_page') return (
                    <div key={i} className="flex items-center justify-between px-4 py-2 bg-gray-100 border-dashed border-y border-gray-300">
                      <span className="text-xs text-gray-400 italic">--- Saut de page ---</span>
                      <button onClick={() => removeLigne(i)} className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  )
                  // Prestation
                  return (
                    <div key={i} className="grid grid-cols-[40px_3fr_80px_80px_110px_90px_110px_40px] gap-1 px-4 py-2 items-start hover:bg-gray-50/50">
                      <span className="text-xs text-gray-400 pt-2.5">{i + 1}</span>
                      <div className="flex gap-1">
                        <textarea value={l.description} onChange={(e) => { setLigne(i, 'description', e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(160, Math.max(72, e.target.scrollHeight)) + 'px' }}
                          placeholder="Designation de la prestation..." rows={3}
                          className="flex-1 px-2 py-2 rounded-lg border border-gray-200 bg-white text-[14px] leading-5 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] resize-vertical min-h-[72px] max-h-[160px]" />
                        <LigneActions value={l.description} onChange={(t) => setLigne(i, 'description', t)} />
                      </div>
                      <input type="number" value={l.quantite || ''} onChange={(e) => setLigne(i, 'quantite', parseFloat(e.target.value) || 0)} min={0} step="any" className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20" />
                      <select value={l.unite} onChange={(e) => setLigne(i, 'unite', e.target.value)} className="px-1 py-2 rounded-lg border border-gray-200 bg-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20">
                        {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" value={l.prix_unitaire || ''} onChange={(e) => setLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)} min={0} step={0.01} className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20" />
                      <select value={l.tva_pct} onChange={(e) => setLigne(i, 'tva_pct', parseFloat(e.target.value))} className="px-1 py-2 rounded-lg border border-gray-200 bg-white text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20">
                        {TVA_RATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div className="py-2.5 text-sm font-semibold text-[#1E40AF] text-right tabular-nums">{fmt(l.total_ht)}</div>
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button onClick={() => moveLigne(i, i - 1)} className="p-0.5 text-gray-300 hover:text-gray-600 cursor-pointer" title="Monter"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></button>
                        <button onClick={() => moveLigne(i, i + 1)} className="p-0.5 text-gray-300 hover:text-gray-600 cursor-pointer" title="Descendre"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
                        <button onClick={() => duplicateLigne(i)} className="p-0.5 text-gray-300 hover:text-blue-500 cursor-pointer" title="Dupliquer"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                        <button onClick={() => removeLigne(i)} className="p-0.5 text-gray-300 hover:text-red-500 cursor-pointer" title="Supprimer"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* BARRE AJOUT */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-2">
                  <button onClick={() => addLigne('prestation')} className="px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer">+ Prestation</button>
                  <button onClick={() => addLigne('prestation')} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">+ Fourniture</button>
                  <button onClick={() => addLigne('prestation')} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">+ Main d'oeuvre</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addLigne('section')} className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer">Section</button>
                  <button onClick={() => addLigne('texte')} className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">Texte</button>
                  <button onClick={() => addLigne('saut_page')} className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">Saut de page</button>
                </div>
              </div>
            </div>

            {/* AJUSTEMENT */}
            {ajustement !== 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <span className="text-xs font-semibold text-gray-400 uppercase">Remise</span>
                <div className="flex gap-2">
                  <button onClick={() => setAjustementType('pct')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${ajustementType === 'pct' ? 'bg-[#1E40AF] text-white' : 'bg-gray-100 text-gray-600'}`}>%</button>
                  <button onClick={() => setAjustementType('fixe')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${ajustementType === 'fixe' ? 'bg-[#1E40AF] text-white' : 'bg-gray-100 text-gray-600'}`}>EUR</button>
                </div>
                <input type="number" value={ajustement} onChange={(e) => setAjustement(parseFloat(e.target.value) || 0)} min={0} className={ic + ' w-32'} />
                <span className="text-sm text-gray-500">= -{fmt(ajustementAmount)}</span>
              </div>
            )}
            <button onClick={() => { if (ajustement === 0) setAjustement(0.01) }} className="text-xs text-[#1E40AF] font-semibold hover:underline cursor-pointer">+ Definir un ajustement (remise)</button>

            {/* BAS — Conditions + Totaux */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conditions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">Conditions de reglement</h3>
                  <button onClick={() => setShowConditions(!showConditions)} className="text-xs text-[#1E40AF] font-semibold hover:underline cursor-pointer">{showConditions ? 'Masquer' : 'Modifier'}</button>
                </div>
                {(() => { const b = generateLegalBlock(companySettings, { delay: delayOverride || undefined, methods: methodsOverride.length ? methodsOverride : undefined }); return (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{b.delayText}</p>
                    {b.methodsText && <p>{b.methodsText}</p>}
                  </div>
                ) })()}
                {meta.iban && <p className="text-xs text-gray-500 font-mono">IBAN : {meta.iban as string}</p>}
                {showConditions && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div><label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Delai pour cette facture</label>
                      <select value={delayOverride || companySettings.payment_delay_type} onChange={(e) => setDelayOverride(e.target.value)} className={ic}>
                        {DELAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select></div>
                    <div><label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Modes de paiement</label>
                      <div className="flex flex-wrap gap-2">
                        {METHOD_OPTIONS.map((m) => (
                          <label key={m.value} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={methodsOverride.includes(m.value)} onChange={(e) => setMethodsOverride((prev) => e.target.checked ? [...prev, m.value] : prev.filter((v) => v !== m.value))}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-[#1E40AF]" />{m.label}
                          </label>
                        ))}
                      </div></div>
                  </div>
                )}
                {hasAutoliquidation && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    Autoliquidation TVA — Art. 283-2 nonies du CGI. TVA due par le preneur assujetti.
                  </div>
                )}
                <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Retenue de garantie (%)</label>
                  <input type="number" value={retenueGarantie} onChange={(e) => setRetenueGarantie(parseFloat(e.target.value) || 0)} min={0} max={10} className={ic + ' w-24'} /></div>
              </div>

              {/* Totaux */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                <div className="flex justify-between text-sm text-gray-600"><span>Total HT brut</span><span className="tabular-nums">{fmt(totalHT)}</span></div>
                {ajustementAmount > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Remise</span><span>-{fmt(ajustementAmount)}</span></div>}
                <div className="flex justify-between text-sm font-medium text-gray-900"><span>Total net HT</span><span className="tabular-nums">{fmt(netHT)}</span></div>
                {tvaBreakdown.map((t) => (
                  <div key={t.rate} className="flex justify-between text-sm text-gray-500">
                    <span>TVA {t.rate}%{t.rate === 0 ? ' (autoliquid.)' : ''}</span><span className="tabular-nums">{fmt(t.tva)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-medium"><span>Total TTC</span><span className="tabular-nums">{fmt(totalTTC)}</span></div>
                {retenueGarantie > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Retenue garantie {retenueGarantie}%</span><span>-{fmt(retenueAmount)}</span></div>}
                <div className="bg-[#1E40AF] text-white rounded-xl px-4 py-3 flex justify-between items-center mt-2">
                  <span className="font-semibold text-sm">NET A PAYER</span>
                  <span className="text-xl font-bold tabular-nums">{fmt(netAPayer)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
