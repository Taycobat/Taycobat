import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Colonnes réelles de la table devis dans Supabase
export interface Devis {
  id: string
  numero: string
  montant_ht: number
  montant_ttc: number
  tva_pct: number
  statut: string
  user_id: string
  created_at: string
}

export interface KpiData {
  caMonth: number
  devisEnAttente: number
  devisTotal: number
  devisAcceptes: number
}

export interface CaDataPoint {
  mois: string
  montant: number
}

function toNumber(val: unknown): number {
  if (val == null) return 0
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? 0 : n
}

export function useDashboardData() {
  const { user } = useAuthStore()
  const [kpis, setKpis] = useState<KpiData>({
    caMonth: 0,
    devisEnAttente: 0,
    devisTotal: 0,
    devisAcceptes: 0,
  })
  const [recentDevis, setRecentDevis] = useState<Devis[]>([])
  const [caData, setCaData] = useState<CaDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchData() {
      setLoading(true)
      const uid = user!.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [devisAttente, devisTotal, devisAcceptes, allDevis, caDevisMois] =
        await Promise.all([
          // Devis en attente
          supabase
            .from('devis')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('statut', 'en_attente'),

          // Total devis
          supabase
            .from('devis')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid),

          // Devis acceptés
          supabase
            .from('devis')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('statut', 'accepte'),

          // 5 derniers devis — colonnes explicites
          supabase
            .from('devis')
            .select('id, numero, montant_ht, montant_ttc, tva_pct, statut, user_id, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(5),

          // CA du mois = somme montant_ttc des devis acceptés ce mois
          supabase
            .from('devis')
            .select('montant_ttc')
            .eq('user_id', uid)
            .eq('statut', 'accepte')
            .gte('created_at', startOfMonth),
        ])

      const caMonth = caDevisMois.data?.reduce(
        (sum, row) => sum + toNumber(row.montant_ttc),
        0,
      ) ?? 0

      setKpis({
        caMonth,
        devisEnAttente: devisAttente.count ?? 0,
        devisTotal: devisTotal.count ?? 0,
        devisAcceptes: devisAcceptes.count ?? 0,
      })

      // Derniers devis avec montants parsés en number
      setRecentDevis(
        (allDevis.data ?? []).map((d) => ({
          ...d,
          montant_ht: toNumber(d.montant_ht),
          montant_ttc: toNumber(d.montant_ttc),
          tva_pct: toNumber(d.tva_pct),
        })),
      )

      // CA par mois (6 derniers mois)
      const months: CaDataPoint[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        const label = d.toLocaleDateString('fr-FR', { month: 'short' })

        const { data } = await supabase
          .from('devis')
          .select('montant_ttc')
          .eq('user_id', uid)
          .eq('statut', 'accepte')
          .gte('created_at', d.toISOString())
          .lte('created_at', end.toISOString())

        months.push({
          mois: label.charAt(0).toUpperCase() + label.slice(1),
          montant: data?.reduce((s, row) => s + toNumber(row.montant_ttc), 0) ?? 0,
        })
      }
      setCaData(months)
      setLoading(false)
    }

    fetchData()
  }, [user])

  return { kpis, recentDevis, caData, loading }
}
