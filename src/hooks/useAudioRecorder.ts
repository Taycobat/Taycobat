import { useState, useRef, useCallback, useEffect } from 'react'

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [analyserData, setAnalyserData] = useState<Uint8Array>(new Uint8Array(64))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const updateAnalyser = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(data)
      setAnalyserData(data.slice(0, 64))
    }
    if (recording) {
      animFrameRef.current = requestAnimationFrame(updateAnalyser)
    }
  }, [recording])

  useEffect(() => {
    if (recording) {
      animFrameRef.current = requestAnimationFrame(updateAnalyser)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [recording, updateAnalyser])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        audioCtx.close()
      }

      mediaRecorder.start(100)
      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()
      setRecording(true)
      setAudioBlob(null)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } catch {
      // Microphone access denied
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    analyserRef.current = null
  }

  function reset() {
    setAudioBlob(null)
    setDuration(0)
    setAnalyserData(new Uint8Array(64))
  }

  return { recording, audioBlob, duration, analyserData, startRecording, stopRecording, reset }
}
