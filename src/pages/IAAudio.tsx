import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useDevis } from '../hooks/useDevis'
import type { Client } from '../hooks/useClients'
import type { DevisLigne } from '../hooks/useDevis'

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ma', flag: '🇲🇦', label: 'Darija' },
  { code: 'dz', flag: '🇩🇿', label: 'Dzayer' },
  { code: 'tn', flag: '🇹🇳', label: 'Tounsi' },
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'in', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'pk', flag: '🇵🇰', label: 'اردو' },
  { code: 'al', flag: '🇦🇱', label: 'Shqip' },
  { code: 'hr', flag: '🇭🇷', label: 'Hrvatski' },
]

const TVA_OPTIONS = [
  { value: 5.5, label: '5,5%', tag: 'Isolation' },
  { value: 10, label: '10%', tag: 'Rénovation' },
  { value: 20, label: '20%', tag: 'Standard' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data:audio/...;base64, prefix
      const base64 = result.split(',')[1] ?? result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function IAAudio() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createDevis } = useDevis()
  const { recording, audioBlob, duration, analyserData, error: recorderError, startRecording, stopRecording, reset } = useAudioRecorder()

  const [langue, setLangue] = useState('fr')
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [tvaPct, setTvaPct] = useState(10)

  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [titre, setTitre] = useState('')
  const [lignes, setLignes] = useState<Omit<DevisLigne, 'id' | 'devis_id'>[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])

  function addLog(msg: string) {
    console.log(`[IA Audio] ${msg}`)
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString('fr-FR')} — ${msg}`])
  }

  function handleSelectLangue(code: string) {
    setLangue(code)
    const lang = LANGS.find((l) => l.code === code)
    addLog(`Langue sélectionnée : ${lang?.flag} ${lang?.label} (${code})`)
  }

  const fetchClients = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('clients').select('id, nom, prenom, entreprise').eq('user_id', user.id).order('nom')
    setClients((data as Client[]) ?? [])
  }, [user])

  useEffect(() => { fetchClients() }, [fetchClients])

  async function handleTranscribe() {
    if (!audioBlob) { addLog('Erreur : pas de blob audio'); return }
    setTranscribing(true)
    setError('')
    setTranscription('')
    setLignes([])

    try {
      addLog(`Conversion audio en base64 (${audioBlob.size} octets, type: ${audioBlob.type})...`)
      const audio_base64 = await blobToBase64(audioBlob)
      addLog(`Base64 prêt (${audio_base64.length} caractères)`)

      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZGZ5dHV2cHVqaGluaW90cXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDg2ODAsImV4cCI6MjA5MDE4NDY4MH0.ZZO6BtB0nZUAgaT3kwlh76wHf6Gs9kknvdlQVnJ3rok'

      const url = 'https://uwdfytuvpujhiniotqyl.supabase.co/functions/v1/whisper-transcription'
      addLog(`Envoi audio vers Edge Function : ${url}`)
      addLog(`Langue : ${langue}`)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_base64, langue }),
      })

      addLog(`Réponse HTTP : ${res.status} ${res.statusText}`)

      const data = await res.json()
      addLog(`Réponse reçue : ${JSON.stringify(data).slice(0, 200)}...`)

      if (data.error) {
        setError(data.error)
        addLog(`Erreur Edge Function : ${data.error}`)
        if (data.transcription) setTranscription(data.transcription)
      } else {
        setTranscription(data.transcription || '')
        setTitre(data.titre || '')
        addLog(`Transcription : "${(data.transcription || '').slice(0, 100)}"`)
        addLog(`Titre suggéré : "${data.titre || ''}"`)
        addLog(`${(data.lignes || []).length} lignes de devis générées`)

        setLignes((data.lignes || []).map((l: Record<string, unknown>) => ({
          description: String(l.description || ''),
          quantite: Number(l.quantite) || 1,
          unite: String(l.unite || 'u'),
          prix_unitaire: Number(l.prix_unitaire) || 0,
          total_ht: Math.round((Number(l.quantite) || 1) * (Number(l.prix_unitaire) || 0) * 100) / 100,
        })))
      }
    } catch (err) {
      const msg = `Erreur réseau : ${String(err)}`
      setError(msg)
      addLog(msg)
    }

    setTranscribing(false)
  }

  function updateLigne(i: number, field: string, raw: string) {
    setLignes((prev) => {
      const next = [...prev]
      const l = { ...next[i], [field]: field === 'description' || field === 'unite' ? raw : parseFloat(raw) || 0 }
      l.total_ht = Math.round(l.quantite * l.prix_unitaire * 100) / 100
      next[i] = l
      return next
    })
  }

  function removeLigne(i: number) {
    setLignes((p) => p.filter((_, idx) => idx !== i))
  }

  const totalHT = lignes.reduce((s, l) => s + l.total_ht, 0)
  const totalTVA = Math.round(totalHT * tvaPct / 100 * 100) / 100
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100

  async function handleCreateDevis() {
    if (lignes.length === 0) { setError('Aucune ligne à enregistrer'); return }
    setSaving(true); setError('')
    const res = await createDevis({ titre, client_id: clientId || null, tva_pct: tvaPct, lignes: lignes.filter((l) => l.description) })
    setSaving(false)
    if (res.error) setError(res.error)
    else { addLog('Devis créé avec succès'); navigate('/devis') }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">IA Audio — Devis vocal</h1>
        <p className="text-gray-500 text-sm mt-0.5">Décrivez vos travaux à voix haute, l'IA génère le devis en français</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Recording */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Langue de l'enregistrement</label>
            <div className="grid grid-cols-4 gap-2">
              {LANGS.map((l) => (
                <div
                  key={l.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectLangue(l.code)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectLangue(l.code) }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none ${
                    langue === l.code
                      ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52] ring-2 ring-[#1a9e52]/20 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg leading-none">{l.flag}</span>
                  <span className="truncate px-1 leading-tight">{l.label}</span>
                  {langue === l.code && <span className="w-1.5 h-1.5 rounded-full bg-[#1a9e52]" />}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Sélectionné : <span className="font-semibold text-[#1a9e52]">{LANGS.find((l) => l.code === langue)?.flag} {LANGS.find((l) => l.code === langue)?.label}</span>
            </p>
          </div>

          {/* Microphone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
            {/* Waveform */}
            <div className="w-full h-20 mb-6 flex items-end justify-center gap-[2px] bg-gray-50 rounded-xl p-3 overflow-hidden">
              {recording ? (
                Array.from(analyserData).slice(0, 48).map((v, i) => (
                  <motion.div key={i} className="w-1.5 rounded-full bg-[#1a9e52]"
                    animate={{ height: Math.max(4, (v / 255) * 56) }}
                    transition={{ duration: 0.08 }} />
                ))
              ) : audioBlob ? (
                <div className="text-sm text-[#1a9e52] font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Enregistrement prêt ({formatDuration(duration)})
                </div>
              ) : (
                <p className="text-xs text-gray-400">Appuyez sur le micro pour commencer</p>
              )}
            </div>

            {recording && (
              <div className="text-2xl font-mono font-bold text-[#1a9e52] mb-4 tabular-nums">{formatDuration(duration)}</div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-4">
              {!recording ? (
                <motion.button type="button" onClick={() => { addLog('Démarrage enregistrement...'); startRecording() }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 rounded-full bg-[#1a9e52] hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center cursor-pointer transition-colors">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </motion.button>
              ) : (
                <motion.button type="button" onClick={() => { addLog('Arrêt enregistrement'); stopRecording() }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 0 14px rgba(239,68,68,0)', '0 0 0 0 rgba(239,68,68,0.4)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center cursor-pointer">
                  <div className="w-6 h-6 rounded-sm bg-white" />
                </motion.button>
              )}

              {audioBlob && !recording && (
                <>
                  <motion.button type="button" onClick={handleTranscribe} disabled={transcribing}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="px-5 py-3 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2">
                    {transcribing ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Transcription...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Générer le devis</>
                    )}
                  </motion.button>
                  <button type="button" onClick={() => { reset(); setTranscription(''); setLignes([]); setTitre(''); setDebugLog([]) }}
                    className="px-4 py-3 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer">
                    Recommencer
                  </button>
                </>
              )}
            </div>

            {/* Recorder error */}
            {recorderError && <p className="text-sm text-red-500 mt-4">{recorderError}</p>}
          </div>

          {/* Transcription */}
          <AnimatePresence>
            {transcription && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transcription</label>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcription}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

          {/* Debug log */}
          {debugLog.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-4 text-[11px] font-mono text-emerald-400 space-y-0.5 overflow-x-auto">
              <div className="text-gray-500 mb-1">Debug log :</div>
              {debugLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        {/* Right — Generated devis */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence>
            {lignes.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#1a9e52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Devis généré par IA
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Titre</label>
                      <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" /></div>
                    <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Client</label>
                      <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52] cursor-pointer">
                        <option value="">— Client —</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.entreprise ? ` — ${c.entreprise}` : ''}</option>)}
                      </select></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-2">TVA</label>
                    <div className="flex gap-2">{TVA_OPTIONS.map((o) => (
                      <button key={o.value} type="button" onClick={() => setTvaPct(o.value)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                          tvaPct === o.value ? 'border-[#1a9e52] bg-emerald-50 text-[#1a9e52]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>{o.label}<span className="block text-[10px] font-normal opacity-60">{o.tag}</span></button>
                    ))}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{lignes.length} ligne{lignes.length > 1 ? 's' : ''} de travaux</label>
                  <div className="space-y-2">
                    {lignes.map((l, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="grid grid-cols-[1fr_70px_60px_100px_90px_32px] gap-2 items-center bg-gray-50/50 rounded-xl p-2 border border-gray-100">
                        <input type="text" value={l.description} onChange={(e) => updateLigne(i, 'description', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        <input type="number" value={l.quantite || ''} onChange={(e) => updateLigne(i, 'quantite', e.target.value)} min={0} step="any"
                          className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        <select value={l.unite} onChange={(e) => updateLigne(i, 'unite', e.target.value)}
                          className="px-1 py-2 rounded-lg border border-gray-200 bg-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]">
                          {['u', 'm²', 'ml', 'm³', 'h', 'forfait', 'kg', 'lot'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={l.prix_unitaire || ''} onChange={(e) => updateLigne(i, 'prix_unitaire', e.target.value)} min={0} step="any"
                          className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1a9e52]/20 focus:border-[#1a9e52]" />
                        <span className="text-sm font-semibold text-[#1a9e52] text-right tabular-nums">{fmt(l.total_ht)}</span>
                        <button type="button" onClick={() => removeLigne(i)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="max-w-xs ml-auto space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total HT</span><span className="font-medium tabular-nums">{fmt(totalHT)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">TVA {tvaPct}%</span><span className="font-medium tabular-nums">{fmt(totalTVA)}</span></div>
                    <div className="flex justify-between text-lg pt-3 border-t border-gray-200"><span className="font-bold">Total TTC</span><span className="font-bold text-[#1a9e52] tabular-nums">{fmt(totalTTC)}</span></div>
                  </div>
                </div>

                <motion.button type="button" onClick={handleCreateDevis} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-[#1a9e52] hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 text-base">
                  {saving ? 'Création en cours...' : 'Créer le devis'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {lignes.length === 0 && !transcribing && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#1a9e52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Devis vocal en 30 secondes</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                Choisissez votre langue, appuyez sur le micro et décrivez les travaux.
                L'IA transcrit et génère automatiquement les lignes de devis en français.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {LANGS.slice(0, 6).map((l) => (
                  <span key={l.code} className="text-xs bg-gray-50 px-2 py-1 rounded-lg text-gray-500">{l.flag} {l.label}</span>
                ))}
                <span className="text-xs bg-gray-50 px-2 py-1 rounded-lg text-gray-400">+6 langues</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
