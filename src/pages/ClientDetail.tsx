import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }
function toNum(v: unknown): number { if (v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isNaN(n) ? 0 : n }

interface ClientData {
  id: string; nom: string; prenom: string; email: string; telephone: string
  adresse: string; ville: string; code_postal: string; type_client: string
  raison_sociale: string; nom_contact: string; siret: string; tva_intracom: string
  notes: string; created_at: string
}

interface DocRow { id: string; numero: string; montant_ttc: number; statut: string; created_at: string; type?: string }

const statutCls: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600', envoye: 'bg-blue-100 text-blue-700',
  signe: 'bg-blue-100 text-blue-700', accepte: 'bg-blue-100 text-blue-700',
  refuse: 'bg-red-100 text-red-600', payee: 'bg-blue-100 text-blue-700',
  impayee: 'bg-red-100 text-red-600', envoyee: 'bg-blue-100 text-blue-700',
  annulee: 'bg-gray-100 text-gray-400',
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [client, setClient] = useState<ClientData | null>(null)
  const [devis, setDevis] = useState<DocRow[]>([])
  const [factures, setFactures] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    const [{ data: c }, { data: d }, { data: f }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('devis').select('id, numero, montant_ttc, statut, created_at').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('factures').select('id, numero, montant_ttc, statut, type, created_at').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    setClient(c ?? null)
    setDevis((d ?? []).map((r) => ({ ...r, montant_ttc: toNum(r.montant_ttc) })))
    setFactures((f ?? []).map((r) => ({ ...r, montant_ttc: toNum(r.montant_ttc) })))
    setLoading(false)
  }, [id, user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="p-8"><div className="h-40 bg-gray-50 rounded-2xl animate-pulse" /></div>
  if (!client) return <div className="p-8 text-center text-gray-500">Client introuvable</div>

  const displayName = client.type_client === 'societe' ? client.raison_sociale : `${client.prenom} ${client.nom}`
  const totalDevis = devis.reduce((s, d) => s + d.montant_ttc, 0)
  const totalFactures = factures.reduce((s, f) => s + f.montant_ttc, 0)

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Retour aux clients
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Client info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1E40AF] to-blue-400 flex items-center justify-center text-white font-bold text-xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-sm text-gray-500">{client.type_client === 'societe' ? 'Societe' : 'Particulier'} — depuis le {new Date(client.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {client.email && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Email</p><p className="text-sm text-gray-900">{client.email}</p></div>}
            {client.telephone && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Telephone</p><p className="text-sm text-gray-900">{client.telephone}</p></div>}
            {client.adresse && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Adresse</p><p className="text-sm text-gray-900">{client.adresse}</p>{(client.code_postal || client.ville) && <p className="text-sm text-gray-500">{client.code_postal} {client.ville}</p>}</div>}
            {client.siret && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">SIRET</p><p className="text-sm font-mono text-gray-900">{client.siret}</p></div>}
            {client.tva_intracom && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">TVA intracom</p><p className="text-sm font-mono text-gray-900">{client.tva_intracom}</p></div>}
            {client.nom_contact && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Contact</p><p className="text-sm text-gray-900">{client.nom_contact}</p></div>}
          </div>
          {client.notes && <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600"><span className="text-xs text-gray-400 uppercase font-semibold">Notes : </span>{client.notes}</div>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Devis</p><p className="text-xl font-bold text-gray-900">{devis.length}</p><p className="text-xs text-gray-500">{fmt(totalDevis)}</p></div>
          <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Factures</p><p className="text-xl font-bold text-gray-900">{factures.length}</p><p className="text-xs text-gray-500">{fmt(totalFactures)}</p></div>
          <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total CA</p><p className="text-xl font-bold text-[#1E40AF]">{fmt(totalFactures)}</p></div>
        </div>

        {/* Devis list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Devis ({devis.length})</h2>
          {devis.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">Aucun devis</p> : (
            <div className="space-y-2">
              {devis.map((d) => (
                <Link key={d.id} to={`/devis/${d.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-gray-900">{d.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statutCls[d.statut] || 'bg-gray-100 text-gray-600'}`}>{d.statut}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{fmt(d.montant_ttc)}</span>
                    <span className="block text-[11px] text-gray-400">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Factures list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Factures ({factures.length})</h2>
          {factures.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">Aucune facture</p> : (
            <div className="space-y-2">
              {factures.map((f) => (
                <Link key={f.id} to={`/factures/${f.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-gray-900">{f.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statutCls[f.statut] || 'bg-gray-100 text-gray-600'}`}>{f.statut}</span>
                    {f.type === 'directe' && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Directe</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{fmt(f.montant_ttc)}</span>
                    <span className="block text-[11px] text-gray-400">{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
