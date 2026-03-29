const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Tu es un expert en rédaction de devis et factures BTP français.
Analyse ce texte et applique UNE de ces actions :
- S'il est dans une autre langue : traduis-le en français professionnel BTP
- S'il est en français avec des fautes : corrige l'orthographe et la grammaire
- Dans tous les cas : reformule en libellé professionnel de devis/facture BTP
Exemples de reformulation :
- 'poser carrelage sdb' → 'Fourniture et pose de carrelage en salle de bain'
- 'changer robinet cuisine' → 'Remplacement du robinet mitigeur cuisine, fourniture et pose comprises'
- 'peinture mur' → 'Travaux de peinture des murs, deux couches, préparation du support comprise'
Retourne UNIQUEMENT le texte final corrigé/traduit, sans explication ni commentaire.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { text } = await req.json()
    if (!text || !text.trim()) return new Response(JSON.stringify({ error: 'text is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    })

    const data = await res.json()
    const enhancedText = data.choices?.[0]?.message?.content?.trim() || text

    return new Response(JSON.stringify({ enhancedText }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
