import { useState } from 'react'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import { wrapDocText } from '../lib/exportUtils'
import { useAuthStore } from '../store/authStore'

const TRAVAUX_55 = [
  'Isolation thermique des parois opaques', 'Isolation thermique des parois vitrées',
  'Chaudière à condensation', 'Pompe à chaleur', 'Panneaux solaires thermiques',
  'Appareil de régulation de chauffage', 'Calorifugeage des installations',
]
const TRAVAUX_10 = [
  'Pose de revêtement de sol', 'Peinture intérieure', 'Remplacement de sanitaires',
  'Plomberie', 'Électricité (rénovation)', 'Menuiserie intérieure', 'Carrelage',
  'Ravalement de façade', 'Toiture (réparation)', 'Maçonnerie légère',
]

export default function AttestationTVA() {
  const { user } = useAuthStore()
  const [taux, setTaux] = useState<5.5 | 10>(10)
  const [nom, setNom] = useState('')
  const [adresse, setAdresse] = useState('')
  const [nature, setNature] = useState('')
  const [dateAttestation, setDateAttestation] = useState(new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState<string[]>([])

  const travaux = taux === 5.5 ? TRAVAUX_55 : TRAVAUX_10

  function toggle(t: string) {
    setSelected((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])
  }

  function generatePDF() {
    const doc = new jsPDF()
    wrapDocText(doc)
    const blue: [number, number, number] = [30, 64, 175]
    const entreprise = user?.user_metadata?.entreprise || 'TAYCOBAT'

    doc.setFillColor(...blue); doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(`ATTESTATION SIMPLIFIÉE — TVA ${taux}%`, 105, 14, { align: 'center' })

    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    let y = 36
    doc.text(`Entreprise : ${entreprise}`, 14, y); y += 7
    doc.text(`SIRET : ${user?.user_metadata?.siret || ''}`, 14, y); y += 12
    doc.setFont('helvetica', 'bold'); doc.text('Identité du client :', 14, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Nom : ${nom}`, 14, y); y += 7
    doc.text(`Adresse des travaux : ${adresse}`, 14, y); y += 7
    doc.text(`Date : ${new Date(dateAttestation).toLocaleDateString('fr-FR')}`, 14, y); y += 12

    doc.setFont('helvetica', 'bold'); doc.text('Nature des travaux :', 14, y); y += 7
    doc.setFont('helvetica', 'normal')
    if (nature) { doc.text(nature, 14, y); y += 7 }
    selected.forEach((t) => { doc.text(`• ${t}`, 18, y); y += 6 })

    y += 10
    doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text("Le client atteste que les travaux sont réalisés dans un local d'habitation achevé", 14, y); y += 5
    doc.text("depuis plus de 2 ans et qu'ils n'entraînent pas une augmentation de surface > 10%.", 14, y); y += 12
    doc.text('Signature du client :', 14, y); y += 3
    doc.setDrawColor(200, 200, 200); doc.roundedRect(14, y, 80, 25, 2, 2); y += 30
    doc.text("Signature de l'entreprise :", 14, y); y += 3
    doc.roundedRect(14, y, 80, 25, 2, 2)

    doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`${entreprise} — Généré par TAYCOBAT`, 105, 285, { align: 'center' })

    doc.save(`attestation-tva-${taux}.pdf`)
  }

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attestation TVA réduite</h1>
        <p className="text-gray-500 text-sm mt-0.5">Génération automatique attestation simplifiée 5,5% ou 10%</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* TVA rate */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Taux de TVA</label>
          <div className="flex gap-3">
            {([5.5, 10] as const).map((t) => (
              <button key={t} onClick={() => { setTaux(t); setSelected([]) }}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${taux === t ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {t}%<span className="block text-[10px] font-normal mt-0.5 opacity-60">{t === 5.5 ? 'Travaux énergie' : 'Rénovation'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom du client</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Date</label>
            <input type="date" value={dateAttestation} onChange={(e) => setDateAttestation(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
        </div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Adresse des travaux</label>
          <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nature des travaux (libre)</label>
          <input type="text" value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex: Rénovation salle de bain" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>

        {/* Travaux checklist */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-3">Travaux éligibles TVA {taux}%</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {travaux.map((t) => (
              <button key={t} onClick={() => toggle(t)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-all cursor-pointer ${
                selected.includes(t) ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF] font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.includes(t) ? 'border-[#1E40AF] bg-[#1E40AF]' : 'border-gray-300'}`}>
                  {selected.includes(t) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                {t}
              </button>
            ))}
          </div>
        </div>

        <motion.button onClick={generatePDF} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors cursor-pointer">
          Générer l'attestation PDF
        </motion.button>
      </motion.div>
    </div>
  )
}
