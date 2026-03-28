import type { User } from '@supabase/supabase-js'

export function getDisplayName(user: User | null): string {
  if (!user) return 'Utilisateur'
  const meta = user.user_metadata ?? {}
  return (
    meta.prenom ||
    meta.full_name ||
    meta.name ||
    meta.nom ||
    meta.first_name ||
    'Utilisateur'
  )
}
