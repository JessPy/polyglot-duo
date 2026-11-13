import { Circle, Mic, MicOff, Pause, Play, Save, Square, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router'
import { AudioPlayer } from '@/components/shared/AudioPlayer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { recorderSupport, useRecorder } from '@/hooks/useRecorder'
import { formatSeconds, todayKey } from '@/lib/dates'
import { cn, formatBytes } from '@/lib/utils'
import { recordingsRepo, type EvaluationInput } from '@/repositories'
import type { ChallengeAttempt, Participant } from '@/types'
import { EvaluationFields, emptyEvaluation } from './EvaluationForm'

interface Props {
  participant: Participant
  attempts: ChallengeAttempt[]
  defaultTopic?: string
  defaultAttemptId?: string
  onSaved?: (id: string) => void
}

const statusLabel = { idle: 'Pronto para gravar', requesting: 'Aguardando permissão…', recording: 'Gravando', paused: 'Pausado', stopped: 'Gravação finalizada', error: 'Erro' }

/** Gravador com proteção contra perda: avisa antes de sair da página com áudio não salvo. */
export function RecorderPanel({ participant, attempts, defaultTopic = '', defaultAttemptId, onSaved }: Props) {
  const rec = useRecorder()
  const support = recorderSupport()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState(defaultTopic)
  const [notes, setNotes] = useState('')
  const [attemptId, setAttemptId] = useState(defaultAttemptId ?? '')
  const [registerAsSpeaking, setRegister] = useState(true)
  const [evaluate, setEvaluate] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationInput>(emptyEvaluation)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => setTopic(defaultTopic), [defaultTopic])
  useEffect(() => setAttemptId(defaultAttemptId ?? ''), [defaultAttemptId])

  const dirty = rec.status === 'recording' || rec.status === 'paused' || (rec.status === 'stopped' && Boolean(rec.blob))
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const save = useAction(async () => {
    if (!rec.blob) return
    const defaultTitle = `Gravação de ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date())}`
    const id = await recordingsRepo.save(
      {
        participantId: participant.id,
        language: participant.language,
        date: todayKey(),
        durationSeconds: Math.round(rec.elapsed),
        title: title.trim() || defaultTitle,
        topic: topic.trim(),
        notes: notes.trim(),
        challengeAttemptId: attemptId || undefined,
      },
      rec.blob,
      { registerAsSpeaking },
    )
    if (evaluate) await recordingsRepo.evaluate(id, evaluation)
    setTitle('')
    setNotes('')
    setEvaluate(false)
    rec.reset()
    onSaved?.(id)
  }, 'Gravação salva no navegador.')

  if (!support.supported) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <MicOff className="size-8 text-muted-foreground" />
        <p className="font-medium">Gravação indisponível</p>
        <p className="max-w-sm text-sm text-muted-foreground">{support.reason} Você ainda pode ouvir e gerenciar gravações salvas.</p>
      </Card>
    )
  }

  const recording = rec.status === 'recording'
  const bars = 24

  return (
    <Card className="p-5">
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn('size-2 rounded-full bg-muted-foreground', recording && 'animate-pulse bg-destructive', rec.status === 'paused' && 'bg-warning')} />
          <span className="text-muted-foreground">{statusLabel[rec.status]}</span>
        </div>
        <p className="tabular text-5xl font-semibold tracking-tight" aria-label="Duração">
          {formatSeconds(rec.elapsed)}
        </p>
        <div className="flex h-12 items-center gap-1" aria-hidden>
          {Array.from({ length: bars }, (_, i) => {
            const center = 1 - Math.abs(i - bars / 2) / (bars / 2)
            const h = recording ? 6 + rec.level * 40 * (0.4 + center * 0.6) * (0.75 + ((i * 37) % 10) / 40) : 6
            return <motion.span key={i} className={cn('w-1.5 rounded-full', recording ? 'bg-destructive/80' : 'bg-muted')} animate={{ height: h }} transition={{ duration: 0.08 }} />
          })}
        </div>

        {rec.error && (
          <p className="max-w-md rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive" role="alert">
            {rec.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          {(rec.status === 'idle' || rec.status === 'error') && (
            <Button size="lg" variant="destructive" className="rounded-full px-8" onClick={rec.start}>
              <Circle className="fill-current" /> Gravar
            </Button>
          )}
          {rec.status === 'requesting' && (
            <Button size="lg" disabled className="rounded-full px-8">
              <Mic /> Permitir microfone…
            </Button>
          )}
          {(rec.status === 'recording' || rec.status === 'paused') && (
            <>
              {rec.canPause &&
                (recording ? (
                  <Button size="lg" variant="outline" className="rounded-full" onClick={rec.pause}>
                    <Pause /> Pausar
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="rounded-full" onClick={rec.resume}>
                    <Play /> Retomar
                  </Button>
                ))}
              <Button size="lg" className="rounded-full" onClick={rec.stop}>
                <Square className="fill-current" /> Finalizar
              </Button>
            </>
          )}
        </div>
        {rec.status === 'idle' && <p className="text-xs text-muted-foreground">Gravando como {participant.avatar} {participant.name}. O microfone é liberado ao finalizar.</p>}
      </div>

      {rec.status === 'stopped' && rec.blob && (
        <div className="mt-2 flex flex-col gap-4 border-t pt-5">
          <AudioPlayer blob={rec.blob} fallbackDuration={rec.elapsed} />
          <p className="text-xs text-muted-foreground">
            {formatBytes(rec.blob.size)} · {rec.blob.type || 'formato do navegador'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título" htmlFor="rec-title">
              <Input id="rec-title" value={title} maxLength={80} placeholder="Ex.: Dia 1 — apresentação" onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Tema" htmlFor="rec-topic">
              <Input id="rec-topic" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} />
            </Field>
          </div>
          {attempts.length > 0 && (
            <Field label="Desafio associado" htmlFor="rec-att">
              <NativeSelect id="rec-att" value={attemptId} onChange={(e) => setAttemptId(e.target.value)}>
                <option value="">Nenhum</option>
                {attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.challenge.title} {a.challenge.topic ? `— ${a.challenge.topic}` : ''} ({a.date})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="Observações" htmlFor="rec-notes">
            <Textarea id="rec-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span>
              <span className="font-medium">Registrar como sessão de speaking</span>
              <span className="block text-xs text-muted-foreground">Conta para a meta semanal (uma vez por gravação).</span>
            </span>
            <Switch checked={registerAsSpeaking} onCheckedChange={setRegister} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="font-medium">Avaliar agora</span>
            <Switch checked={evaluate} onCheckedChange={setEvaluate} />
          </label>
          {evaluate && <EvaluationFields value={evaluation} onChange={setEvaluation} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDiscard(true)}>
              <Trash2 /> Descartar
            </Button>
            <Button onClick={() => save.run()} disabled={save.pending}>
              <Save /> {save.pending ? 'Salvando…' : 'Salvar gravação'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDiscard} onOpenChange={setConfirmDiscard} title="Descartar gravação?" description="O áudio não salvo será perdido." confirmLabel="Descartar" destructive onConfirm={rec.reset} />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(o) => !o && blocker.state === 'blocked' && blocker.reset()}
        title="Sair sem salvar?"
        description="Há uma gravação em andamento ou não salva. Se sair agora, ela será perdida."
        confirmLabel="Sair e perder"
        destructive
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </Card>
  )
}
