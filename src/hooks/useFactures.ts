import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logAudit } from '../lib/auditLog'

// Colonnes réelles de la table factures dans Supabase :
// id, user_id, numero, client_id, devis_id, type, montant_ht, montant_ttc, tva_pct,
// statut, date_emission, date_echeance, avancement_pct, retenue_garantie_pct,
// avoir_facture_id, date_paiement, mode_paiement, montant_paye, created_at
export interface Facture {
  id: string
  numero: string
  devis_id: string | null
  client_id: string | null
  type: string
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  date_emission: string
  date_echeance: string | null
  avancement_pct: number
  retenue_garantie_pct: number
  avoir_facture_id: string | null
  date_paiement: string | null
  mode_paiement: string | null
  montant_paye: number
  user_id: string
  created_at: string
  // Résolu côté client
  client_display?: string
  devis_display?: string
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

export function useFactures() {
  const { user } = useAuthStore()
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFactures = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('factures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const rows = data ?? []
    const clientIds = [...new Set(rows.map((f) => f.client_id).filter(Boolean))] as string[]
    const devisIds = [...new Set(rows.map((f) => f.devis_id).filter(Boolean))] as string[]
    let clientMap: Record<string, string> = {}
    let devisMap: Record<string, string> = {}

    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
      for (const c of clients ?? []) clientMap[c.id] = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }
    if (devisIds.length > 0) {
      const { data: devis } = await supabase.from('devis').select('id, numero, titre').in('id', devisIds)
      for (const d of devis ?? []) devisMap[d.id] = `${d.numero}${d.titre ? ' — ' + d.titre : ''}`
    }

    setFactures(rows.map((f) => ({
      ...f,
      type: f.type ?? 'facture',
      montant_ht: toNum(f.montant_ht),
      montant_ttc: toNum(f.montant_ttc),
      tva_pct: toNum(f.tva_pct),
      avancement_pct: toNum(f.avancement_pct),
      retenue_garantie_pct: toNum(f.retenue_garantie_pct),
      montant_paye: toNum(f.montant_paye),
      client_display: f.client_id ? clientMap[f.client_id] ?? '' : '',
      devis_display: f.devis_id ? devisMap[f.devis_id] ?? '' : '',
    })))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchFactures() }, [fetchFactures])

  async function generateNumero(prefix = 'FA'): Promise<string> {
    const year = new Date().getFullYear()
    const { count } = await supabase.from('factures').select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id).like('numero', `${prefix}-${year}-%`)
    return `${prefix}-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
  }

  // 1. Facturer un devis signé en 1 clic
  async function factureFromDevis(devisId: string) {
    if (!user) return { error: 'Non connecté' }
    const { data: devis } = await supabase.from('devis').select('id, client_id, montant_ht, montant_ttc, tva_pct').eq('id', devisId).single()
    if (!devis) return { error: 'Devis non trouvé' }
    const numero = await generateNumero('FA')
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: devisId, client_id: devis.client_id, type: 'facture',
      montant_ht: devis.montant_ht, montant_ttc: devis.montant_ttc, tva_pct: devis.tva_pct,
      statut: 'brouillon', date_emission: new Date().toISOString().split('T')[0],
      retenue_garantie_pct: 0, user_id: user.id,
    })
    if (error) return { error: error.message }
    await logAudit({ user_id: user.id, action: 'create', table_name: 'factures', record_id: devisId, details: `Facture ${numero} créée depuis devis` })
    await fetchFactures()
    return { error: null }
  }

  // 2. Acompte (% ou montant fixe)
  async function createAcompte(params: { devis_id: string; client_id: string | null; montant_ttc_devis: number; tva_pct: number; mode: 'pct' | 'fixe'; valeur: number }) {
    if (!user) return { error: 'Non connecté' }
    const montant_ttc = params.mode === 'pct' ? Math.round(params.montant_ttc_devis * params.valeur / 100 * 100) / 100 : params.valeur
    const montant_ht = Math.round(montant_ttc / (1 + params.tva_pct / 100) * 100) / 100
    const numero = await generateNumero('AC')
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: params.devis_id, client_id: params.client_id, type: 'acompte',
      montant_ht, montant_ttc, tva_pct: params.tva_pct, statut: 'brouillon',
      date_emission: new Date().toISOString().split('T')[0], retenue_garantie_pct: 0, user_id: user.id,
    })
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  // 3. Situation de travaux
  async function createSituation(params: {
    devis_id: string; client_id: string | null; montant_ttc_devis: number; tva_pct: number
    avancement_pct: number; retenue_garantie_pct: number
  }) {
    if (!user) return { error: 'Non connecté' }
    const existingSituations = factures.filter((f) => f.devis_id === params.devis_id && f.type === 'situation')
    const previousPct = existingSituations.reduce((s, f) => s + (f.avancement_pct ?? 0), 0)
    const tranchePct = params.avancement_pct - previousPct
    if (tranchePct <= 0) return { error: 'Le pourcentage doit être supérieur au cumul précédent' }

    const montant_ttc_brut = Math.round(params.montant_ttc_devis * tranchePct / 100 * 100) / 100
    const retenue = Math.round(montant_ttc_brut * params.retenue_garantie_pct / 100 * 100) / 100
    const montant_ttc = Math.round((montant_ttc_brut - retenue) * 100) / 100
    const montant_ht = Math.round(montant_ttc / (1 + params.tva_pct / 100) * 100) / 100

    const numero = await generateNumero('SI')
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: params.devis_id, client_id: params.client_id, type: 'situation',
      montant_ht, montant_ttc, tva_pct: params.tva_pct, statut: 'brouillon',
      date_emission: new Date().toISOString().split('T')[0],
      avancement_pct: tranchePct, retenue_garantie_pct: params.retenue_garantie_pct,
      user_id: user.id,
    })
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  // 5. Facture de solde
  async function createSolde(params: { devis_id: string; client_id: string | null; montant_ttc_devis: number; tva_pct: number }) {
    if (!user) return { error: 'Non connecté' }
    const related = factures.filter((f) => f.devis_id === params.devis_id && f.statut !== 'annulee')
    const totalFacture = related.filter((f) => f.type !== 'avoir').reduce((s, f) => s + f.montant_ttc, 0)
    const totalAvoirs = related.filter((f) => f.type === 'avoir').reduce((s, f) => s + f.montant_ttc, 0)
    const resteDu = Math.round((params.montant_ttc_devis - totalFacture + totalAvoirs) * 100) / 100
    if (resteDu <= 0) return { error: 'Aucun solde restant à facturer' }

    const montant_ht = Math.round(resteDu / (1 + params.tva_pct / 100) * 100) / 100
    const numero = await generateNumero('SO')
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: params.devis_id, client_id: params.client_id, type: 'solde',
      montant_ht, montant_ttc: resteDu, tva_pct: params.tva_pct, statut: 'brouillon',
      date_emission: new Date().toISOString().split('T')[0], retenue_garantie_pct: 0, user_id: user.id,
    })
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  // 6. Avoir (annulation, jamais suppression)
  async function createAvoir(factureId: string, montant?: number) {
    if (!user) return { error: 'Non connecté' }
    const source = factures.find((f) => f.id === factureId)
    if (!source) return { error: 'Facture non trouvée' }
    const montantAvoir = montant ?? source.montant_ttc
    const montant_ht = Math.round(montantAvoir / (1 + source.tva_pct / 100) * 100) / 100
    const numero = await generateNumero('AV')
    const { error } = await supabase.from('factures').insert({
      numero, devis_id: source.devis_id, client_id: source.client_id, type: 'avoir',
      montant_ht, montant_ttc: montantAvoir, tva_pct: source.tva_pct, statut: 'envoyee',
      date_emission: new Date().toISOString().split('T')[0], retenue_garantie_pct: 0,
      avoir_facture_id: factureId, user_id: user.id,
    })
    if (error) return { error: error.message }
    await logAudit({ user_id: user.id, action: 'create', table_name: 'factures', record_id: factureId, details: `Avoir ${numero} de ${montantAvoir.toFixed(2)} € sur facture ${source.numero}` })
    if (montantAvoir >= source.montant_ttc) {
      await supabase.from('factures').update({ statut: 'annulee' }).eq('id', factureId)
      await logAudit({ user_id: user.id, action: 'update', table_name: 'factures', record_id: factureId, details: `Facture ${source.numero} annulée par avoir ${numero}` })
    }
    await fetchFactures()
    return { error: null }
  }

  // 7. Enregistrer paiement
  async function enregistrerPaiement(id: string, params: { date: string; mode: string; montant: number }) {
    if (!user) return { error: 'Non connecté' }
    const facture = factures.find((f) => f.id === id)
    if (!facture) return { error: 'Facture non trouvée' }
    const isTotal = params.montant >= facture.montant_ttc
    const { error } = await supabase.from('factures').update({
      date_paiement: params.date, mode_paiement: params.mode, montant_paye: params.montant,
      statut: isTotal ? 'payee' : 'impayee',
    }).eq('id', id)
    if (error) return { error: error.message }
    if (facture) await logAudit({ user_id: user.id, action: 'update', table_name: 'factures', record_id: id, details: `Paiement ${params.montant.toFixed(2)} € sur ${facture.numero} par ${params.mode}` })
    await fetchFactures()
    return { error: null }
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from('factures').update({ statut }).eq('id', id)
    if (error) return { error: error.message }
    const target = factures.find((f) => f.id === id)
    if (user && target) await logAudit({ user_id: user.id, action: 'update', table_name: 'factures', record_id: id, details: `Facture ${target.numero} → statut ${statut}` })
    await fetchFactures()
    return { error: null }
  }

  return {
    factures, loading, fetchFactures,
    factureFromDevis, createAcompte, createSituation, createSolde,
    createAvoir, enregistrerPaiement, updateStatut,
  }
}
