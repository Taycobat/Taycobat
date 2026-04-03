import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { loadLignes } from '../hooks/useFactureLignes'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}
function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

interface DevisData {
  type: 'devis'
  id: string
  numero: string
  titre?: string
  client_id: string | null
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  date_devis?: string | null
  date_validite?: string | null
  adresse_chantier?: string | null
  created_at: string
}

interface FactureData {
  type: 'facture'
  id: string
  numero: string
  facture_type: string
  client_id: string | null
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  date_emission: string
  date_echeance?: string | null
  avancement_pct?: number
  retenue_garantie_pct?: number
  avoir_facture_id?: string | null
  date_paiement?: string | null
  mode_paiement?: string | null
  montant_paye?: number
  adresse_chantier?: string | null
  devis_display?: string
  created_at: string
}

type DocumentData = DevisData | FactureData

interface Props {
  open: boolean
  onClose: () => void
  document: DocumentData | null
  onDownloadPDF?: () => void
}

interface ClientInfo {
  nom: string; prenom: string; email: string; adresse: string; ville: string; code_postal: string
  entreprise?: string; raison_sociale?: string; type_client?: string; nom_contact?: string
}

interface Ligne {
  description: string; quantite: number; unite: string; prix_unitaire: number; tva_pct: number; total_ht: number
}

const typeLabel: Record<string, string> = { facture: 'FACTURE', directe: 'FACTURE', acompte: 'ACOMPTE', situation: 'SITUATION', solde: 'SOLDE', avoir: 'AVOIR' }

