// Supabase Edge Function — whisper-transcription
// Deploy: supabase functions deploy whisper-transcription
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...
//
// This function:
// 1. Receives audio blob from browser
// 2. Sends to OpenAI Whisper for transcription
// 3. Sends transcription to GPT-4 to extract structured devis lines
// 4. Returns JSON with transcription + parsed lines

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const langue = formData.get('langue') as string || 'fr'

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Step 1: Whisper transcription ---
    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, 'audio.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', langToWhisper(langue))
    whisperForm.append('response_format', 'json')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      return new Response(JSON.stringify({ error: `Whisper error: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whisperData = await whisperRes.json()
    const transcription = whisperData.text

    // --- Step 2: GPT-4 to extract devis lines ---
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant spécialisé dans le BTP (bâtiment et travaux publics) en France.
À partir d'une transcription audio d'un artisan décrivant des travaux, tu dois extraire des lignes de devis structurées.

Retourne UNIQUEMENT un JSON valide, sans texte autour, avec ce format:
{
  "titre": "titre du devis suggéré",
  "lignes": [
    {
      "description": "description du poste de travail",
      "quantite": 1,
      "unite": "m²",
      "prix_unitaire": 45
    }
  ]
}

Règles:
- Traduis TOUJOURS en français, même si la transcription est en arabe, turc, roumain, etc.
- Utilise les unités BTP standard: m², ml, u, h, forfait, m³, kg, lot
- Estime des prix unitaires réalistes pour le marché français BTP
- Sépare chaque poste de travail en une ligne distincte
- Si la quantité n'est pas mentionnée, mets 1
- Sois précis dans les descriptions (matériaux + pose si applicable)`
          },
          {
            role: 'user',
            content: `Transcription audio (langue: ${langue}):\n\n${transcription}`
          }
        ],
      }),
    })

    if (!gptRes.ok) {
      const err = await gptRes.text()
      return new Response(JSON.stringify({ error: `GPT error: ${err}`, transcription }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const gptData = await gptRes.json()
    const content = gptData.choices?.[0]?.message?.content ?? '{}'

    let parsed
    try {
      // Extract JSON from potential markdown code blocks
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { titre: '', lignes: [] }
    }

    return new Response(JSON.stringify({
      transcription,
      titre: parsed.titre || '',
      lignes: (parsed.lignes || []).map((l: Record<string, unknown>) => ({
        description: String(l.description || ''),
        quantite: Number(l.quantite) || 1,
        unite: String(l.unite || 'u'),
        prix_unitaire: Number(l.prix_unitaire) || 0,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function langToWhisper(code: string): string {
  const map: Record<string, string> = {
    fr: 'fr', ma: 'ar', dz: 'ar', tn: 'ar', tr: 'tr',
    ro: 'ro', pl: 'pl', pt: 'pt', in: 'hi', pk: 'ur', al: 'sq', hr: 'hr',
  }
  return map[code] || 'fr'
}
