import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AbonnementSucces() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); navigate('/dashboard'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-[#1a9e52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Abonnement activé !</h1>
        <p className="text-gray-500 mb-6">
          Merci pour votre confiance. Votre essai gratuit de 14 jours commence maintenant.
          Vous pouvez accéder à toutes les fonctionnalités de votre plan.
        </p>
        {sessionId && (
          <p className="text-xs text-gray-400 mb-4 font-mono break-all">
            Réf. : {sessionId}
          </p>
        )}
        <button onClick={() => navigate('/dashboard')}
          className="w-full py-3 rounded-xl bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer">
          Accéder au dashboard
        </button>
        <p className="text-xs text-gray-400 mt-3">Redirection automatique dans {countdown}s</p>
      </motion.div>
    </div>
  )
}