export default function DocumentPreview({ open, onClose, document: doc, onDownloadPDF }: Props) {
  const { user } = useAuthStore()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !doc) return
    setLoading(true)
    setClient(null)
    setLignes([])

    async function load() {
      if (!doc) return

      // Load client
      if (doc.client_id) {
        const { data: c } = await supabase.from('clients')
          .select('nom,prenom,email,adresse,ville,code_postal,entreprise,raison_sociale,type_client,nom_contact')
          .eq('id', doc.client_id).single()
        if (c) setClient(c)
      }

      // Load lignes
      if (doc.type === 'devis') {
        const { data: l } = await supabase.from('devis_lignes').select('*').eq('devis_id', doc.id).order('ordre')
        setLignes((l ?? []).map((r) => ({
          description: r.description || '', quantite: toNum(r.quantite), unite: r.unite || 'u',
          prix_unitaire: toNum(r.prix_unitaire), tva_pct: toNum(r.tva_pct), total_ht: toNum(r.total_ht),
        })))
      } else {
        const sourceId = (doc.facture_type === 'avoir' && doc.avoir_facture_id) ? doc.avoir_facture_id : doc.id
        const loaded = await loadLignes(sourceId)
        setLignes(loaded.filter((l) => l.type === 'prestation' && l.description).map((l) => ({
          description: l.description, quantite: l.quantite, unite: l.unite,
          prix_unitaire: l.prix_unitaire, tva_pct: l.tva_pct, total_ht: l.total_ht,
        })))
      }

      setLoading(false)
    }

    load()
  }, [open, doc])

  if (!doc) return null

  const meta = user?.user_metadata ?? {}
  const entreprise = meta.entreprise || 'TAYCOBAT'
  const formeJ = meta.forme_juridique || ''
  const nomComplet = formeJ ? `${entreprise} ${formeJ}` : entreprise
  const siret = meta.siret || ''
  const adresseE = meta.adresse || ''
  const telephoneE = meta.telephone || ''
  const emailPro = meta.email_pro || ''
  const tvaIntraE = meta.tva_intracom || ''
  const logoUrl = meta.logo_url as string | undefined
  const condPaiement = meta.conditions_paiement || '30 jours'
  const ibanE = meta.iban || ''
  const tauxPen = meta.taux_penalites || '3 fois le taux légal'

  const isDevis = doc.type === 'devis'
  const isFacture = doc.type === 'facture'
  const docTitle = isDevis ? 'DEVIS' : (typeLabel[(doc as FactureData).facture_type] ?? 'FACTURE')
  const tvaAmount = doc.montant_ttc - doc.montant_ht
  const retenue = isFacture && (doc as FactureData).retenue_garantie_pct
    ? Math.round(doc.montant_ttc * ((doc as FactureData).retenue_garantie_pct ?? 0) / 100 * 100) / 100
    : 0

  const clientName = client
    ? (client.type_client === 'societe' && client.raison_sociale
      ? client.raison_sociale
      : `${client.prenom || ''} ${client.nom || ''}`.trim())
    : ''

  const dateStr = isDevis
    ? new Date((doc as DevisData).date_devis || doc.created_at).toLocaleDateString('fr-FR')
    : new Date((doc as FactureData).date_emission || doc.created_at).toLocaleDateString('fr-FR')

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-gray-900/80 backdrop-blur-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900">{docTitle} {doc.numero}</h2>
              <span className="text-xs text-gray-400">Apercu</span>
            </div>
            <div className="flex items-center gap-2">
              {onDownloadPDF && (
                <button onClick={onDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-[#1a9e52] hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Telecharger PDF
                </button>
              )}
              <button onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fermer
              </button>
            </div>
          </div>

          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {loading ? (
              <div className="max-w-[800px] mx-auto space-y-6">
                <div className="h-32 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-64 bg-white/10 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="max-w-[800px] mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* A4-like page */}
                <div className="p-8 sm:p-12" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

                  {/* === HEADER === */}
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-start gap-4">
                      {logoUrl && (
                        <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-lg font-bold text-gray-900">{nomComplet}</div>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          {adresseE && <div>{adresseE}</div>}
                          {telephoneE && <div>Tel : {telephoneE}</div>}
                          {emailPro && <div>{emailPro}</div>}
                          {siret && <div>SIRET : {siret}</div>}
                          {tvaIntraE && <div>TVA : {tvaIntraE}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-[#1a9e52]">{docTitle}</div>
                      <div className="text-sm text-gray-600 mt-1">N° {doc.numero}</div>
                      <div className="text-xs text-gray-400 mt-1">Date : {dateStr}</div>
                      {isDevis && (doc as DevisData).date_validite && (
                        <div className="text-xs text-gray-400">Valable jusqu'au : {new Date((doc as DevisData).date_validite!).toLocaleDateString('fr-FR')}</div>
                      )}
                      {isFacture && (doc as FactureData).date_echeance && (
                        <div className="text-xs text-gray-400">Echeance : {new Date((doc as FactureData).date_echeance!).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  </div>

                  {/* Green separator */}
                  <div className="h-0.5 bg-[#1a9e52] mb-6" />

                  {/* === CLIENT + DEVIS TITLE === */}
                  <div className="flex justify-between items-start mb-6 gap-4">
                    <div>
                      {isDevis && (doc as DevisData).titre && (
                        <div className="text-base font-bold text-[#1a9e52] mb-2">{(doc as DevisData).titre}</div>
                      )}
                      {isFacture && (doc as FactureData).facture_type === 'situation' && (doc as FactureData).avancement_pct && (
                        <div className="text-sm font-bold text-[#1a9e52] mb-2">Situation — Avancement {(doc as FactureData).avancement_pct}%</div>
                      )}
                      {isFacture && (doc as FactureData).facture_type === 'avoir' && (
                        <div className="text-sm font-bold text-red-600 mb-2">AVOIR</div>
                      )}
                      {isFacture && (doc as FactureData).devis_display && (
                        <div className="text-xs text-gray-400">Ref. devis : {(doc as FactureData).devis_display}</div>
                      )}
                      {doc.adresse_chantier && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-gray-400">Adresse du chantier :</div>
                          <div className="text-sm text-gray-600">{doc.adresse_chantier}</div>
                        </div>
                      )}
                    </div>
                    {/* Client box */}
                    <div className="border border-gray-200 rounded-lg p-4 min-w-[240px] max-w-[280px]">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Destinataire</div>
                      {client ? (
                        <div>
                          <div className="text-sm font-bold text-gray-900">{clientName}</div>
                          {client.type_client === 'societe' && client.nom_contact && (
                            <div className="text-xs text-gray-500">{client.nom_contact}</div>
                          )}
                          {client.adresse && <div className="text-xs text-gray-500 mt-1">{client.adresse}</div>}
                          <div className="text-xs text-gray-500">{`${client.code_postal || ''} ${client.ville || ''}`.trim()}</div>
                          {client.email && <div className="text-xs text-gray-400 mt-1">{client.email}</div>}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Aucun client</div>
                      )}
                    </div>
                  </div>

                  {/* === TABLE === */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1a9e52] text-white">
                          <th className="text-left px-3 py-2 font-semibold text-xs">Designation</th>
                          <th className="text-center px-2 py-2 font-semibold text-xs w-16">Qte</th>
                          <th className="text-center px-2 py-2 font-semibold text-xs w-16">Unite</th>
                          <th className="text-right px-2 py-2 font-semibold text-xs w-24">P.U. HT</th>
                          <th className="text-right px-2 py-2 font-semibold text-xs w-16">TVA</th>
                          <th className="text-right px-3 py-2 font-semibold text-xs w-24">Total HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.length > 0 ? lignes.map((l, i) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-emerald-50/40' : ''}>
                            <td className="px-3 py-2 text-gray-900">{l.description}</td>
                            <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{l.quantite}</td>
                            <td className="px-2 py-2 text-center text-gray-500">{l.unite}</td>
                            <td className="px-2 py-2 text-right text-gray-600 tabular-nums">{fmt(l.prix_unitaire)}</td>
                            <td className="px-2 py-2 text-right text-gray-500 tabular-nums">{l.tva_pct}%</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">{fmt(l.total_ht)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">Aucune ligne</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* === TOTAUX === */}
                  <div className="flex justify-end mb-8">
                    <div className="w-64 bg-emerald-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total HT</span>
                        <span className="font-medium text-gray-900 tabular-nums">{fmt(doc.montant_ht)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">TVA {doc.tva_pct}%</span>
                        <span className="font-medium text-gray-900 tabular-nums">{fmt(tvaAmount)}</span>
                      </div>
                      {retenue > 0 && (
                        <div className="flex justify-between text-sm text-amber-600">
                          <span>Retenue garantie {(doc as FactureData).retenue_garantie_pct}%</span>
                          <span>-{fmt(retenue)}</span>
                        </div>
                      )}
                      <div className="border-t border-emerald-200 pt-2 flex justify-between">
                        <span className="font-bold text-gray-900">{isDevis ? 'Total TTC' : 'Net a payer'}</span>
                        <span className="font-bold text-[#1a9e52] text-lg tabular-nums">{fmt(doc.montant_ttc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* === PAIEMENT ENREGISTRE (facture only) === */}
                  {isFacture && (doc as FactureData).date_paiement && (
                    <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="text-xs font-semibold text-emerald-700 uppercase mb-1">Paiement enregistre</div>
                      <div className="text-sm text-emerald-800">
                        {fmt((doc as FactureData).montant_paye ?? 0)} — {(doc as FactureData).mode_paiement} — {new Date((doc as FactureData).date_paiement!).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}

                  {/* === SIGNATURES (devis only) === */}
                  {isDevis && (
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div>
                        <div className="text-xs text-gray-400 mb-2">Signature de l'artisan</div>
                        <div className="h-20 border border-gray-200 rounded-lg" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-2">Signature du client (bon pour accord)</div>
                        <div className="h-20 border border-gray-200 rounded-lg" />
                      </div>
                    </div>
                  )}

                  {/* === CONDITIONS DE PAIEMENT === */}
                  <div className="mb-6">
                    {isDevis ? (
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Conditions de reglement : {condPaiement} a compter de la date d'acceptation du devis.</div>
                        <div>Validite du devis : {(doc as DevisData).date_validite ? new Date((doc as DevisData).date_validite!).toLocaleDateString('fr-FR') : '30 jours'}.</div>
                        {doc.tva_pct === 0 && (
                          <div className="mt-2">
                            <div className="font-bold text-amber-600 text-xs">AUTOLIQUIDATION DE LA TVA</div>
                            <div className="text-amber-500">Autoliquidation de la TVA - Article 283-2 nonies du CGI. TVA due par le preneur assujetti.</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[#1a9e52] uppercase mb-2">Conditions de reglement</div>
                        <div className="text-xs text-gray-400">Delai de paiement : {condPaiement} a compter de la date de reception de la facture.</div>
                        <div className="text-xs text-gray-400">Modes de reglement acceptes : virement bancaire, cheque, carte bancaire.</div>
                        {ibanE && <div className="text-xs text-gray-400">Coordonnees bancaires (IBAN) : {ibanE}</div>}
                        <div className="text-[10px] text-gray-300 mt-2">
                          Penalites de retard : {tauxPen}. Exigibles sans rappel prealable (Art. L441-10 Code de commerce).
                        </div>
                        <div className="text-[10px] text-gray-300">
                          Indemnite forfaitaire pour frais de recouvrement : 40 EUR (Art. D441-5 Code de commerce).
                        </div>
                        <div className="text-[10px] text-gray-300">Pas d'escompte pour paiement anticipe.</div>
                      </div>
                    )}
                  </div>

                  {/* === FOOTER LEGAL === */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-[10px] text-gray-300 text-center">
                      {[nomComplet, meta.capital_social ? `Capital : ${meta.capital_social}` : '', meta.rcs ? `RCS ${meta.rcs}` : '', siret ? `SIRET : ${siret}` : '', tvaIntraE ? `TVA : ${tvaIntraE}` : ''].filter(Boolean).join(' | ')}
                    </div>
                    {(adresseE || telephoneE || emailPro) && (
                      <div className="text-[10px] text-gray-300 text-center mt-0.5">
                        {[adresseE, telephoneE, emailPro].filter(Boolean).join(' | ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
