import { supabase } from './supabase'

export const PLANS = {
  solo: {
    name: 'Solo',
    desc: 'Artisan indépendant',
    mensuel: 35,
    annuel: 29,
    obat: 39,
    features: [
      'Devis & factures illimités',
      'Bibliothèque BTP',
      'Export PDF professionnel',
      'Signature électronique',
      '1 utilisateur',
    ],
    stripePriceMonthly: 'price_1TGH7zJtM4sMqIiXKeYT4gSo',
    stripePriceYearly: 'price_1TGH7zJtM4sMqIiX68InoNZG',
  },
  pro: {
    name: 'Pro',
    desc: 'Petite entreprise',
    mensuel: 53,
    annuel: 45,
    obat: 59,
    popular: true,
    features: [
      'Tout Solo +',
      'IA Audio multilingue',
      'Gestion chantiers',
      'Situations de travaux',
      "Jusqu'à 5 utilisateurs",
      'Tableaux de bord avancés',
    ],
    stripePriceMonthly: 'price_1TGHA2JtM4sMqIiXzwhKJBm8',
    stripePriceYearly: 'price_1TGHApJtM4sMqIiXzU7Fr55k',
  },
  business: {
    name: 'Business',
    desc: 'Entreprise',
    mensuel: 80,
    annuel: 68,
    obat: 89,
    features: [
      'Tout Pro +',
      'Achats & dépenses',
      'Connexion bancaire',
      'API & intégrations',
      'Utilisateurs illimités',
      'Support prioritaire',
    ],
    stripePriceMonthly: 'price_1TGHCFJtM4sMqIiXI5WYeeUP',
    stripePriceYearly: 'price_1TGHD8JtM4sMqIiXL26Rt00w',
  },
} as const

export type PlanKey = keyof typeof PLANS

export async function redirectToCheckout(planKey: PlanKey, billing: 'mensuel' | 'annuel', userEmail?: string) {
  const plan = PLANS[planKey]
  const priceId = billing === 'mensuel' ? plan.stripePriceMonthly : plan.stripePriceYearly

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      customerEmail: userEmail,
      successUrl: `${window.location.origin}/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/abonnement/annulation`,
    },
  })

  if (error) {
    console.error('Edge function error:', error)
    alert('Erreur lors de la création de la session de paiement.')
    return
  }

  if (data?.url) {
    window.location.href = data.url
  } else {
    alert(data?.error || 'Erreur Stripe inconnue.')
  }
}
