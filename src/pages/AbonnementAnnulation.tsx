import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function AbonnementAnnulation() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement annulé</h1>
        <p className="text-gray-500 mb-6">
          Pas de souci ! Votre essai gratuit de 14 jours est toujours disponible.
          Aucun montant n'a été débité.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/tarifs')}
            className="flex-1 py-3 rounded-xl bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer">
            Revoir les tarifs
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors cursor-pointer">
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  )
}
