import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface Facture {
  id: string
  numero: string
  devis_id: string | null
  client_id: string | null
  type: 'facture' | 'acompte' | 'situation' | 'avoir'
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: 'brouillon' | 'envoyee' | 'payee' | 'impayee' | 'annulee'
  date_emission: string
  date_echeance: string | null
  user_id: string
  created_at: string
  client_display?: string
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
    const clientIds = [...new Set(rows.map((f) => f.client_id).filter(Boolean))]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
      for (const c of clients ?? []) clientMap[c.id] = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }

    setFactures(rows.map((f) => ({
      ...f,
      montant_ht: toNum(f.montant_ht),
      montant_ttc: toNum(f.montant_ttc),
      tva_pct: toNum(f.tva_pct),
      client_display: f.client_id ? clientMap[f.client_id] ?? '' : '',
    })))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchFactures() }, [fetchFactures])

  async function createFacture(f: Partial<Facture>) {
    if (!user) return { error: 'Non connecté' }
    const year = new Date().getFullYear()
    const { count } = await supabase.from('factures').select('id', { count: 'exact', head: true }).eq('user_id', user.id).like('numero', `FA-${year}-%`)
    const numero = `FA-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
    const { error } = await supabase.from('factures').insert({ ...f, numero, user_id: user.id, statut: f.statut || 'brouillon' })
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from('factures').update({ statut }).eq('id', id)
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  async function deleteFacture(id: string) {
    const { error } = await supabase.from('factures').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetchFactures()
    return { error: null }
  }

  return { factures, loading, createFacture, updateStatut, deleteFacture }
}
