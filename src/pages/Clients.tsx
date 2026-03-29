import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useClients } from '../hooks/useClients'
import type { Client, ClientForm } from '../hooks/useClients'
import ClientModal from '../components/ClientModal'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const row = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

export default function Clients() {
  const navigate = useNavigate()
  const { clients, loading, createClient, updateClient, deleteClient } = useClients()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter((c) =>
      [c.nom, c.prenom, c.email, c.telephone, c.ville, c.entreprise]
        .some((v) => (v ?? '').toLowerCase().includes(q))
    )
  }, [clients, search])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setModalOpen(true)
  }

  async function handleSubmit(form: ClientForm) {
    if (editing) {
      return updateClient(editing.id, form)
    }
    return createClient(form)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteClient(id)
    setDeletingId(null)
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau client
        </motion.button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, entreprise, ville..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              {search ? 'Aucun résultat' : 'Aucun client pour le moment'}
            </p>
            <p className="text-xs text-gray-400">
              {search ? 'Essayez un autre terme de recherche' : 'Ajoutez votre premier client'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Localisation</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Entreprise</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={container} initial="hidden" animate="show">
                {filtered.map((client) => (
                  <motion.tr
                    key={client.id}
                    variants={row}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    {/* Client */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a9e52] to-emerald-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(client.prenom?.[0] ?? client.nom?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {client.prenom} {client.nom}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(client.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{client.email || '—'}</div>
                      <div className="text-xs text-gray-400">{client.telephone || '—'}</div>
                    </td>

                    {/* Localisation */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{client.ville || '—'}</div>
                      <div className="text-xs text-gray-400">{client.code_postal || ''}{client.adresse ? ` · ${client.adresse}` : ''}</div>
                    </td>

                    {/* Entreprise */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{client.entreprise || '—'}</div>
                      {client.siret && (
                        <div className="text-xs text-gray-400">SIRET {client.siret}</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(client)}
                          title="Modifier"
                          className="p-2 rounded-lg text-gray-400 hover:text-[#1a9e52] hover:bg-emerald-50 transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          title="Supprimer"
                          disabled={deletingId === client.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {deletingId === client.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <ClientModal
        open={modalOpen}
        client={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
