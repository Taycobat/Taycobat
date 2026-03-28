import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface DevisRow {
  id: string
  numero: string
  titre: string
  client_id: string | null
  client_nom: string
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  user_id: string
  created_at: string
}

export interface DevisLigne {
  id?: string
  devis_id?: string
  designation: string
  quantite: number
  unite: string
  prix_unitaire: number
  montant_ht: number
}

export interface DevisCreatePayload {
  titre: string
  client_id: string | null
  client_nom: string
  tva_pct: number
  lignes: Omit<DevisLigne, 'id' | 'devis_id'>[]
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

export function useDevis() {
  const { user } = useAuthStore()
  const [devisList, setDevisList] = useState<DevisRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevis = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('devis')
      .select('id, numero, titre, client_id, client_nom, montant_ht, montant_ttc, tva_pct, statut, user_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setDevisList(
      (data ?? []).map((d) => ({
        ...d,
        titre: d.titre ?? '',
        client_nom: d.client_nom ?? '',
        montant_ht: toNum(d.montant_ht),
        montant_ttc: toNum(d.montant_ttc),
        tva_pct: toNum(d.tva_pct),
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
    const totalHT = payload.lignes.reduce((s, l) => s + l.montant_ht, 0)
    const totalTTC = Math.round(totalHT * (1 + payload.tva_pct / 100) * 100) / 100

    // Insert devis
    const { data: devisData, error: errDevis } = await supabase
      .from('devis')
      .insert({
        numero,
        titre: payload.titre,
        client_id: payload.client_id,
        client_nom: payload.client_nom,
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva_pct: payload.tva_pct,
        statut: 'brouillon',
        user_id: user.id,
      })
      .select('id')
      .single()

    if (errDevis) return { error: errDevis.message }

    // Insert lignes
    if (payload.lignes.length > 0) {
      const lignes = payload.lignes.map((l) => ({
        devis_id: devisData.id,
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        prix_unitaire: l.prix_unitaire,
        montant_ht: l.montant_ht,
      }))
      const { error: errLignes } = await supabase
        .from('devis_lignes')
        .insert(lignes)
      if (errLignes) return { error: errLignes.message }
    }

    await fetchDevis()
    return { error: null }
  }

  async function deleteDevis(id: string) {
    // Delete lignes first
    await supabase.from('devis_lignes').delete().eq('devis_id', id)
    const { error: err } = await supabase.from('devis').delete().eq('id', id)
    if (err) return { error: err.message }
    await fetchDevis()
    return { error: null }
  }

  async function updateStatut(id: string, statut: string) {
    const { error: err } = await supabase
      .from('devis')
      .update({ statut })
      .eq('id', id)
    if (err) return { error: err.message }
    await fetchDevis()
    return { error: null }
  }

  return { devisList, loading, createDevis, deleteDevis, updateStatut, fetchDevis }
}
