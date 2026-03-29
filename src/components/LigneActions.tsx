import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  value: string
  onChange: (text: string) => void
}

export default function LigneActions({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [error, setError] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function showError(msg: string) { setError(msg); setTimeout(() => setError(''), 3000) }

  async function toggleRecord() {
    if (recording) {
      // Stop
      mediaRef.current?.stop()
      setRecording(false)
      return
    }

    // Start
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          const { data, error: err } = await supabase.functions.invoke('whisper-transcription', {
            body: { audio_base64: base64, langue: 'fr' },
          })
          if (err || data?.error) { showError('Erreur transcription'); return }
          const transcript = data?.texte || data?.transcription || data?.text || ''
          if (transcript) onChange(value ? `${value} ${transcript}` : transcript)
        }
        reader.readAsDataURL(blob)
      }
      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      showError('Micro non disponible')
    }
  }

  async function enhance() {
    if (!value.trim()) return
    setEnhancing(true)
    const { data, error: err } = await supabase.functions.invoke('enhance-description', {
      body: { text: value },
    })
    setEnhancing(false)
    if (err || data?.error) { showError('Erreur amelioration'); return }
    if (data?.enhancedText) onChange(data.enhancedText)
  }

  return (
    <div className="flex flex-col items-center gap-1 pt-2 flex-shrink-0">
      {/* Micro */}
      <button type="button" onClick={toggleRecord} title="Dicter en votre langue"
        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${recording ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-300 hover:text-[#1a9e52] hover:bg-emerald-50'}`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>

      {/* Baguette magique */}
      <button type="button" onClick={enhance} disabled={enhancing || !value.trim()} title="Corriger et professionnaliser"
        className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-[#1a9e52] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default">
        {enhancing ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )}
      </button>

      {error && <span className="text-[9px] text-red-500 leading-tight text-center w-12">{error}</span>}
    </div>
  )
}
