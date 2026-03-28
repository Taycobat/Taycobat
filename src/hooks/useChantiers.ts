import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface Chantier {
  id: string
  nom: string
  adresse: string
  client_id: string | null
  budget_prevu: number
  budget_realise: number
  statut: 'planifie' | 'en_cours' | 'termine' | 'suspendu'
  date_debut: string | null
  date_fin: string | null
  progression: number
  notes: string
  user_id: string
  created_at: string
  client_display?: string
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

export function useChantiers() {
  const { user } = useAuthStore()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChantiers = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('chantiers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    const rows = data ?? []
    const clientIds = [...new Set(rows.map((c) => c.client_id).filter(Boolean))]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
      for (const c of clients ?? []) clientMap[c.id] = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }
    setChantiers(rows.map((c) => ({
      ...c, budget_prevu: toNum(c.budget_prevu), budget_realise: toNum(c.budget_realise),
      progression: toNum(c.progression), client_display: c.client_id ? clientMap[c.client_id] ?? '' : '',
    })))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchChantiers() }, [fetchChantiers])

  async function createChantier(c: Partial<Chantier>) {
    if (!user) return { error: 'Non connecté' }
    const { error } = await supabase.from('chantiers').insert({ ...c, user_id: user.id, statut: 'planifie', progression: 0 })
    if (error) return { error: error.message }
    await fetchChantiers()
    return { error: null }
  }

  async function updateChantier(id: string, c: Partial<Chantier>) {
    const { error } = await supabase.from('chantiers').update(c).eq('id', id)
    if (error) return { error: error.message }
    await fetchChantiers()
    return { error: null }
  }

  async function deleteChantier(id: string) {
    const { error } = await supabase.from('chantiers').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetchChantiers()
    return { error: null }
  }

  return { chantiers, loading, createChantier, updateChantier, deleteChantier }
}
