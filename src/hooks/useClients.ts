import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logAudit } from '../lib/auditLog'

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
    const { data, error: err } = await supabase
      .from('clients')
      .insert({ ...form, user_id: user.id })
      .select('id')
      .single()
    if (err) return { error: err.message }
    await logAudit({ user_id: user.id, action: 'create', table_name: 'clients', record_id: data.id, details: `Client ${form.prenom} ${form.nom} créé` })
    await fetchClients()
    return { error: null }
  }

  async function updateClient(id: string, form: ClientForm) {
    const { error: err } = await supabase
      .from('clients')
      .update(form)
      .eq('id', id)
    if (err) return { error: err.message }
    await logAudit({ user_id: user!.id, action: 'update', table_name: 'clients', record_id: id, details: `Client ${form.prenom} ${form.nom} modifié` })
    await fetchClients()
    return { error: null }
  }

  async function deleteClient(id: string) {
    const target = clients.find((c) => c.id === id)
    const { error: err } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    if (err) return { error: err.message }
    if (user && target) await logAudit({ user_id: user.id, action: 'delete', table_name: 'clients', record_id: id, details: `Client ${target.prenom} ${target.nom} supprimé` })
    await fetchClients()
    return { error: null }
  }

  return { clients, loading, error, createClient, updateClient, deleteClient }
}
