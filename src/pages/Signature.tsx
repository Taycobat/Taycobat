import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

interface DevisItem {
  id: string; numero: string; titre: string; client_id: string | null
  montant_ttc: number; statut: string; client_display: string
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇲🇦', label: 'Darija' },
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski' },
]

const TEMPLATES: Record<string, (nom: string, numero: string) => string> = {
  fr: (nom, num) => `Bonjour ${nom},\n\nVeuillez trouver ci-joint le devis ${num}.\nN'hésitez pas à me contacter pour toute question.\n\nCordialement`,
  ar: (nom, num) => `مرحبا ${nom},\n\nها هو الديفي ${num}.\nإلا عندك شي سؤال ما تردّدش تعاود ليا.\n\nشكرا`,
  tr: (nom, num) => `Merhaba ${nom},\n\nEkte ${num} numaralı teklifinizi bulabilirsiniz.\nHerhangi bir sorunuz için benimle iletişime geçebilirsiniz.\n\nSaygılarımla`,
  ro: (nom, num) => `Bună ${nom},\n\nVă trimit oferta ${num}.\nNu ezitați să mă contactați pentru orice întrebare.\n\nCu stimă`,
  pl: (nom, num) => `Dzień dobry ${nom},\n\nW załączniku przesyłam wycenę ${num}.\nW razie pytań proszę o kontakt.\n\nPozdrawiam`,
}

export default function SignaturePage() {
  const { user } = useAuthStore()
  const canvasArtisanRef = useRef<HTMLCanvasElement>(null)
  const canvasClientRef = useRef<HTMLCanvasElement>(null)
  const [devisList, setDevisList] = useState<DevisItem[]>([])
  const [selectedDevis, setSelectedDevis] = useState('')
  const [msgLang, setMsgLang] = useState('fr')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [drawingArtisan, setDrawingArtisan] = useState(false)
  const [drawingClient, setDrawingClient] = useState(false)

  const fetchDevis = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('devis').select('id,numero,titre,client_id,montant_ttc,statut')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    const rows = data ?? []
    const clientIds = [...new Set(rows.map((d) => d.client_id).filter(Boolean))] as string[]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, nom, prenom, raison_sociale, type_client').in('id', clientIds)
      for (const c of clients ?? []) clientMap[c.id] = c.type_client === 'societe' ? (c.raison_sociale || '') : `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
    }
    setDevisList(rows.map((d) => ({ ...d, montant_ttc: toNum(d.montant_ttc), client_display: d.client_id ? clientMap[d.client_id] ?? '' : '' })))
  }, [user])

  useEffect(() => { fetchDevis() }, [fetchDevis])

  const selected = devisList.find((d) => d.id === selectedDevis)

  useEffect(() => {
    if (selected) {
      setMessage(TEMPLATES[msgLang]?.(selected.client_display || 'Client', selected.numero) ?? '')
    }
  }, [selected, msgLang])

  // Canvas drawing
  function initCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#0d2d1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  useEffect(() => {
    initCanvas(canvasArtisanRef.current)
    initCanvas(canvasClientRef.current)
  }, [])

  function getPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const rect = canvas.getBoundingClientRect()
    const touch = 'touches' in e ? e.touches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function startDraw(canvas: HTMLCanvasElement | null, _setDrawing: (v: boolean) => void, e: React.MouseEvent | React.TouchEvent) {
    if (!canvas) return
    _setDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(canvas, e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(canvas: HTMLCanvasElement | null, isDrawing: boolean, e: React.MouseEvent | React.TouchEvent) {
    if (!canvas || !isDrawing) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(canvas, e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function clearCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    initCanvas(canvas)
  }

  async function handleSend() {
    if (!selected || !email) return
    setSending(true)
    // In production: send email via Supabase Edge Function or API
    // For now, update statut to 'envoye'
    await supabase.from('devis').update({ statut: 'envoye' }).eq('id', selected.id)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    fetchDevis()
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Signature & envoi</h1>
        <p className="text-gray-500 text-sm mt-0.5">Signez et envoyez vos devis par email</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Send */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Envoyer un devis</h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Select devis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Devis</label>
              <select value={selectedDevis} onChange={(e) => setSelectedDevis(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] cursor-pointer">
                <option value="">— Sélectionner un devis —</option>
                {devisList.map((d) => (
                  <option key={d.id} value={d.id}>{d.numero} — {d.titre || d.client_display || '—'} — {fmt(d.montant_ttc)}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email du client</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="client@exemple.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" />
            </div>

            {/* Language selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Langue du message</label>
              <div className="flex gap-2 flex-wrap">
                {LANGS.map((l) => (
                  <button key={l.code} onClick={() => setMsgLang(l.code)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                      msgLang === l.code
                        ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] resize-none"
                dir={msgLang === 'ar' ? 'rtl' : 'ltr'} />
            </div>

            {sent && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
                Devis envoyé avec succès !
              </div>
            )}

            <motion.button onClick={handleSend} disabled={sending || !selectedDevis || !email}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {sending ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              )}
              Envoyer le devis
            </motion.button>
          </div>
        </motion.div>

        {/* Right: Signatures */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Signatures</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Artisan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Signature artisan</label>
                <button onClick={() => clearCanvas(canvasArtisanRef.current)}
                  className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Effacer</button>
              </div>
              <canvas ref={canvasArtisanRef} width={400} height={150}
                className="w-full border border-gray-200 rounded-xl cursor-crosshair bg-gray-50"
                onMouseDown={(e) => startDraw(canvasArtisanRef.current, setDrawingArtisan, e)}
                onMouseMove={(e) => draw(canvasArtisanRef.current, drawingArtisan, e)}
                onMouseUp={() => setDrawingArtisan(false)}
                onMouseLeave={() => setDrawingArtisan(false)}
                onTouchStart={(e) => { e.preventDefault(); startDraw(canvasArtisanRef.current, setDrawingArtisan, e) }}
                onTouchMove={(e) => { e.preventDefault(); draw(canvasArtisanRef.current, drawingArtisan, e) }}
                onTouchEnd={() => setDrawingArtisan(false)} />
            </div>

            {/* Client */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Signature client</label>
                <button onClick={() => clearCanvas(canvasClientRef.current)}
                  className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Effacer</button>
              </div>
              <canvas ref={canvasClientRef} width={400} height={150}
                className="w-full border border-gray-200 rounded-xl cursor-crosshair bg-gray-50"
                onMouseDown={(e) => startDraw(canvasClientRef.current, setDrawingClient, e)}
                onMouseMove={(e) => draw(canvasClientRef.current, drawingClient, e)}
                onMouseUp={() => setDrawingClient(false)}
                onMouseLeave={() => setDrawingClient(false)}
                onTouchStart={(e) => { e.preventDefault(); startDraw(canvasClientRef.current, setDrawingClient, e) }}
                onTouchMove={(e) => { e.preventDefault(); draw(canvasClientRef.current, drawingClient, e) }}
                onTouchEnd={() => setDrawingClient(false)} />
            </div>

            <p className="text-xs text-gray-400 text-center">
              Bon pour accord — Les signatures sont intégrées au devis PDF
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
