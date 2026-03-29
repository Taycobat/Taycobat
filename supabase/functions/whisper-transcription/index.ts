// Supabase Edge Function — whisper-transcription
// Deploy: supabase functions deploy whisper-transcription
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...
//
// Accepts two modes:
// A) JSON body: { audio_base64: "...", langue: "fr" }
// B) FormData:  audio (File) + langue (string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Tu es un assistant BTP français. Transforme cette description de travaux en lignes de devis structurées. Retourne un JSON avec : titre (string), lignes (array de {description, quantite, unite, prix_unitaire}). Les prix doivent être réalistes pour le marché français BTP.

Règles supplémentaires :
- Traduis TOUJOURS en français, même si la transcription est en arabe, turc, roumain, polonais, etc.
- Utilise les unités BTP standard : m², ml, u, h, forfait, m³, kg, lot
- Sépare chaque poste de travail en une ligne distincte
- Si la quantité n'est pas mentionnée, mets 1
- Sois précis dans les descriptions (matériaux + pose si applicable)
- Retourne UNIQUEMENT le JSON, sans texte autour ni blocs markdown`

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function err(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) return err('OPENAI_API_KEY not configured')

    // --- Parse input (base64 JSON or FormData) ---
    let audioBytes: Uint8Array
    let langue = 'fr'
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      // Mode A: JSON with base64 audio
      const body = await req.json()
      if (!body.audio_base64) return err('Missing audio_base64 field', 400)
      langue = body.langue || 'fr'

      // Decode base64 → binary
      const raw = body.audio_base64.replace(/^data:audio\/[^;]+;base64,/, '')
      audioBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
    } else {
      // Mode B: FormData with audio blob
      const formData = await req.formData()
      const audioFile = formData.get('audio') as File | null
      if (!audioFile) return err('No audio file provided', 400)
      langue = (formData.get('langue') as string) || 'fr'
      audioBytes = new Uint8Array(await audioFile.arrayBuffer())
    }

    // --- Step 1: Whisper transcription ---
    const whisperForm = new FormData()
    const audioBlob = new Blob([audioBytes], { type: 'audio/webm' })
    whisperForm.append('file', audioBlob, 'audio.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', langToWhisper(langue))
    whisperForm.append('response_format', 'json')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const e = await whisperRes.text()
      return err(`Whisper API error: ${e}`)
    }

    const { text: transcription } = await whisperRes.json()

    if (!transcription || transcription.trim().length === 0) {
      return ok({ transcription: '', titre: '', lignes: [], warning: 'Aucune parole détectée' })
    }

    // --- Step 2: GPT-4 structured extraction ---
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Transcription audio (langue: ${langue}):\n\n${transcription}` },
        ],
      }),
    })

    if (!gptRes.ok) {
      const e = await gptRes.text()
      return ok({ transcription, titre: '', lignes: [], error: `GPT error: ${e}` })
    }

    const gptData = await gptRes.json()
    const raw = gptData.choices?.[0]?.message?.content ?? '{}'

    // Parse JSON (handle possible markdown code fences)
    let parsed: { titre?: string; lignes?: Record<string, unknown>[] }
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { titre: '', lignes: [] }
    }

    return ok({
      transcription,
      titre: parsed.titre || '',
      lignes: (parsed.lignes || []).map((l) => ({
        description: String(l.description || ''),
        quantite: Number(l.quantite) || 1,
        unite: String(l.unite || 'u'),
        prix_unitaire: Number(l.prix_unitaire) || 0,
      })),
    })
  } catch (e) {
    return err(String(e))
  }
})

function langToWhisper(code: string): string {
  const map: Record<string, string> = {
    fr: 'fr', ma: 'ar', dz: 'ar', tn: 'ar', tr: 'tr',
    ro: 'ro', pl: 'pl', pt: 'pt', in: 'hi', pk: 'ur', al: 'sq', hr: 'hr',
  }
  return map[code] || 'fr'
}
