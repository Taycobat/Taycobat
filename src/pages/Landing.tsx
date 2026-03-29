import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    title: 'IA Audio multilingue',
    desc: 'Dictez vos devis en français, arabe, turc, roumain... L\'IA transcrit et structure automatiquement.',
    icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    badge: 'Exclusif',
  },
  {
    title: 'Devis & factures',
    desc: 'Créez des devis pro en 2 minutes. Convertissez en facture en un clic. PDF automatique.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    title: 'Gestion chantiers',
    desc: 'Suivez l\'avancement, les situations de travaux et la retenue de garantie.',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    title: 'Conformité BTP',
    desc: 'Attestation TVA, mentions légales, autoliquidation — tout est intégré automatiquement.',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    title: 'Signature électronique',
    desc: 'Vos clients signent les devis en ligne. Valeur juridique, zéro papier.',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  },
  {
    title: 'Export comptable FEC',
    desc: 'Exportez vos données au format FEC pour votre comptable en un clic.',
    icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
]

const PLANS = [
  { name: 'Solo', price: 29, desc: 'Artisan indépendant' },
  { name: 'Pro', price: 45, desc: 'Petite entreprise', popular: true },
  { name: 'Business', price: 68, desc: 'Entreprise' },
]

const LANGUAGES = ['Francais', 'العربية', 'Turkce', 'Romana', 'Polski', 'Portugues', 'Italiano']

function Icon({ d }: { d: string }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

export default function Landing() {
  const navigate = useNavigate()
  const cta = () => navigate('/login')

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1a9e52] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">TAYCO BAT</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalites</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">Connexion</button>
            <button onClick={cta} className="text-sm font-semibold bg-[#1a9e52] hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-colors cursor-pointer">Essai gratuit</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#1a9e52] bg-emerald-50 px-3 py-1.5 rounded-full mb-6">
              Logiciel BTP multilingue
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
            Gerez votre entreprise BTP{' '}
            <span className="text-[#1a9e52]">dans votre langue</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Devis, factures, chantiers, conformite — tout en un. Dictez vos devis par la voix en 12 langues grace a l'IA Audio.
          </motion.p>

          {/* Language pills */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mb-10">
            {LANGUAGES.map((l) => (
              <span key={l} className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{l}</span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={cta}
              className="px-8 py-4 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold rounded-2xl text-lg shadow-xl shadow-emerald-500/20 transition-colors cursor-pointer">
              Commencer gratuitement
            </button>
            <p className="text-sm text-gray-400">14 jours gratuits — sans carte bancaire</p>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex justify-center gap-12 mt-16">
            {[
              { v: '12', l: 'Langues' },
              { v: '30%', l: 'Moins cher qu\'Obat' },
              { v: '2 min', l: 'Pour un devis' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{s.v}</div>
                <div className="text-sm text-gray-400 mt-1">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Tout ce qu'il faut pour votre activite BTP</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Un seul outil pour remplacer Excel, Word et vos cahiers papier.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                {f.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-[#1a9e52] bg-emerald-50 px-2 py-1 rounded-full">
                    {f.badge}
                  </span>
                )}
                <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-[#1a9e52] mb-4">
                  <Icon d={f.icon} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IA Audio highlight */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="bg-gradient-to-br from-[#1a9e52] to-[#0e7a3c] rounded-3xl p-10 md:p-16 text-white text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dictez. L'IA cree le devis.</h2>
            <p className="text-emerald-100 max-w-2xl mx-auto mb-8 text-lg leading-relaxed">
              Parlez dans votre langue — francais, arabe, turc, roumain, polonais... L'IA transcrit, traduit et structure
              votre devis automatiquement avec les prix du marche BTP francais.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Francais', 'Darija', 'Turc', 'Roumain', 'Polonais'].map((l) => (
                <span key={l} className="text-sm font-medium bg-white/10 px-4 py-2 rounded-full">{l}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Tarifs simples, sans surprise</h2>
            <p className="text-gray-500">14 jours d'essai gratuit. Sans carte bancaire.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((p) => (
              <motion.div key={p.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className={`bg-white rounded-2xl border p-6 text-center ${p.popular ? 'border-[#1a9e52] shadow-lg shadow-emerald-500/10' : 'border-gray-100'}`}>
                {p.popular && <span className="text-xs font-bold uppercase text-[#1a9e52]">Le plus populaire</span>}
                <h3 className="text-lg font-bold text-gray-900 mt-2">{p.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{p.desc}</p>
                <div className="text-4xl font-bold text-gray-900 mb-1">{p.price} <span className="text-base font-normal text-gray-400">€/mois</span></div>
                <p className="text-xs text-gray-400 mb-6">Facturation annuelle</p>
                <button onClick={cta}
                  className={`w-full py-3 rounded-xl font-semibold text-sm cursor-pointer transition-colors ${p.popular ? 'bg-[#1a9e52] hover:bg-emerald-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  Essai gratuit 14 jours
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pret a simplifier votre gestion BTP ?</h2>
            <p className="text-gray-500 mb-8 max-w-xl mx-auto">
              Rejoignez les artisans qui gagnent du temps chaque jour avec TAYCO BAT.
            </p>
            <button onClick={cta}
              className="px-8 py-4 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold rounded-2xl text-lg shadow-xl shadow-emerald-500/20 transition-colors cursor-pointer">
              Commencer l'essai gratuit
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1a9e52] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">TAYCO BAT</span>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} TAYCO BAT. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  )
}
