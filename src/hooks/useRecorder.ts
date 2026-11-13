import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error'

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac']

export function recorderSupport(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') return { supported: false }
  if (!window.isSecureContext) return { supported: false, reason: 'A gravação exige HTTPS ou localhost.' }
  if (!navigator.mediaDevices?.getUserMedia) return { supported: false, reason: 'Este navegador não permite acessar o microfone.' }
  if (typeof MediaRecorder === 'undefined') return { supported: false, reason: 'Este navegador não suporta gravação de áudio (MediaRecorder).' }
  return { supported: true }
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))
}

/**
 * Encapsula a MediaRecorder API: permissão, gravar/pausar/retomar/finalizar,
 * cronômetro, nível de áudio e liberação do microfone (tracks + AudioContext).
 * O áudio é mantido no formato nativo do navegador.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string>()
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [blob, setBlob] = useState<Blob>()

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)
  const tickRef = useRef<number>(0)
  const accumulatedRef = useRef(0)
  const segmentStartRef = useRef(0)

  const canPause = typeof MediaRecorder !== 'undefined' && 'pause' in MediaRecorder.prototype

  const releaseResources = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    window.clearInterval(tickRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') void audioCtxRef.current.close()
    audioCtxRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    releaseResources()
  }, [releaseResources])

  const currentElapsed = () => accumulatedRef.current + (segmentStartRef.current ? (performance.now() - segmentStartRef.current) / 1000 : 0)

  const startTicker = () => {
    window.clearInterval(tickRef.current)
    tickRef.current = window.setInterval(() => setElapsed(currentElapsed()), 200)
  }

  const start = useCallback(async () => {
    const support = recorderSupport()
    if (!support.supported) {
      setError(support.reason)
      setStatus('error')
      return
    }
    setError(undefined)
    setBlob(undefined)
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream

      // Medidor de nível
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new Ctx()
        audioCtxRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(stream).connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        const loop = () => {
          analyser.getByteTimeDomainData(data)
          let sumSq = 0
          for (const v of data) sumSq += ((v - 128) / 128) ** 2
          setLevel(Math.min(1, Math.sqrt(sumSq / data.length) * 4))
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      } catch {
        // Sem medidor: a gravação continua funcionando.
      }

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        setBlob(new Blob(chunksRef.current, { type }))
        setStatus('stopped')
        releaseResources()
      }
      recorder.onerror = () => {
        setError('A gravação foi interrompida por um erro do navegador.')
        setStatus('error')
        releaseResources()
      }
      recorder.start(1000)
      accumulatedRef.current = 0
      segmentStartRef.current = performance.now()
      setElapsed(0)
      startTicker()
      setStatus('recording')
    } catch (err) {
      releaseResources()
      const name = (err as DOMException)?.name
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Permissão de microfone negada. Libere o acesso nas configurações do navegador e tente de novo.'
          : name === 'NotFoundError'
            ? 'Nenhum microfone encontrado.'
            : 'Não foi possível acessar o microfone.',
      )
      setStatus('error')
    }
  }, [releaseResources])

  const pause = useCallback(() => {
    const r = recorderRef.current
    if (!r || r.state !== 'recording' || !canPause) return
    r.pause()
    accumulatedRef.current = currentElapsed()
    segmentStartRef.current = 0
    window.clearInterval(tickRef.current)
    setElapsed(accumulatedRef.current)
    setStatus('paused')
  }, [canPause])

  const resume = useCallback(() => {
    const r = recorderRef.current
    if (!r || r.state !== 'paused') return
    r.resume()
    segmentStartRef.current = performance.now()
    startTicker()
    setStatus('recording')
  }, [])

  const stop = useCallback(() => {
    const r = recorderRef.current
    if (!r || r.state === 'inactive') return
    accumulatedRef.current = currentElapsed()
    segmentStartRef.current = 0
    window.clearInterval(tickRef.current)
    setElapsed(accumulatedRef.current)
    r.stop()
  }, [])

  const reset = useCallback(() => {
    setBlob(undefined)
    setElapsed(0)
    accumulatedRef.current = 0
    setError(undefined)
    setStatus('idle')
  }, [])

  return { status, error, elapsed, level, blob, canPause, start, pause, resume, stop, reset }
}
