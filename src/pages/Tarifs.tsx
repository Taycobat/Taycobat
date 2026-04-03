import { useState } from 'react'
import { motion } from 'framer-motion'
import { PLANS, redirectToCheckout, type PlanKey } from '../lib/stripe'
import { useAuthStore } from '../store/authStore'

const planKeys: PlanKey[] = ['solo', 'pro', 'business']

const FAQ = [
  { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez passer d\'un plan à l\'autre à tout moment. La différence sera calculée au prorata.' },
  { q: 'Y a-t-il un engagement ?', a: 'Aucun engagement. Vous pouvez annuler à tout moment, aucune pénalité.' },
  { q: 'L\'essai gratuit est-il vraiment gratuit ?', a: 'Oui, 14 jours gratuits sans carte bancaire. Vous décidez ensuite.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Toutes les données sont chiffrées et hébergées en Europe (Supabase EU).' },
  { q: 'La facturation multilingue est incluse ?', a: 'Oui, dans tous les plans. 12 langues supportées : français, darija, turc, roumain, polonais, etc.' },
]

function fmt(n: number) { return n.toLocaleString('fr-FR') }

const anim = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' as const } }),
}

export default function Tarifs() {
  const [billing, setBilling] = useState<'mensuel' | 'annuel'>('mensuel')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)
  const { user } = useAuthStore()

  async function handleSubscribe(planKey: PlanKey) {
    setLoadingPlan(planKey)
    try {
      await redirectToCheckout(planKey, billing, user?.email ?? undefined)
    } finally {
      setLoadingPlan(null)
    }
  }

  const annualSavePct = 17

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Tarifs simples, <span className="text-[#1E40AF]">sans surprise</span>
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Moins cher que la concurrence. 14 jours d'essai gratuit, sans carte bancaire.
        </p>
      </motion.div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex">
          <button onClick={() => setBilling('mensuel')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              billing === 'mensuel' ? 'bg-[#1E40AF] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>Mensuel</button>
          <button onClick={() => setBilling('annuel')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              billing === 'annuel' ? 'bg-[#1E40AF] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Annuel
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              billing === 'annuel' ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#1E40AF]'
            }`}>-{annualSavePct}%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {planKeys.map((key, i) => {
          const plan = PLANS[key]
          const price = plan[billing]
          const saving = plan.obat - price
          const isPopular = 'popular' in plan && plan.popular
          return (
            <motion.div key={key} custom={i} variants={anim} initial="hidden" animate="show"
              className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                isPopular ? 'border-[#1E40AF] shadow-blue-500/10' : 'border-gray-100'
              }`}>
              {isPopular && (
                <div className="absolute top-0 left-0 right-0 bg-[#1E40AF] text-white text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                  Le plus populaire
                </div>
              )}
              <div className={`p-6 ${isPopular ? 'pt-10' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">{fmt(price)}</span>
                  <span className="text-gray-400 text-sm">€/mois</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-400 line-through">{plan.obat} € Obat</span>
                  <span className="text-xs font-bold text-[#1E40AF] bg-blue-50 px-2 py-0.5 rounded-full">
                    -{fmt(saving)} €/mois
                  </span>
                </div>
                {billing === 'annuel' && (
                  <p className="text-xs text-[#1E40AF] font-medium mb-4">
                    Soit {fmt(price * 12)} €/an — Économisez {fmt((plan.mensuel - price) * 12)} €/an
                  </p>
                )}
                {billing === 'mensuel' && <div className="mb-4" />}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubscribe(key)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60 ${
                    isPopular
                      ? 'bg-[#1E40AF] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}>
                  {loadingPlan === key ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirection…
                    </span>
                  ) : (
                    'Commencer l\'essai gratuit'
                  )}
                </motion.button>
                <p className="text-[11px] text-gray-400 text-center mt-2">14 jours gratuits — sans carte bancaire</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-[#1E40AF] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Comparison banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-[#1E40AF] to-[#1e3a8a] rounded-2xl p-8 text-white text-center mb-16">
        <h2 className="text-xl font-bold mb-2">Pourquoi choisir TAYCOBAT ?</h2>
        <p className="text-blue-100 mb-4 max-w-xl mx-auto text-sm">
          Jusqu'à 21 €/mois moins cher qu'Obat, avec plus de fonctionnalités : IA Audio, multilingue, conformité BTP intégrée.
        </p>
        <div className="flex justify-center gap-8 text-sm">
          <div><span className="block text-2xl font-bold">14 jours</span><span className="text-blue-200">Essai gratuit</span></div>
          <div><span className="block text-2xl font-bold">0 €</span><span className="text-blue-200">Sans carte bancaire</span></div>
          <div><span className="block text-2xl font-bold">-30%</span><span className="text-blue-200">vs Obat</span></div>
        </div>
      </motion.div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Questions fréquentes</h2>
        <div className="space-y-3">
          {FAQ.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer">
                <span className="text-sm font-medium text-gray-900">{faq.q}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="px-5 pb-4">
                  <p className="text-sm text-gray-500">{faq.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
