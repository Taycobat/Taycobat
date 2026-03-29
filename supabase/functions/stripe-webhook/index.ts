// Supabase Edge Function — stripe-webhook
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://uwdfytuvpujhiniotqyl.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TGH7zJtM4sMqIiXKeYT4gSo': 'solo',
  'price_1TGH7zJtM4sMqIiX68InoNZG': 'solo',
  'price_1TGHA2JtM4sMqIiXzwhKJBm8': 'pro',
  'price_1TGHApJtM4sMqIiXzU7Fr55k': 'pro',
  'price_1TGHCFJtM4sMqIiXI5WYeeUP': 'business',
  'price_1TGHD8JtM4sMqIiXL26Rt00w': 'business',
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=')
    if (key === 't') acc.timestamp = val
    if (key === 'v1') acc.signatures.push(val)
    return acc
  }, { timestamp: '', signatures: [] as string[] })

  if (!parts.timestamp || parts.signatures.length === 0) return false

  // Reject events older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(parts.timestamp)
  if (age > 300) return false

  const signedPayload = `${parts.timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return parts.signatures.some(s => s === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.text()
    const sigHeader = req.headers.get('stripe-signature')

    // Verify webhook signature if secret is configured
    if (webhookSecret && sigHeader) {
      const valid = await verifyStripeSignature(body, sigHeader, webhookSecret)
      if (!valid) {
        return new Response('Invalid signature', { status: 400 })
      }
    }

    const event = JSON.parse(body)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const customerEmail = session.customer_email || session.customer_details?.email
      const customerId = session.customer
      const subscriptionId = session.subscription

      // Get subscription to find the price/plan
      let plan = 'solo'
      if (subscriptionId) {
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
        })
        const sub = await subRes.json()
        const priceId = sub.items?.data?.[0]?.price?.id
        if (priceId && PRICE_TO_PLAN[priceId]) {
          plan = PRICE_TO_PLAN[priceId]
        }
      }

      // Calculate trial end (14 days from now)
      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 14)

      // Update profile by email
      if (customerEmail) {
        await supabase
          .from('profiles')
          .update({
            plan,
            stripe_customer_id: customerId,
            trial_ends_at: trialEnds.toISOString(),
          })
          .eq('email', customerEmail)
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      const customerId = sub.customer
      const priceId = sub.items?.data?.[0]?.price?.id
      const plan = (priceId && PRICE_TO_PLAN[priceId]) || 'solo'
      const status = sub.status // active, trialing, past_due, canceled, unpaid

      if (status === 'active' || status === 'trialing') {
        await supabase
          .from('profiles')
          .update({ plan })
          .eq('stripe_customer_id', customerId)
      } else if (status === 'past_due' || status === 'unpaid') {
        // Keep plan but could flag for follow-up
        await supabase
          .from('profiles')
          .update({ plan: `${plan}_past_due` })
          .eq('stripe_customer_id', customerId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const customerId = sub.customer

      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
