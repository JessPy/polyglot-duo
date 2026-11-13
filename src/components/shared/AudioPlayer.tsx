import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatSeconds } from '@/lib/dates'
import { recordingsRepo } from '@/repositories'
import { cn } from '@/lib/utils'

/**
 * Player de áudio leve. Recebe um Blob ou carrega a gravação do IndexedDB sob demanda.
 * O object URL é revogado ao desmontar para liberar memória.
 */
export function AudioPlayer({ blob, recordingId, fallbackDuration = 0, className, compact }: { blob?: Blob; recordingId?: string; fallbackDuration?: number; className?: string; compact?: boolean }) {
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(fallbackDuration)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false
    setError(undefined)
    ;(async () => {
      const b = blob ?? (recordingId ? await recordingsRepo.getBlob(recordingId) : undefined)
      if (cancelled) return
      if (!b) {
        setError('Áudio indisponível')
        return
      }
      objectUrl = URL.createObjectURL(b)
      setUrl(objectUrl)
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [blob, recordingId])

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      try {
        await a.play()
      } catch {
        setError('Este navegador não consegue reproduzir este formato.')
      }
    } else a.pause()
  }

  const total = Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration
  return (
    <div className={cn('flex items-center gap-3 rounded-lg bg-muted/60 p-2', className)}>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onError={() => setError('Não foi possível carregar o áudio.')}
        />
      )}
      <Button size="icon-sm" variant="default" className="rounded-full" onClick={toggle} disabled={!url || Boolean(error)} aria-label={playing ? 'Pausar' : 'Reproduzir'}>
        {playing ? <Pause /> : <Play className="translate-x-px" />}
      </Button>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        <>
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={Math.min(current, total || 1)}
            onChange={(e) => {
              if (audioRef.current) audioRef.current.currentTime = Number(e.target.value)
            }}
            aria-label="Posição do áudio"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--brand)]"
          />
          <span className="tabular w-[84px] shrink-0 text-right text-xs text-muted-foreground">
            {formatSeconds(current)} / {formatSeconds(total)}
          </span>
          {!compact && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Voltar ao início"
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = 0
              }}
            >
              <RotateCcw />
            </Button>
          )}
        </>
      )}
    </div>
  )
}
