import { ArrowRight, GitCompareArrows, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AudioPlayer } from '@/components/shared/AudioPlayer'
import { EmptyState } from '@/components/shared/Page'
import { Card } from '@/components/ui/card'
import { Field, NativeSelect } from '@/components/ui/input'
import { journeyLabel } from '@/lib/competition'
import { EVALUATION_CRITERIA } from '@/lib/constants'
import { formatLong, formatSeconds } from '@/lib/dates'
import { evaluationTotal } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { AudioRecording, Participant, SpeakingEvaluation } from '@/types'

/** Compare Your Progress: duas gravações do mesmo participante lado a lado. */
export function CompareProgress({ participant, recordings, evaluations, initial }: { participant: Participant; recordings: AudioRecording[]; evaluations: SpeakingEvaluation[]; initial?: [string?, string?] }) {
  const sorted = [...recordings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const [oldId, setOldId] = useState(initial?.[0] ?? sorted[0]?.id ?? '')
  const [newId, setNewId] = useState(initial?.[1] ?? sorted[sorted.length - 1]?.id ?? '')

  useEffect(() => {
    if (initial?.[0]) setOldId(initial[0])
    if (initial?.[1]) setNewId(initial[1])
  }, [initial])
  useEffect(() => {
    if (!sorted.some((r) => r.id === oldId)) setOldId(sorted[0]?.id ?? '')
    if (!sorted.some((r) => r.id === newId)) setNewId(sorted[sorted.length - 1]?.id ?? '')
  }, [sorted, oldId, newId])

  if (sorted.length < 2)
    return <EmptyState icon={GitCompareArrows} title="Grave pelo menos duas vezes" description="Com duas ou mais gravações você pode comparar a evolução — por exemplo, o dia 1 com o dia 30." />

  const evalFor = (id: string) => evaluations.filter((e) => e.recordingId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const older = sorted.find((r) => r.id === oldId)
  const newer = sorted.find((r) => r.id === newId)
  const eo = older && evalFor(older.id)
  const en = newer && evalFor(newer.id)

  const option = (r: AudioRecording) => (
    <option key={r.id} value={r.id}>
      {journeyLabel(participant.startDate, r.date, true)} · {r.title}
    </option>
  )

  const side = (r: AudioRecording | undefined, e: SpeakingEvaluation | undefined, label: string) =>
    r ? (
      <Card key={label} className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatLong(r.date)} · {journeyLabel(participant.startDate, r.date)} · {formatSeconds(r.durationSeconds)}
          </p>
        </div>
        <AudioPlayer recordingId={r.id} fallbackDuration={r.durationSeconds} compact />
        {r.topic && <p className="text-sm"><span className="text-muted-foreground">Tema:</span> {r.topic}</p>}
        <p className="min-h-5 text-sm whitespace-pre-line text-muted-foreground">{r.notes || 'Sem observações.'}</p>
        <p className="text-sm">{e ? <>Avaliação: <strong className="tabular">{evaluationTotal(e)}/20</strong> ({e.evaluator === 'self' ? 'autoavaliação' : 'parceiro'})</> : <span className="text-muted-foreground">Sem avaliação</span>}</p>
      </Card>
    ) : null

  const delta = (a: number, b: number) => {
    const d = b - a
    const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus
    return (
      <span className={cn('tabular inline-flex items-center gap-1 text-xs font-medium', d > 0 ? 'text-success' : d < 0 ? 'text-destructive' : 'text-muted-foreground')}>
        <Icon className="size-3.5" aria-hidden /> {d > 0 ? '+' : ''}
        {d}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <Field label="Gravação antiga" htmlFor="cmp-old">
          <NativeSelect id="cmp-old" value={oldId} onChange={(e) => setOldId(e.target.value)}>
            {sorted.map(option)}
          </NativeSelect>
        </Field>
        <ArrowRight className="mx-auto mb-2.5 hidden size-4 text-muted-foreground sm:block" aria-hidden />
        <Field label="Gravação recente" htmlFor="cmp-new">
          <NativeSelect id="cmp-new" value={newId} onChange={(e) => setNewId(e.target.value)}>
            {sorted.map(option)}
          </NativeSelect>
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {side(older, eo, 'Antes')}
        {side(newer, en, 'Depois')}
      </div>
      {eo && en && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">Comparação das avaliações manuais</p>
          <div className="grid gap-2">
            {EVALUATION_CRITERIA.map((c) => (
              <div key={c.key} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="tabular">
                  {eo[c.key]} → {en[c.key]}
                </span>
                {delta(eo[c.key], en[c.key])}
              </div>
            ))}
            <div className="grid grid-cols-[100px_1fr_auto] items-center gap-3 border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span className="tabular">
                {evaluationTotal(eo)} → {evaluationTotal(en)}
              </span>
              {delta(evaluationTotal(eo), evaluationTotal(en))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Autoavaliações e avaliações do parceiro — não são análises automáticas.</p>
        </Card>
      )}
    </div>
  )
}
