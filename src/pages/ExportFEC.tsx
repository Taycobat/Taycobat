import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FEC_HEADER, generateFECLine } from '../lib/conformite'

function toNum(v: unknown): number { if (v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isNaN(n) ? 0 : n }

export default function ExportFEC() {
  const { user } = useAuthStore()
  const [year, setYear] = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState<{ factures: number } | null>(null)

  async function generateFEC() {
    if (!user) return
    setGenerating(true)

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    // Uniquement les factures avec statut envoyee ou payee
    const { data: factures } = await supabase
      .from('factures')
      .select('id, numero, montant_ht, montant_ttc, tva_pct, statut, created_at')
      .eq('user_id', user.id)
      .in('statut', ['envoyee', 'payee'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at')

    const lines: string[] = [FEC_HEADER]
    let num = 1

    for (const f of factures ?? []) {
      const ht = toNum(f.montant_ht)
      const ttc = toNum(f.montant_ttc)
      const tva = Math.round((ttc - ht) * 100) / 100

      // Écriture client (débit)
      lines.push(generateFECLine({
        numero: String(num++), date: f.created_at, compte: '411000', compteLib: 'Clients',
        pieceRef: f.numero, libelle: `Facture ${f.numero}`, debit: ttc, credit: 0,
      }))

      // Écriture produit HT (crédit)
      lines.push(generateFECLine({
        numero: String(num++), date: f.created_at, compte: '706000', compteLib: 'Prestations de services',
        pieceRef: f.numero, libelle: `Facture ${f.numero} — HT`, debit: 0, credit: ht,
      }))

      // Écriture TVA collectée (crédit)
      if (tva > 0) {
        lines.push(generateFECLine({
          numero: String(num++), date: f.created_at, compte: '445710', compteLib: `TVA collectée ${f.tva_pct}%`,
          pieceRef: f.numero, libelle: `TVA ${f.numero}`, debit: 0, credit: tva,
        }))
      }
    }

    setStats({ factures: (factures ?? []).length })

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `FEC_${year}.txt`; a.click()
    URL.revokeObjectURL(url)
    setGenerating(false)
  }

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Export FEC</h1>
        <p className="text-gray-500 text-sm mt-0.5">Fichier des Écritures Comptables — format DGFiP</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Exercice fiscal</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full max-w-xs px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] cursor-pointer">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 space-y-1">
          <p>Le FEC inclut :</p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>Factures avec statut <strong>envoyée</strong> ou <strong>payée</strong> uniquement</li>
            <li>Ventilation HT / TVA / TTC par facture</li>
            <li>Comptes comptables : 411 (Clients), 706 (Prestations), 44571 (TVA collectée)</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2">Les devis et brouillons ne sont jamais inclus dans le FEC.</p>
        </div>

        {stats && (
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">{stats.factures} facture{stats.factures !== 1 ? 's' : ''} exportée{stats.factures !== 1 ? 's' : ''}</div>
          </div>
        )}

        <motion.button onClick={generateFEC} disabled={generating} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
          {generating ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          Exporter FEC {year}
        </motion.button>
      </motion.div>
    </div>
  )
}
