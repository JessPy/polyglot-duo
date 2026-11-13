import { CheckCircle2, Clock, Dices, Mic, Play, Shuffle, SkipForward, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState, LoadingState, PageHeader, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Badge, Slider } from '@/components/ui/misc'
import { BANDS, bandForLevel, drawChallenge } from '@/data/challenges'
import { useAction } from '@/hooks/useAsync'
import { useActiveParticipant, useDataBundle } from '@/hooks/useData'
import { useTimer } from '@/hooks/useTimer'
import { CHALLENGE_TYPES, DIFFICULTIES, LANGUAGES } from '@/lib/constants'
import { formatSeconds, formatShort } from '@/lib/dates'
import { countWords } from '@/lib/utils'
import { attemptsRepo } from '@/repositories'
import { useUiStore } from '@/store/ui'
import type { Challenge, ChallengeAttempt, ChallengeType, CefrLevel } from '@/types'

const STATUS = { in_progress: { label: 'Em andamento', variant: 'warning' }, completed: { label: 'Concluído', variant: 'success' }, skipped: { label: 'Pulado', variant: 'outline' } } as const

export function ChallengeContent({ challenge }: { challenge: Challenge }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{challenge.description}</p>
      {challenge.topic && <p className="rounded-lg bg-muted p-4 text-lg font-medium">{challenge.topic}</p>}
      {challenge.target && (
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase">Descreva sem dizer</p>
          <p className="text-2xl font-semibold">{challenge.target}</p>
        </div>
      )}
      {challenge.words && (
        <div className="flex flex-wrap gap-2">
          {challenge.words.map((w) => (
            <span key={w} className="rounded-lg border bg-card px-3 py-1.5 font-medium">
              {w}
            </span>
          ))}
        </div>
      )}
      {challenge.questions && challenge.type === 'interview' && (
        <ol className="list-decimal space-y-1.5 pl-5">
          {challenge.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function ChallengesPage() {
  const bundle = useDataBundle()
  const active = useActiveParticipant(bundle?.participants)
  const setActive = useUiStore((s) => s.setActiveParticipant)
  const [type, setType] = useState<ChallengeType | 'random'>('random')
  const [level, setLevel] = useState<CefrLevel | ''>('')
  const [draft, setDraft] = useState<Challenge>()
  const [deleting, setDeleting] = useState<ChallengeAttempt>()
  const remove = useAction((id: string) => attemptsRepo.remove(id), 'Desafio excluído.')
  const start = useAction(async (c: Challenge) => {
    if (active) await attemptsRepo.start(active.id, c)
    setDraft(undefined)
  })

  const attempts = useMemo(() => (bundle && active ? bundle.attempts.filter((a) => a.participantId === active.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)) : []), [bundle, active])
  useEffect(() => setDraft(undefined), [active?.id])

  if (!bundle || !active) return <LoadingState />
  const current = attempts.find((a) => a.status === 'in_progress')
  const effectiveLevel = level || active.currentLevel

  const draw = () => setDraft(drawChallenge({ language: active.language, level: effectiveLevel, type: type === 'random' ? undefined : type }))

  return (
    <PageTransition>
      <PageHeader
        title="Desafios"
        icon={Dices}
        description={`Catálogo local em ${LANGUAGES[active.language].label.toLowerCase()}, adaptado ao nível. Desafios concluídos contam como atividade.`}
        actions={<ParticipantPicker participants={bundle.participants} value={active.id} onChange={setActive} />}
      />

      {current ? (
        <ActiveAttempt key={current.id} attempt={current} recordings={bundle.recordings.filter((r) => r.participantId === active.id)} />
      ) : (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Tipo de desafio" htmlFor="ch-type">
              <NativeSelect id="ch-type" value={type} onChange={(e) => setType(e.target.value as ChallengeType | 'random')}>
                <option value="random">🎲 Aleatório</option>
                {(Object.keys(CHALLENGE_TYPES) as ChallengeType[]).map((t) => (
                  <option key={t} value={t}>
                    {CHALLENGE_TYPES[t].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Nível" htmlFor="ch-level">
              <NativeSelect id="ch-level" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel | '')}>
                <option value="">Meu nível ({active.currentLevel})</option>
                {Object.values(BANDS).map((b) => (
                  <option key={b.level} value={b.level}>
                    {b.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button size="lg" onClick={draw}>
              <Shuffle /> Sortear
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {draft && (
              <motion.div key={draft.id} initial={{ opacity: 0, rotateX: -12, y: 8 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-5 rounded-xl border p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{draft.title}</h2>
                  <Badge variant="brand">{DIFFICULTIES[draft.difficulty]}</Badge>
                  <Badge variant="outline">{BANDS[bandForLevel(draft.level)].label}</Badge>
                  <Badge variant="outline">
                    <Clock className="size-3" /> {draft.suggestedMinutes} min
                  </Badge>
                </div>
                <ChallengeContent challenge={draft} />
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => start.run(draft)} disabled={start.pending}>
                    <Play /> Começar desafio
                  </Button>
                  <Button variant="outline" onClick={draw}>
                    <Shuffle /> Sortear outro
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <section className="mt-8">
        <SectionTitle>Histórico</SectionTitle>
        {attempts.filter((a) => a.status !== 'in_progress').length === 0 ? (
          <EmptyState icon={Dices} title="Nenhum desafio realizado" description="Sorteie um desafio para começar." />
        ) : (
          <Card className="divide-y">
            {attempts
              .filter((a) => a.status !== 'in_progress')
              .map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.challenge.title}</span>
                      <Badge variant={STATUS[a.status].variant}>{STATUS[a.status].label}</Badge>
                      <Badge variant="outline">{DIFFICULTIES[a.challenge.difficulty]}</Badge>
                      {a.result != null && <Badge>Nota {a.result}/10</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.challenge.topic ?? a.challenge.target ?? a.challenge.words?.join(', ') ?? a.link ?? ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShort(a.date)}
                      {a.durationMinutes ? ` · ${a.durationMinutes} min` : ''}
                      {a.notes ? ` · ${a.notes}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Excluir desafio" onClick={() => setDeleting(a)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
          </Card>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Excluir desafio?"
        description="A atividade gerada por este desafio também será removida e os pontos recalculados."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleting) await remove.run(deleting.id)
        }}
      />
    </PageTransition>
  )
}

function ActiveAttempt({ attempt, recordings }: { attempt: ChallengeAttempt; recordings: { id: string; title: string; date: string }[] }) {
  const c = attempt.challenge
  const oral = CHALLENGE_TYPES[c.type].oral
  const timer = useTimer(c.suggestedMinutes * 60)
  const [answers, setAnswers] = useState(attempt.answers)
  const [text, setText] = useState(attempt.text ?? '')
  const [link, setLink] = useState(attempt.link ?? '')
  const [notes, setNotes] = useState(attempt.notes)
  const [result, setResult] = useState(attempt.result ?? 7)
  const [recordingId, setRecordingId] = useState(attempt.recordingId ?? '')
  const [listenMinutes, setListenMinutes] = useState(attempt.durationMinutes ?? c.suggestedMinutes)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const words = countWords(text)

  // Salva o rascunho automaticamente para não perder respostas ao navegar.
  useEffect(() => {
    const id = window.setTimeout(() => void attemptsRepo.save(attempt.id, { answers, text, link, notes, recordingId: recordingId || undefined }), 500)
    return () => window.clearTimeout(id)
  }, [attempt.id, answers, text, link, notes, recordingId])

  const complete = useAction(async () => {
    if (c.type === 'writing' && c.minWords && words < Math.min(20, c.minWords)) throw new Error('Escreva o texto antes de concluir.')
    const minutes = oral ? Math.max(1, Math.round(timer.elapsed / 60) || c.suggestedMinutes) : c.type === 'writing' ? Math.max(1, Math.round(timer.elapsed / 60) || c.suggestedMinutes) : listenMinutes
    await attemptsRepo.complete(attempt.id, { answers, text, link, notes, result, recordingId: recordingId || undefined, durationMinutes: minutes })
  }, 'Desafio concluído! 🎉')
  const skip = useAction(() => attemptsRepo.skip(attempt.id), 'Desafio pulado.')

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">Em andamento</Badge>
          <h2 className="text-lg font-semibold">{c.title}</h2>
          <Badge variant="outline">{DIFFICULTIES[c.difficulty]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className={`tabular text-2xl font-semibold ${timer.remaining === 0 ? 'text-destructive' : ''}`} aria-live="off">
            {formatSeconds(timer.remaining)}
          </span>
          <Button size="sm" variant="outline" onClick={timer.running ? timer.pause : timer.start}>
            {timer.running ? 'Pausar' : timer.elapsed ? 'Retomar' : 'Iniciar cronômetro'}
          </Button>
        </div>
      </div>

      <ChallengeContent challenge={c} />

      <div className="mt-5 flex flex-col gap-4 border-t pt-5">
        {(c.type === 'video' || c.type === 'listening') && (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <Field label={c.type === 'video' ? 'Link do vídeo' : 'Conteúdo ouvido (link ou nome)'} htmlFor="att-link">
                <Input id="att-link" value={link} maxLength={500} placeholder="https://…" onChange={(e) => setLink(e.target.value)} />
              </Field>
              <Field label="Tempo (min)" htmlFor="att-min">
                <Input id="att-min" type="number" min={1} value={listenMinutes} onChange={(e) => setListenMinutes(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>
            {c.questions?.map((q, i) => (
              <Field key={q} label={`${i + 1}. ${q}`} htmlFor={`att-q${i}`}>
                <Textarea id={`att-q${i}`} value={answers[i] ?? ''} maxLength={1500} onChange={(e) => setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))} />
              </Field>
            ))}
          </>
        )}
        {c.type === 'writing' && (
          <Field label="Seu texto" htmlFor="att-text" hint={`${words} palavras${c.minWords ? ` · meta: ${c.minWords}` : ''}`}>
            <Textarea id="att-text" value={text} className="min-h-48" lang={c.language} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        {oral && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4">
            <p className="text-sm">Grave sua resposta no Speaking Studio para comparar depois (opcional).</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" asChild>
                <Link to={`/speaking?tab=record&attempt=${attempt.id}&topic=${encodeURIComponent(c.topic ?? c.target ?? c.title)}`}>
                  <Mic /> Gravar no Speaking Studio
                </Link>
              </Button>
              {recordings.length > 0 && (
                <NativeSelect value={recordingId} onChange={(e) => setRecordingId(e.target.value)} aria-label="Anexar gravação">
                  <option value="">Anexar gravação…</option>
                  {recordings.slice(0, 20).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.date})
                    </option>
                  ))}
                </NativeSelect>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Resultado (autoavaliação)</span>
            <span className="tabular text-muted-foreground">{result}/10</span>
          </div>
          <Slider min={0} max={10} step={1} value={[result]} onValueChange={([v]) => setResult(v)} aria-label="Resultado" />
        </div>
        <Field label="Observações" htmlFor="att-notes">
          <Textarea id="att-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmSkip(true)}>
            <SkipForward /> Pular
          </Button>
          <Button onClick={() => complete.run()} disabled={complete.pending}>
            <CheckCircle2 /> Concluir desafio
          </Button>
        </div>
      </div>
      <ConfirmDialog open={confirmSkip} onOpenChange={setConfirmSkip} title="Pular este desafio?" description="Ele ficará no histórico como pulado e não contará pontos." confirmLabel="Pular" onConfirm={() => skip.run()} />
    </Card>
  )
}
