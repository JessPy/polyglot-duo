import { Check, Crown, Mic, Play, Pause, RotateCcw, Shuffle, Swords, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AudioPlayer } from '@/components/shared/AudioPlayer'
import { EmptyState, LoadingState, PageHeader, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field, NativeSelect, Textarea } from '@/components/ui/input'
import { Badge, Slider } from '@/components/ui/misc'
import { drawChallenge } from '@/data/challenges'
import { useAction } from '@/hooks/useAsync'
import { useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useTimer } from '@/hooks/useTimer'
import { useToday } from '@/hooks/useToday'
import { battleTurnTotal, decideBattle } from '@/lib/competition'
import { CHALLENGE_TYPES, EVALUATION_CRITERIA, LANGUAGES } from '@/lib/constants'
import { formatLong, formatSeconds, formatShort, fromDateKey, nextSunday } from '@/lib/dates'
import { cn, nowIso } from '@/lib/utils'
import { battlesRepo } from '@/repositories'
import type { Battle, BattleTurn, ChallengeType, Participant } from '@/types'
import { ChallengeContent } from '@/features/challenges/ChallengesPage'

const BATTLE_TYPES: ChallengeType[] = ['impromptu', 'story', 'interview', 'describe', 'writing']

export default function BattlePage() {
  const bundle = useDataBundle()
  const today = useToday()
  const [type, setType] = useState<ChallengeType | 'random'>('random')
  const [deleting, setDeleting] = useState<Battle>()
  const remove = useAction((id: string) => battlesRepo.remove(id), 'Duelo excluído.')

  const create = useAction(async () => {
    if (!bundle) return
    const chosen = type === 'random' ? BATTLE_TYPES[Math.floor(Math.random() * BATTLE_TYPES.length)] : type
    const turns: BattleTurn[] = bundle.participants.map((p) => ({
      participantId: p.id,
      challenge: drawChallenge({ language: p.language, level: p.currentLevel, type: chosen }),
      elapsedSeconds: 0,
      clarity: 3,
      grammar: 3,
      vocabulary: 3,
      fluency: 3,
      notes: '',
      done: false,
    }))
    await battlesRepo.create({ date: today, challengeType: chosen, turns })
  })

  if (!bundle) return <LoadingState />
  const { participants } = bundle
  const current = bundle.battles.find((b) => b.status === 'in_progress')
  const history = bundle.battles.filter((b) => b.status === 'completed').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const isSunday = fromDateKey(today).getDay() === 0
  const wins = (id: string) => history.filter((b) => b.winnerId === id).length

  return (
    <PageTransition>
      <PageHeader title="Sunday Battle" icon={Swords} description="O duelo semanal: mesmo tipo de desafio, cada um no seu idioma e nível, critérios iguais para os dois." />

      {current ? (
        <BattleRunner key={current.id} battle={current} participants={participants} recordings={bundle.recordings} onCancel={() => setDeleting(current)} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{isSunday ? 'Hoje é domingo de batalha! ⚔️' : `Próximo domingo: ${formatShort(nextSunday(today))}`}</p>
              <p className="text-sm text-muted-foreground">{isSunday ? 'Escolham o tipo de duelo e sorteiem os desafios.' : 'Vocês também podem duelar em qualquer outro dia.'}</p>
            </div>
            <div className="flex items-center gap-4">
              {participants.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <ParticipantAvatar participant={p} />
                  <span className="tabular text-xs text-muted-foreground">{wins(p.id)} vitórias</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t bg-muted/30 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="1. Selecione o duelo" htmlFor="bt-type">
              <NativeSelect id="bt-type" value={type} onChange={(e) => setType(e.target.value as ChallengeType | 'random')}>
                <option value="random">🎲 Surpresa</option>
                {BATTLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CHALLENGE_TYPES[t].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button size="lg" onClick={() => create.run()} disabled={create.pending}>
              <Shuffle /> 2. Sortear desafios
            </Button>
          </div>
        </Card>
      )}

      <section className="mt-8">
        <SectionTitle>Histórico de duelos</SectionTitle>
        {history.length === 0 ? (
          <EmptyState icon={Swords} title="Nenhum duelo ainda" description="O primeiro vencedor ganha a conquista Campeão de domingo." />
        ) : (
          <Card className="divide-y">
            {history.map((b) => {
              const winner = participants.find((p) => p.id === b.winnerId)
              return (
                <div key={b.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{CHALLENGE_TYPES[b.challengeType].label}</p>
                    <p className="text-xs text-muted-foreground">{formatLong(b.date)}</p>
                  </div>
                  <div className="tabular flex items-center gap-2 text-sm">
                    {b.turns.map((t, i) => {
                      const p = participants.find((x) => x.id === t.participantId)
                      return (
                        <span key={t.participantId} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground">×</span>}
                          {p?.avatar} {battleTurnTotal(t)}
                        </span>
                      )
                    })}
                  </div>
                  <Badge variant={winner ? 'warning' : 'default'} className="w-24 justify-center">
                    {winner ? `🏆 ${winner.name}` : 'Empate'}
                  </Badge>
                  <Button variant="ghost" size="icon-sm" aria-label="Excluir duelo" onClick={() => setDeleting(b)}>
                    <Trash2 />
                  </Button>
                </div>
              )
            })}
          </Card>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={deleting?.status === 'in_progress' ? 'Cancelar duelo?' : 'Excluir duelo?'}
        description="O registro do duelo será apagado. As gravações vinculadas continuam no Speaking Studio."
        confirmLabel={deleting?.status === 'in_progress' ? 'Cancelar duelo' : 'Excluir'}
        destructive
        onConfirm={async () => {
          if (deleting) await remove.run(deleting.id)
        }}
      />
    </PageTransition>
  )
}

function BattleRunner({ battle, participants, recordings, onCancel }: { battle: Battle; participants: Participant[]; recordings: { id: string; participantId: string; title: string; date: string; durationSeconds: number }[]; onCancel: () => void }) {
  const turnIndex = battle.turns.findIndex((t) => !t.done)
  const allDone = turnIndex === -1
  const save = (turns: BattleTurn[]) => battlesRepo.save(battle.id, { turns })
  const updateTurn = (i: number, changes: Partial<BattleTurn>) => save(battle.turns.map((t, j) => (j === i ? { ...t, ...changes } : t)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="warning">Em andamento</Badge>
          <span className="font-medium">{CHALLENGE_TYPES[battle.challengeType].label}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X /> Cancelar duelo
        </Button>
      </div>
      <ol className="flex gap-2" aria-label="Etapas">
        {battle.turns.map((t, i) => {
          const p = participants.find((x) => x.id === t.participantId)!
          return (
            <li key={t.participantId} className={cn('flex flex-1 items-center gap-2 rounded-lg border p-2 text-sm', i === turnIndex && 'border-foreground/40 bg-muted', t.done && 'opacity-70')}>
              <ParticipantAvatar participant={p} size="sm" />
              <span className="truncate">Vez de {p.name}</span>
              {t.done && <Check className="ml-auto size-4 text-success" />}
            </li>
          )
        })}
        <li className={cn('flex flex-1 items-center justify-center rounded-lg border p-2 text-sm', allDone && 'border-foreground/40 bg-muted')}>Resultado</li>
      </ol>

      {allDone ? (
        <BattleResult battle={battle} participants={participants} onReopen={(i) => updateTurn(i, { done: false })} />
      ) : (
        <TurnCard
          key={battle.turns[turnIndex].participantId}
          turn={battle.turns[turnIndex]}
          participant={participants.find((p) => p.id === battle.turns[turnIndex].participantId)!}
          recordings={recordings.filter((r) => r.participantId === battle.turns[turnIndex].participantId)}
          onChange={(c) => updateTurn(turnIndex, c)}
        />
      )}
    </div>
  )
}

function TurnCard({ turn, participant, recordings, onChange }: { turn: BattleTurn; participant: Participant; recordings: { id: string; title: string; date: string; durationSeconds: number }[]; onChange: (c: Partial<BattleTurn>) => Promise<void> }) {
  const c = turn.challenge
  const timer = useTimer(c.suggestedMinutes * 60)
  const [scores, setScores] = useState({ clarity: turn.clarity, grammar: turn.grammar, vocabulary: turn.vocabulary, fluency: turn.fluency })
  const [notes, setNotes] = useState(turn.notes)
  const [recordingId, setRecordingId] = useState(turn.recordingId ?? '')
  const finish = useAction(() => onChange({ ...scores, notes, recordingId: recordingId || undefined, elapsedSeconds: Math.round(timer.elapsed), startedAt: turn.startedAt ?? nowIso(), done: true }))

  useEffect(() => {
    if (timer.running && !turn.startedAt) void onChange({ startedAt: nowIso() })
  }, [timer.running, turn.startedAt, onChange])

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
      <Card className="relative overflow-hidden p-5">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: pColor(participant) }} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ParticipantAvatar participant={participant} />
            <div>
              <p className="font-semibold">{participant.name}</p>
              <p className="text-xs text-muted-foreground">
                {LANGUAGES[participant.language].flag} {LANGUAGES[participant.language].label} · nível {c.level}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('tabular text-3xl font-semibold', timer.remaining === 0 && 'text-destructive')}>{formatSeconds(timer.remaining)}</span>
            <Button size="icon" variant={timer.running ? 'outline' : 'default'} aria-label={timer.running ? 'Pausar cronômetro' : 'Iniciar cronômetro'} onClick={timer.running ? timer.pause : timer.start}>
              {timer.running ? <Pause /> : <Play />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Zerar cronômetro" onClick={timer.reset}>
              <RotateCcw />
            </Button>
          </div>
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">3. Instruções</p>
        <ChallengeContent challenge={c} />

        <div className="mt-6 grid gap-5 border-t pt-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Gravação (opcional)</p>
            <Button variant="outline" asChild>
              <Link to={`/speaking?tab=record&topic=${encodeURIComponent('Sunday Battle — ' + (c.topic ?? c.target ?? c.title))}`}>
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
            {recordingId && <AudioPlayer recordingId={recordingId} compact />}
            <Field label="Observações" htmlFor="turn-notes">
              <Textarea id="turn-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">4. Avaliação (pelo parceiro, relativa ao nível)</p>
            {EVALUATION_CRITERIA.map((k) => (
              <div key={k.key}>
                <div className="flex justify-between text-sm">
                  <span>{k.label}</span>
                  <span className="tabular text-muted-foreground">{scores[k.key]}/5</span>
                </div>
                <Slider min={0} max={5} step={1} value={[scores[k.key]]} onValueChange={([v]) => setScores((s) => ({ ...s, [k.key]: v }))} aria-label={k.label} />
              </div>
            ))}
            <p className="tabular text-right text-sm font-semibold">Total: {battleTurnTotal(scores)}/20</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => finish.run()} disabled={finish.pending}>
            <Check /> Registrar resultado
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

function BattleResult({ battle, participants, onReopen }: { battle: Battle; participants: Participant[]; onReopen: (i: number) => void }) {
  const suggested = decideBattle(battle)
  const [winner, setWinner] = useState<string>(suggested)
  const finish = useAction(() => battlesRepo.save(battle.id, { status: 'completed', winnerId: winner, completedAt: nowIso() }), 'Duelo registrado!')
  const winnerP = participants.find((p) => p.id === winner)

  return (
    <Card className="p-5">
      <p className="mb-4 text-xs font-medium text-muted-foreground uppercase">5. Comparação</p>
      <div className="grid gap-4 md:grid-cols-2">
        {battle.turns.map((t, i) => {
          const p = participants.find((x) => x.id === t.participantId)!
          const isWinner = suggested === p.id
          return (
            <div key={t.participantId} className={cn('rounded-xl border p-4', isWinner && 'border-foreground/30')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ParticipantAvatar participant={p} size="sm" />
                  <span className="font-medium">{p.name}</span>
                  {isWinner && <Crown className="size-4 text-warning" />}
                </div>
                <span className="tabular text-2xl font-semibold">{battleTurnTotal(t)}</span>
              </div>
              <div className="mt-3 grid gap-1.5">
                {EVALUATION_CRITERIA.map((k) => (
                  <div key={k.key} className="grid grid-cols-[90px_1fr_24px] items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{k.label}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(t[k.key] / 5) * 100}%`, background: pColor(p) }} />
                    </div>
                    <span className="tabular text-right">{t[k.key]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tempo: {formatSeconds(t.elapsedSeconds)}</p>
              {t.recordingId && <AudioPlayer recordingId={t.recordingId} compact className="mt-2" />}
              {t.notes && <p className="mt-2 text-sm text-muted-foreground">{t.notes}</p>}
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => onReopen(i)}>
                Corrigir avaliação
              </Button>
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t pt-5">
        <p className="text-sm">
          Sugestão pelas notas: <strong>{suggested === 'tie' ? 'Empate' : participants.find((p) => p.id === suggested)?.name}</strong>. Vocês podem ajustar:
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Vencedor">
          {participants.map((p) => (
            <Button key={p.id} variant={winner === p.id ? 'default' : 'outline'} role="radio" aria-checked={winner === p.id} onClick={() => setWinner(p.id)}>
              {p.avatar} {p.name}
            </Button>
          ))}
          <Button variant={winner === 'tie' ? 'default' : 'outline'} role="radio" aria-checked={winner === 'tie'} onClick={() => setWinner('tie')}>
            🤝 Empate
          </Button>
        </div>
        <Button size="lg" variant="brand" onClick={() => finish.run()} disabled={finish.pending}>
          <Crown /> {winnerP ? `6. Declarar ${winnerP.name} vencedor(a)` : '6. Declarar empate'}
        </Button>
      </div>
    </Card>
  )
}
