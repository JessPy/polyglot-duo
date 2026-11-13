import { useCallback, useEffect, useRef, useState } from 'react'

/** Cronômetro regressivo baseado em performance.now() (preciso mesmo com a aba em segundo plano). */
export function useTimer(totalSeconds: number) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const accRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setElapsed(accRef.current + (performance.now() - startRef.current) / 1000), 250)
    return () => window.clearInterval(id)
  }, [running])

  const start = useCallback(() => {
    startRef.current = performance.now()
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    accRef.current += (performance.now() - startRef.current) / 1000
    setElapsed(accRef.current)
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    accRef.current = 0
    setElapsed(0)
    setRunning(false)
  }, [])

  return { elapsed, remaining: Math.max(0, totalSeconds - elapsed), running, start, pause, reset }
}
