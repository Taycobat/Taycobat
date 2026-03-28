import { useState } from 'react'
import { motion } from 'framer-motion'

const PLANS = [
  {
    name: 'SOLO',
    desc: 'Artisan indépendant',
    mensuel: 35,
    annuel: 30,
    obat: 39,
    features: [
      'Devis & factures illimités',
      'Bibliothèque BTP',
      'Export PDF professionnel',
      'Signature électronique',
      '1 utilisateur',
    ],
  },
  {
    name: 'PRO',
    desc: 'Petite entreprise',
    mensuel: 53,
    annuel: 45,
    obat: 59,
    popular: true,
    features: [
      'Tout SOLO +',
      'IA Audio multilingue',
      'Gestion chantiers',
      'Situations de travaux',
      'Jusqu\'à 5 utilisateurs',
      'Tableaux de bord avancés',
    ],
  },
  {
    name: 'BIZ',
    desc: 'Entreprise',
    mensuel: 80,
    annuel: 68,
    obat: 89,
    features: [
      'Tout PRO +',
      'Achats & dépenses',
      'Connexion bancaire',
      'API & intégrations',
      'Utilisateurs illimités',
      'Support prioritaire',
    ],
  },
]

const FAQ = [
  { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez passer d\'un plan à l\'autre à tout moment. La différence sera calculée au prorata.' },
  { q: 'Y a-t-il un engagement ?', a: 'Aucun engagement. Vous pouvez annuler à tout moment, aucune pénalité.' },
  { q: 'L\'essai gratuit est-il vraiment gratuit ?', a: 'Oui, 14 jours gratuits sans carte bancaire. Vous décidez ensuite.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Toutes les données sont chiffrées et hébergées en Europe (Supabase EU).' },
  { q: 'La facturation multilingue est incluse ?', a: 'Oui, dans tous les plans. 12 langues supportées : français, darija, turc, roumain, polonais, etc.' },
]

function fmt(n: number) { return n.toLocaleString('fr-FR') }

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function Tarifs() {
  const [billing, setBilling] = useState<'mensuel' | 'annuel'>('mensuel')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Tarifs simples, <span className="text-[#1a9e52]">sans surprise</span>
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
              billing === 'mensuel' ? 'bg-[#1a9e52] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>Mensuel</button>
          <button onClick={() => setBilling('annuel')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              billing === 'annuel' ? 'bg-[#1a9e52] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Annuel
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              billing === 'annuel' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#1a9e52]'
            }`}>-14%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {PLANS.map((plan) => {
          const price = plan[billing]
          const saving = plan.obat - price
          return (
            <motion.div key={plan.name} variants={item} initial="hidden" animate="show"
              className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                plan.popular ? 'border-[#1a9e52] shadow-emerald-500/10' : 'border-gray-100'
              }`}>
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-[#1a9e52] text-white text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                  Le plus populaire
                </div>
              )}
              <div className={`p-6 ${plan.popular ? 'pt-10' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">{fmt(price)}</span>
                  <span className="text-gray-400 text-sm">€/mois</span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm text-gray-400 line-through">{plan.obat} € Obat</span>
                  <span className="text-xs font-bold text-[#1a9e52] bg-emerald-50 px-2 py-0.5 rounded-full">
                    -{fmt(saving)} €/mois
                  </span>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
                    plan.popular
                      ? 'bg-[#1a9e52] hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}>
                  Essai gratuit 14 jours
                </motion.button>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-[#1a9e52] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
