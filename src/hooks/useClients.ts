import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logAudit } from '../lib/auditLog'

// Colonnes réelles de la table clients dans Supabase :
// id, user_id, nom, prenom, email, telephone, adresse, ville, code_postal,
// siret, entreprise, type_client, raison_sociale, nom_contact, tva_intracom,
// adresse_chantier, ville_chantier, code_postal_chantier, notes, created_at
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
  type_client: string
  raison_sociale: string
  nom_contact: string
  tva_intracom: string
  adresse_chantier: string
  ville_chantier: string
  code_postal_chantier: string
  notes: string
  created_at: string
}

export type ClientForm = Omit<Client, 'id' | 'user_id' | 'created_at'>

export function clientDisplayName(c: { type_client?: string; raison_sociale?: string; prenom?: string; nom?: string; entreprise?: string }): string {
  if (c.type_client === 'societe' && c.raison_sociale) return c.raison_sociale
  const name = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
  return c.entreprise ? `${name} — ${c.entreprise}` : name
}

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
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchClients() }, [fetchClients])

  async function createClient(form: ClientForm) {
    if (!user) return { error: 'Non connecté' }
    const { data, error: err } = await supabase
      .from('clients')
      .insert({ ...form, user_id: user.id })
      .select('id')
      .single()
    if (err) return { error: err.message }
    const label = form.type_client === 'societe' ? form.raison_sociale : `${form.prenom} ${form.nom}`
    await logAudit({ user_id: user.id, action: 'create', table_name: 'clients', record_id: data.id, details: `Client ${label} créé` })
    await fetchClients()
    return { error: null, id: data.id }
  }

  async function updateClient(id: string, form: ClientForm) {
    const { error: err } = await supabase.from('clients').update(form).eq('id', id)
    if (err) return { error: err.message }
    const label = form.type_client === 'societe' ? form.raison_sociale : `${form.prenom} ${form.nom}`
    await logAudit({ user_id: user!.id, action: 'update', table_name: 'clients', record_id: id, details: `Client ${label} modifié` })
    await fetchClients()
    return { error: null }
  }

  async function deleteClient(id: string) {
    const target = clients.find((c) => c.id === id)
    const { error: err } = await supabase.from('clients').delete().eq('id', id)
    if (err) return { error: err.message }
    if (user && target) await logAudit({ user_id: user.id, action: 'delete', table_name: 'clients', record_id: id, details: `Client ${clientDisplayName(target)} supprimé` })
    await fetchClients()
    return { error: null }
  }

  return { clients, loading, error, createClient, updateClient, deleteClient }
}
