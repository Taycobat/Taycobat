import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface KpiData {
  caMonth: number
  facturesImpayees: number
  clientsActifs: number
  devisEnAttente: number
}

export interface CaDataPoint {
  mois: string
  montant: number
}

export interface RecentDevis {
  id: string
  numero: string
  montant_ttc: number
  statut: string
  created_at: string
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
    facturesImpayees: 0,
    clientsActifs: 0,
    devisEnAttente: 0,
  })
  const [recentDevis, setRecentDevis] = useState<RecentDevis[]>([])
  const [caData, setCaData] = useState<CaDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function fetchData() {
      setLoading(true)
      const uid = user!.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [caRes, impayeesRes, clientsRes, devisAttenteRes, recentDevisRes] =
        await Promise.all([
          // 1. CA du mois = factures payee ou envoyee du mois en cours
          supabase
            .from('factures')
            .select('montant_ttc')
            .eq('user_id', uid)
            .in('statut', ['payee', 'envoyee'])
            .gte('created_at', startOfMonth),

          // 3. Factures impayées = statut envoyee depuis plus de 30 jours
          supabase
            .from('factures')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('statut', 'envoyee')
            .lte('created_at', thirtyDaysAgo),

          // 4. Clients actifs = clients ayant au moins une facture
          supabase
            .from('factures')
            .select('client_id')
            .eq('user_id', uid)
            .not('client_id', 'is', null),

          // Devis en attente (brouillon ou envoye)
          supabase
            .from('devis')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .in('statut', ['brouillon', 'envoye', 'en_attente']),

          // 5 derniers devis
          supabase
            .from('devis')
            .select('id, numero, montant_ttc, statut, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(5),
        ])

      // CA du mois
      const caMonth = caRes.data?.reduce((sum, row) => sum + toNumber(row.montant_ttc), 0) ?? 0

      // Clients actifs = nombre de client_id distincts dans factures
      const uniqueClients = new Set((clientsRes.data ?? []).map((r) => r.client_id).filter(Boolean))

      setKpis({
        caMonth,
        facturesImpayees: impayeesRes.count ?? 0,
        clientsActifs: uniqueClients.size,
        devisEnAttente: devisAttenteRes.count ?? 0,
      })

      setRecentDevis(
        (recentDevisRes.data ?? []).map((d) => ({
          ...d,
          montant_ttc: toNumber(d.montant_ttc),
        })),
      )

      // 2. Graphique CA 6 mois = somme factures payee/envoyee par mois
      const months: CaDataPoint[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        const label = d.toLocaleDateString('fr-FR', { month: 'short' })

        const { data } = await supabase
          .from('factures')
          .select('montant_ttc')
          .eq('user_id', uid)
          .in('statut', ['payee', 'envoyee'])
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
