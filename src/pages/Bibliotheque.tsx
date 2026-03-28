import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { METIERS } from '../lib/bibliothequeData'
import type { BiblioItem } from '../lib/bibliothequeData'

interface CartItem extends BiblioItem {
  key: string
  qty: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

const row = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

export default function Bibliotheque() {
  const [activeMetier, setActiveMetier] = useState(METIERS[0].id)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const metier = METIERS.find((m) => m.id === activeMetier) ?? METIERS[0]

  const filtered = useMemo(() => {
    if (!search) return metier.categories
    const q = search.toLowerCase()
    return metier.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => it.lib.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [metier, search])

  const allFiltered = useMemo(() => {
    if (!search) return null
    const q = search.toLowerCase()
    return METIERS.flatMap((m) =>
      m.categories.flatMap((cat) =>
        cat.items
          .filter((it) => it.lib.toLowerCase().includes(q))
          .map((it) => ({ ...it, metier: m.nom, categorie: cat.nom })),
      ),
    )
  }, [search])

  function toggleItem(item: BiblioItem, metierNom: string) {
    const key = `${metierNom}-${item.lib}`
    setCart((prev) => {
      const exists = prev.find((c) => c.key === key)
      if (exists) return prev.filter((c) => c.key !== key)
      return [...prev, { ...item, key, qty: 1 }]
    })
  }

  function updateCartQty(key: string, qty: number) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)))
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key))
  }

  function isSelected(item: BiblioItem, metierNom: string) {
    return cart.some((c) => c.key === `${metierNom}-${item.lib}`)
  }

  const totalHT = cart.reduce((s, c) => s + c.qty * c.pu, 0)
  const totalItems = METIERS.reduce((s, m) => s + m.categories.reduce((s2, c) => s2 + c.items.length, 0), 0)

  return (
    <div className="flex h-[calc(100vh)] overflow-hidden">
      {/* Sidebar métiers */}
      <div className="w-[220px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Bibliothèque BTP</h2>
          <p className="text-xs text-gray-400 mt-0.5">{totalItems} articles</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {METIERS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActiveMetier(m.id); setSearch('') }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-all cursor-pointer ${
                activeMetier === m.id
                  ? 'bg-[#1a9e52]/10 text-[#1a9e52] font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{m.icon}</span>
              <span className="truncate">{m.nom}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article dans toute la bibliothèque..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] transition-all"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Panier ({cart.length})
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {search && allFiltered ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-4">{allFiltered.length} résultat{allFiltered.length > 1 ? 's' : ''} dans tous les métiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {allFiltered.map((item, i) => (
                  <motion.div key={i} variants={row} initial="hidden" animate="show"
                    onClick={() => toggleItem(item, item.metier)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected(item, item.metier)
                        ? 'border-[#1a9e52] bg-emerald-50/50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected(item, item.metier) ? 'border-[#1a9e52] bg-[#1a9e52]' : 'border-gray-300'
                    }`}>
                      {isSelected(item, item.metier) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.lib}</div>
                      <div className="text-xs text-gray-400">{item.metier}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-[#1a9e52]">{fmt(item.pu)}</div>
                      <div className="text-xs text-gray-400">/{item.unit}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.nom} className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{cat.nom}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.items.map((item) => (
                    <motion.div key={item.lib} variants={row} initial="hidden" animate="show"
                      onClick={() => toggleItem(item, metier.nom)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected(item, metier.nom)
                          ? 'border-[#1a9e52] bg-emerald-50/50'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected(item, metier.nom) ? 'border-[#1a9e52] bg-[#1a9e52]' : 'border-gray-300'
                      }`}>
                        {isSelected(item, metier.nom) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{item.lib}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-[#1a9e52]">{fmt(item.pu)}</div>
                        <div className="text-xs text-gray-400">/{item.unit}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drawer panier */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Panier ({cart.length})</h2>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">Aucun article sélectionné</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.key} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{item.lib}</span>
                        <button onClick={() => removeFromCart(item.key)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="number" value={item.qty} min={1} onChange={(e) => updateCartQty(item.key, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        <span className="text-xs text-gray-400">{item.unit}</span>
                        <span className="text-xs text-gray-400">× {fmt(item.pu)}</span>
                        <span className="ml-auto text-sm font-semibold text-[#1a9e52]">{fmt(item.qty * item.pu)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total HT</span>
                    <span className="text-[#1a9e52]">{fmt(totalHT)}</span>
                  </div>
                  <button className="w-full py-3 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">
                    Insérer dans le devis
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
