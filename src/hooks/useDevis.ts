import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

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
  user_id: string
  created_at: string
  // Résolu côté client depuis la table clients
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
  lignes: Omit<DevisLigne, 'id' | 'devis_id'>[]
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

// Colonnes exactes de la table devis
const DEVIS_COLUMNS = 'id, numero, titre, client_id, montant_ht, montant_ttc, tva_pct, statut, user_id, created_at'

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
    const totalTTC = Math.round(totalHT * (1 + payload.tva_pct / 100) * 100) / 100

    const { data: devisData, error: errDevis } = await supabase
      .from('devis')
      .insert({
        numero,
        titre: payload.titre,
        client_id: payload.client_id,
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva_pct: payload.tva_pct,
        statut: 'brouillon',
        user_id: user.id,
      })
      .select('id')
      .single()

    if (errDevis) return { error: errDevis.message }

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

  async function deleteDevis(id: string) {
    await supabase.from('devis_lignes').delete().eq('devis_id', id)
    const { error: err } = await supabase.from('devis').delete().eq('id', id)
    if (err) return { error: err.message }
    await fetchDevis()
    return { error: null }
  }

  async function updateStatut(id: string, statut: string) {
    const { error: err } = await supabase.from('devis').update({ statut }).eq('id', id)
    if (err) return { error: err.message }
    await fetchDevis()
    return { error: null }
  }

  return { devisList, loading, createDevis, deleteDevis, updateStatut, fetchDevis }
}
