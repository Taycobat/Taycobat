import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

const STEPS = [
  {
    title: 'Completez votre profil',
    desc: 'Ajoutez le nom de votre entreprise, SIRET et coordonnees pour vos documents.',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    action: '/parametres',
    actionLabel: 'Completer mon profil',
  },
  {
    title: 'Ajoutez votre premier client',
    desc: 'Particulier ou societe — renseignez ses coordonnees pour vos devis et factures.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    action: '/clients',
    actionLabel: 'Ajouter un client',
  },
  {
    title: 'Creez votre premier devis',
    desc: 'Selectionnez un client, ajoutez vos lignes de chiffrage et generez un PDF pro.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    action: '/devis',
    actionLabel: 'Creer un devis',
  },
  {
    title: 'Decouvrez l\'IA Audio',
    desc: 'Dictez vos travaux par la voix dans votre langue. L\'IA genere le devis automatiquement.',
    icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    action: '/ia-audio',
    actionLabel: 'Essayer l\'IA Audio',
  },
  {
    title: 'Choisissez votre plan',
    desc: 'Solo, Pro ou Business — 14 jours gratuits pour tester toutes les fonctionnalites.',
    icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    action: '/tarifs',
    actionLabel: 'Voir les tarifs',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    const done = user.user_metadata?.onboarding_done
    const key = `tayco_onboarding_${user.id}`
    const local = localStorage.getItem(key)
    if (!done && !local) {
      setVisible(true)
    }
  }, [user])

  async function handleDismiss() {
    setDismissed(true)
    setTimeout(() => setVisible(false), 300)
    if (user) {
      localStorage.setItem(`tayco_onboarding_${user.id}`, '1')
      await supabase.auth.updateUser({ data: { onboarding_done: true } })
    }
  }

  function handleAction() {
    const s = STEPS[step]
    navigate(s.action)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleDismiss()
    }
  }

  if (!visible) return null

  const s = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 w-[380px] bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-black/10 overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <motion.div
              className="h-full bg-[#1E40AF]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-[#1E40AF] bg-blue-50 px-2 py-1 rounded-full">
                Etape {step + 1}/{STEPS.length}
              </span>
              <button onClick={handleDismiss}
                className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer" title="Fermer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}>
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E40AF] mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={handleAction}
                className="flex-1 py-2.5 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer">
                {s.actionLabel}
              </button>
              {step < STEPS.length - 1 && (
                <button onClick={() => setStep(step + 1)}
                  className="py-2.5 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  Passer
                </button>
              )}
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === step ? 'bg-[#1E40AF] w-5' : i < step ? 'bg-blue-300' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
