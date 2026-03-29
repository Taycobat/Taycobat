import { loadStripe } from '@stripe/stripe-js'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined

export const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null

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
    stripePriceMonthly: (import.meta.env.VITE_STRIPE_SOLO_MONTHLY as string) || 'price_1TGH7zJtM4sMqIiXKeYT4gSo',
    stripePriceYearly: (import.meta.env.VITE_STRIPE_SOLO_YEARLY as string) || 'price_1TGH7zJtM4sMqIiX68InoNZG',
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
    stripePriceMonthly: (import.meta.env.VITE_STRIPE_PRO_MONTHLY as string) || 'price_1TGHA2JtM4sMqIiXzwhKJBm8',
    stripePriceYearly: (import.meta.env.VITE_STRIPE_PRO_YEARLY as string) || 'price_1TGHApJtM4sMqIiXzU7Fr55k',
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
    stripePriceMonthly: (import.meta.env.VITE_STRIPE_BIZ_MONTHLY as string) || 'price_1TGHCFJtM4sMqIiXI5WYeeUP',
    stripePriceYearly: (import.meta.env.VITE_STRIPE_BIZ_YEARLY as string) || 'price_1TGHD8JtM4sMqIiXL26Rt00w',
  },
} as const

export type PlanKey = keyof typeof PLANS

export async function redirectToCheckout(planKey: PlanKey, billing: 'mensuel' | 'annuel', userEmail?: string) {
  const plan = PLANS[planKey]
  const priceId = billing === 'mensuel' ? plan.stripePriceMonthly : plan.stripePriceYearly

  if (!priceId) {
    alert('Price ID Stripe non configuré pour ce plan.')
    return
  }

  const stripe = await stripePromise
  if (!stripe) {
    alert('Stripe non configuré. Ajoutez VITE_STRIPE_PUBLIC_KEY dans les variables d\'environnement Vercel.')
    return
  }

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/abonnement/annulation`,
    customerEmail: userEmail,
  })

  if (error) {
    console.error('Stripe checkout error:', error)
    alert(error.message)
  }
}
