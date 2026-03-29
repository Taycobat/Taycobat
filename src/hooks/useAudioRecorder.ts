import { useState, useRef, useCallback, useEffect } from 'react'

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [analyserData, setAnalyserData] = useState<Uint8Array>(new Uint8Array(64))
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const updateAnalyser = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(data)
      setAnalyserData(data.slice(0, 64))
    }
    animFrameRef.current = requestAnimationFrame(updateAnalyser)
  }, [])

  useEffect(() => {
    if (recording) {
      animFrameRef.current = requestAnimationFrame(updateAnalyser)
    } else {
      cancelAnimationFrame(animFrameRef.current)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [recording, updateAnalyser])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = getSupportedMimeType()


      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const type = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })

        setAudioBlob(blob)
      }

      mediaRecorder.start(250)
      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()
      setRecording(true)
      setAudioBlob(null)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)

    } catch (err) {

      setError('Accès au micro refusé. Autorisez le micro dans les paramètres du navigateur.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)

    // Cleanup stream + audio context
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    analyserRef.current = null
  }

  function reset() {
    setAudioBlob(null)
    setDuration(0)
    setError('')
    setAnalyserData(new Uint8Array(64))
  }

  return { recording, audioBlob, duration, analyserData, error: error, startRecording, stopRecording, reset }
}
