// Supabase Edge Function — create-checkout-session
// Deploy: supabase functions deploy create-checkout-session
// Set secret: supabase secrets set STRIPE_SECRET_KEY=sk_test_...

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { priceId, customerEmail, successUrl, cancelUrl } = await req.json()

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'priceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create Stripe Checkout Session via REST API (no SDK needed in Deno)
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('line_items[0][price]', priceId)
    params.append('line_items[0][quantity]', '1')
    params.append('success_url', successUrl || 'https://taycobat.vercel.app/abonnement/succes?session_id={CHECKOUT_SESSION_ID}')
    params.append('cancel_url', cancelUrl || 'https://taycobat.vercel.app/abonnement/annulation')
    params.append('subscription_data[trial_period_days]', '14')
    params.append('allow_promotion_codes', 'true')
    if (customerEmail) {
      params.append('customer_email', customerEmail)
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Stripe error' }),
        { status: stripeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
