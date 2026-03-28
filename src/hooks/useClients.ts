import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Colonnes réelles de la table clients dans Supabase
export interface Client {
  id: string
  user_id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  adresse: string
  ville: string
  code_postal: string
  siret: string
  entreprise: string
  created_at: string
}

export type ClientForm = Omit<Client, 'id' | 'user_id' | 'created_at'>

const COLUMNS =
  'id, user_id, nom, prenom, email, telephone, adresse, ville, code_postal, siret, entreprise, created_at'

export function useClients() {
  const { user } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('clients')
      .select(COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  async function createClient(form: ClientForm) {
    if (!user) return { error: 'Non connecté' }
    const { error: err } = await supabase
      .from('clients')
      .insert({ ...form, user_id: user.id })
    if (err) return { error: err.message }
    await fetchClients()
    return { error: null }
  }

  async function updateClient(id: string, form: ClientForm) {
    const { error: err } = await supabase
      .from('clients')
      .update(form)
      .eq('id', id)
    if (err) return { error: err.message }
    await fetchClients()
    return { error: null }
  }

  async function deleteClient(id: string) {
    const { error: err } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    if (err) return { error: err.message }
    await fetchClients()
    return { error: null }
  }

  return { clients, loading, error, createClient, updateClient, deleteClient }
}
