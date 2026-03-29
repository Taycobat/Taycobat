import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logAudit } from '../lib/auditLog'

// Colonnes réelles de la table devis dans Supabase
export interface DevisRow {
  id: string
  numero: string
  titre: string
  client_id: string | null
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  date_devis: string | null
  date_validite: string | null
  user_id: string
  created_at: string
  client_display: string
}

// Colonnes réelles de la table devis_lignes :
// id, devis_id, description, quantite, unite, prix_unitaire, total_ht, ordre, tva_pct
export interface DevisLigne {
  id?: string
  devis_id?: string
  description: string
  quantite: number
  unite: string
  prix_unitaire: number
  total_ht: number
}

export interface DevisCreatePayload {
  titre: string
  client_id: string | null
  tva_pct: number
  autoliquidation?: boolean
  date_devis?: string
  date_validite?: string
  lignes: Omit<DevisLigne, 'id' | 'devis_id'>[]
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

// Colonnes exactes de la table devis
const DEVIS_COLUMNS = 'id, numero, titre, client_id, montant_ht, montant_ttc, tva_pct, statut, date_devis, date_validite, user_id, created_at'

export function useDevis() {
  const { user } = useAuthStore()
  const [devisList, setDevisList] = useState<DevisRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevis = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Fetch devis
    const { data, error } = await supabase
      .from('devis')
      .select(DEVIS_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur fetch devis:', error.message)
      setDevisList([])
      setLoading(false)
      return
    }

    const rows = data ?? []

    // 2. Fetch client names for devis that have a client_id
    const clientIds = [...new Set(rows.map((d) => d.client_id).filter(Boolean))]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nom, prenom, entreprise')
        .in('id', clientIds)
      for (const c of clients ?? []) {
        const name = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
        clientMap[c.id] = c.entreprise ? `${name} — ${c.entreprise}` : name
      }
    }

    setDevisList(
      rows.map((d) => ({
        ...d,
        titre: d.titre ?? '',
        montant_ht: toNum(d.montant_ht),
        montant_ttc: toNum(d.montant_ttc),
        tva_pct: toNum(d.tva_pct),
        date_devis: d.date_devis ?? null,
        date_validite: d.date_validite ?? null,
        client_display: d.client_id ? (clientMap[d.client_id] ?? '') : '',
      })),
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDevis()
  }, [fetchDevis])

  async function generateNumero(): Promise<string> {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('devis')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .like('numero', `DE-${year}-%`)
    const next = (count ?? 0) + 1
    return `DE-${year}-${String(next).padStart(4, '0')}`
  }

  async function createDevis(payload: DevisCreatePayload) {
    if (!user) return { error: 'Non connecté' }

    const numero = await generateNumero()
    const totalHT = payload.lignes.reduce((s, l) => s + l.total_ht, 0)
    const effectiveTva = payload.autoliquidation ? 0 : payload.tva_pct
    const totalTTC = payload.autoliquidation ? totalHT : Math.round(totalHT * (1 + payload.tva_pct / 100) * 100) / 100

    const today = new Date().toISOString().split('T')[0]
    const validite = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const { data: devisData, error: errDevis } = await supabase
      .from('devis')
      .insert({
        numero,
        titre: payload.titre,
        client_id: payload.client_id,
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva_pct: effectiveTva,
        statut: 'brouillon',
        date_devis: payload.date_devis || today,
        date_validite: payload.date_validite || validite,
        user_id: user.id,
      })
      .select('id')
      .single()

    if (errDevis) return { error: errDevis.message }

    await logAudit({ user_id: user.id, action: 'create', table_name: 'devis', record_id: devisData.id, details: `Devis ${numero} créé — ${totalTTC.toFixed(2)} € TTC` })

    if (payload.lignes.length > 0) {
      const lignes = payload.lignes.map((l, i) => ({
        devis_id: devisData.id,
        description: l.description,
        quantite: l.quantite,
        unite: l.unite,
        prix_unitaire: l.prix_unitaire,
        total_ht: l.total_ht,
        ordre: i + 1,
      }))
      const { error: errLignes } = await supabase.from('devis_lignes').insert(lignes)
      if (errLignes) return { error: errLignes.message }
    }

    await fetchDevis()
    return { error: null }
  }

  async function duplicateDevis(id: string) {
    if (!user) return { error: 'Non connecté' }
    const source = devisList.find((d) => d.id === id)
    if (!source) return { error: 'Devis non trouvé' }

    const numero = await generateNumero()
    const { data: newDevis, error: errD } = await supabase.from('devis').insert({
      numero, titre: `${source.titre} (copie)`, client_id: source.client_id,
      montant_ht: source.montant_ht, montant_ttc: source.montant_ttc, tva_pct: source.tva_pct,
      statut: 'brouillon', user_id: user.id,
    }).select('id').single()
    if (errD) return { error: errD.message }

    // Copy lignes
    const { data: lignes } = await supabase.from('devis_lignes')
      .select('description, quantite, unite, prix_unitaire, total_ht, ordre, tva_pct')
      .eq('devis_id', id).order('ordre')
    if (lignes && lignes.length > 0) {
      await supabase.from('devis_lignes').insert(lignes.map((l) => ({ ...l, devis_id: newDevis.id })))
    }

    await logAudit({ user_id: user.id, action: 'create', table_name: 'devis', record_id: newDevis.id, details: `Devis ${numero} dupliqué depuis ${source.numero}` })
    await fetchDevis()
    return { error: null }
  }

  async function deleteDevis(id: string) {
    const target = devisList.find((d) => d.id === id)
    await supabase.from('devis_lignes').delete().eq('devis_id', id)
    const { error: err } = await supabase.from('devis').delete().eq('id', id)
    if (err) return { error: err.message }
    if (user && target) await logAudit({ user_id: user.id, action: 'delete', table_name: 'devis', record_id: id, details: `Devis ${target.numero} supprimé` })
    await fetchDevis()
    return { error: null }
  }

  async function updateStatut(id: string, statut: string) {
    const { error: err } = await supabase.from('devis').update({ statut }).eq('id', id)
    if (err) return { error: err.message }
    const target = devisList.find((d) => d.id === id)
    if (user && target) await logAudit({ user_id: user.id, action: 'update', table_name: 'devis', record_id: id, details: `Devis ${target.numero} → statut ${statut}` })
    await fetchDevis()
    return { error: null }
  }

  return { devisList, loading, createDevis, duplicateDevis, deleteDevis, updateStatut, fetchDevis }
}
