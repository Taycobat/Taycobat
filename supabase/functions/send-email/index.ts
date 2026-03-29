// Supabase Edge Function — send-email (via Resend)
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Set secret: supabase secrets set RESEND_API_KEY=re_...

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GREEN = '#1a9e52'
const GREEN_DARK = '#0e7a3c'

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:linear-gradient(135deg,${GREEN},${GREEN_DARK});padding:32px 40px">
<table><tr>
<td style="background:#fff;border-radius:12px;width:40px;height:40px;text-align:center;vertical-align:middle">
<span style="color:${GREEN};font-size:20px;font-weight:700">T</span>
</td>
<td style="padding-left:12px;color:#fff;font-size:20px;font-weight:700;letter-spacing:-.5px">TAYCO BAT</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 40px">${content}</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid #f0f0f0;text-align:center">
<p style="margin:0;font-size:12px;color:#999">TAYCO BAT — Logiciel de gestion BTP</p>
<p style="margin:4px 0 0;font-size:12px;color:#bbb">taycobat.vercel.app</p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function welcomeHtml(name: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#111">Bienvenue ${name} !</h1>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Votre compte TAYCO BAT est actif. Votre essai gratuit de <strong>14 jours</strong> commence maintenant.</p>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Voici comment bien démarrer :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:8px;margin-bottom:8px">
        <p style="margin:0;font-size:14px;color:#333"><strong style="color:${GREEN}">1.</strong> Complétez votre profil entreprise</p>
      </td></tr>
      <tr><td style="height:8px"></td></tr>
      <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:8px">
        <p style="margin:0;font-size:14px;color:#333"><strong style="color:${GREEN}">2.</strong> Ajoutez votre premier client</p>
      </td></tr>
      <tr><td style="height:8px"></td></tr>
      <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:8px">
        <p style="margin:0;font-size:14px;color:#333"><strong style="color:${GREEN}">3.</strong> Créez votre premier devis — essayez l'IA Audio !</p>
      </td></tr>
    </table>
    <a href="https://taycobat.vercel.app/dashboard" style="display:inline-block;background:${GREEN};color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px">Accéder à mon espace</a>
  `)
}

function devisHtml(clientName: string, devisNumero: string, montantTTC: string, artisanName: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#111">Nouveau devis</h1>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Bonjour ${clientName},</p>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">${artisanName} vous a envoyé un devis.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:12px;padding:20px;margin-bottom:24px">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;color:#999">Devis n°</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#111">${devisNumero}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#999">Montant TTC</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:${GREEN}">${montantTTC} €</p>
      </td></tr>
    </table>
    <p style="color:#666;line-height:1.6;margin:0 0 4px">Merci de votre confiance.</p>
    <p style="color:#999;font-size:13px;margin:0">— ${artisanName} via TAYCO BAT</p>
  `)
}

function relanceHtml(clientName: string, factureNumero: string, montantTTC: string, joursRetard: number, artisanName: string) {
  const urgence = joursRetard >= 45 ? 'Mise en demeure' : joursRetard >= 30 ? 'Relance urgente' : 'Rappel de paiement'
  const color = joursRetard >= 45 ? '#dc2626' : joursRetard >= 30 ? '#f59e0b' : GREEN
  return layout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:${color}">${urgence}</h1>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Bonjour ${clientName},</p>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Sauf erreur de notre part, la facture ci-dessous reste impayée à ce jour <strong>(${joursRetard} jours de retard)</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;color:#999">Facture n°</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#111">${factureNumero}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#999">Montant dû</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">${montantTTC} €</p>
      </td></tr>
    </table>
    <p style="color:#666;line-height:1.6;margin:0 0 24px">Merci de procéder au règlement dans les meilleurs délais.</p>
    <p style="color:#999;font-size:13px;margin:0">— ${artisanName} via TAYCO BAT</p>
  `)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { type, to, data } = await req.json()

    let subject = ''
    let html = ''

    switch (type) {
      case 'welcome':
        subject = `Bienvenue sur TAYCO BAT, ${data.name} !`
        html = welcomeHtml(data.name)
        break
      case 'devis':
        subject = `Devis ${data.devisNumero} — ${data.artisanName}`
        html = devisHtml(data.clientName, data.devisNumero, data.montantTTC, data.artisanName)
        break
      case 'relance':
        subject = `${data.joursRetard >= 45 ? 'Mise en demeure' : 'Rappel'} — Facture ${data.factureNumero}`
        html = relanceHtml(data.clientName, data.factureNumero, data.montantTTC, data.joursRetard, data.artisanName)
        break
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'TAYCO BAT <noreply@tayco.fr>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Resend error' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
