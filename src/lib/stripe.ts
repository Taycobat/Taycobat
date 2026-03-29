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

  // Build Stripe Checkout URL via the payment link pattern
  // In production, this would call a backend endpoint to create a Checkout Session.
  // For client-only mode, we use Stripe's payment links configured in the dashboard.
  const params = new URLSearchParams({
    'prefilled_email': userEmail ?? '',
    'client_reference_id': planKey,
  })

  const paymentLinkBase = import.meta.env.VITE_STRIPE_PAYMENT_LINK_BASE as string | undefined
  if (paymentLinkBase) {
    window.location.href = `${paymentLinkBase}/${priceId}?${params.toString()}`
    return
  }

  // Fallback: use Stripe.js redirectToPaymentMethod
  const stripe = await stripePromise
  if (!stripe) {
    alert('Stripe non configuré. Ajoutez VITE_STRIPE_PUBLIC_KEY dans les variables d\'environnement Vercel.')
    return
  }

  // Use the modern Stripe embedded checkout redirect
  window.location.href = `https://checkout.stripe.com/pay/${priceId}?prefilled_email=${encodeURIComponent(userEmail ?? '')}`
}
