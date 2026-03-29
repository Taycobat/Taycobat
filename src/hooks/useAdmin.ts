import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 't.coban@tayco.fr'

export interface ArtisanProfile {
  id: string
  email: string
  full_name: string | null
  plan: string | null
  stripe_customer_id: string | null
  trial_ends_at: string | null
  created_at: string
}

export function useAdmin(userEmail: string | undefined) {
  const isAdmin = userEmail === ADMIN_EMAIL
  const [artisans, setArtisans] = useState<ArtisanProfile[]>([])
  const [loading, setLoading] = useState(false)

  const fetchArtisans = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan, stripe_customer_id, trial_ends_at, created_at')
      .order('created_at', { ascending: false })
    setArtisans(data ?? [])
    setLoading(false)
  }, [isAdmin])

  useEffect(() => { fetchArtisans() }, [fetchArtisans])

  const stats = {
    total: artisans.length,
    actifs: artisans.filter((a) => a.plan && a.plan !== 'free').length,
    solo: artisans.filter((a) => a.plan === 'solo').length,
    pro: artisans.filter((a) => a.plan === 'pro').length,
    business: artisans.filter((a) => a.plan === 'business').length,
    trial: artisans.filter((a) => !a.plan || a.plan === 'free').length,
    mrr:
      artisans.filter((a) => a.plan === 'solo').length * 35 +
      artisans.filter((a) => a.plan === 'pro').length * 53 +
      artisans.filter((a) => a.plan === 'business').length * 80,
  }

  return { isAdmin, artisans, loading, stats, refetch: fetchArtisans }
}
