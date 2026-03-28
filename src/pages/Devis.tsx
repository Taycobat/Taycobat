import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDevis } from '../hooks/useDevis'
import type { DevisCreatePayload } from '../hooks/useDevis'
import DevisModal from '../components/DevisModal'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const row = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

const STATUTS = [
  { key: 'all', label: 'Tous' },
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'envoye', label: 'Envoyé' },
  { key: 'signe', label: 'Signé' },
  { key: 'refuse', label: 'Refusé' },
]

const statutStyle: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  envoye: { label: 'Envoyé', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  signe: { label: 'Signé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  accepte: { label: 'Accepté', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-600 border-red-200' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function Devis() {
  const { devisList, loading, createDevis, deleteDevis, updateStatut } = useDevis()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return devisList.filter((d) => {
      if (filterStatut !== 'all' && d.statut !== filterStatut) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (d.numero ?? '').toLowerCase().includes(q) ||
        (d.titre ?? '').toLowerCase().includes(q) ||
        (d.client_nom ?? '').toLowerCase().includes(q)
      )
    })
  }, [devisList, search, filterStatut])

  async function handleCreate(payload: DevisCreatePayload) {
    return createDevis(payload)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteDevis(id)
    setDeletingId(null)
  }

  const totalCA = devisList
    .filter((d) => d.statut === 'signe' || d.statut === 'accepte')
    .reduce((s, d) => s + d.montant_ttc, 0)

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Devis</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {devisList.length} devis &middot; CA signé : {fmt(totalCA)}
          </p>
        </div>
        <motion.button
          onClick={() => setModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau devis
        </motion.button>
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numéro, titre, client..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
          />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
          {STATUTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatut(s.key)}
              className={`px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                filterStatut === s.key
                  ? 'bg-[#1a9e52] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              {search || filterStatut !== 'all' ? 'Aucun résultat' : 'Aucun devis pour le moment'}
            </p>
            <p className="text-xs text-gray-400">
              {search ? 'Essayez un autre terme' : 'Créez votre premier devis'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Numéro</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Titre / Client</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Montant TTC</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Statut</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={container} initial="hidden" animate="show">
                {filtered.map((devis) => {
                  const st = statutStyle[devis.statut] ?? statutStyle.brouillon
                  return (
                    <motion.tr
                      key={devis.id}
                      variants={row}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Numéro */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium text-gray-900">{devis.numero}</span>
                      </td>

                      {/* Titre + Client */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
                          {devis.titre || '—'}
                        </div>
                        {devis.client_nom && (
                          <div className="text-xs text-gray-400 truncate max-w-[250px]">{devis.client_nom}</div>
                        )}
                      </td>

                      {/* Montant */}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(devis.montant_ttc)}</span>
                        <div className="text-xs text-gray-400">HT {fmt(devis.montant_ht)}</div>
                      </td>

                      {/* Statut */}
                      <td className="px-6 py-4">
                        <select
                          value={devis.statut}
                          onChange={(e) => updateStatut(devis.id, e.target.value)}
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer appearance-none bg-none ${st.cls}`}
                        >
                          <option value="brouillon">Brouillon</option>
                          <option value="envoye">Envoyé</option>
                          <option value="signe">Signé</option>
                          <option value="refuse">Refusé</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDelete(devis.id)}
                            title="Supprimer"
                            disabled={deletingId === devis.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {deletingId === devis.id ? (
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
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      <DevisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
