import { BookOpen, Clock, Crown, Flame, HeartHandshake, Mic, Plus, Swords, Target, Trophy, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChartCard } from '@/components/charts/ChartKit'
import { ParticipantBarChart, ParticipantLineChart, legendFor } from '@/components/charts/Charts'
import { ActivityFormDialog } from '@/components/shared/ActivityForm'
import { LoadingState, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { ProgressRing } from '@/components/shared/ProgressRing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, Progress, Segmented } from '@/components/ui/misc'
import { useActiveParticipant, useAllStats, useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useToday } from '@/hooks/useToday'
import { categoryComparison, frequencySeries, minutesSeries, periodRange, vocabularySeries, weeklyPointsSeries } from '@/lib/chartData'
import { COOP_THRESHOLD, LANGUAGES, SCORE_CATEGORIES } from '@/lib/constants'
import { addDays, diffDays, endOfWeek, formatDuration, formatLong, formatShort, nextSunday, startOfWeek } from '@/lib/dates'
import { compareTotals, goalsCompletion } from '@/lib/scoring'
import { weekSummary } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { vocabularyItemsDue } from './helpers'

type Period = 'week' | 'month' | 'quarter'

export default function DashboardPage() {
  const bundle = useDataBundle()
  const stats = useAllStats(bundle)
  const today = useToday()
  const active = useActiveParticipant(bundle?.participants)
  const [period, setPeriod] = useState<Period>('month')
  const [formOpen, setFormOpen] = useState(false)

  const charts = useMemo(() => {
    if (!bundle) return null
    const range = periodRange(period, today)
    const first = [...bundle.participants.map((p) => p.startDate), ...bundle.activities.map((a) => a.date)].sort()[0] ?? today
    const { end, granularity } = range
    const start = period === 'week' || range.start > first ? range.start : first
    const weeksStartRaw = period === 'week' ? addDays(startOfWeek(today), -21) : start
    const weeksStart = weeksStartRaw > first ? weeksStartRaw : first
    return {
      minutes: minutesSeries(bundle, start, end, granularity),
      points: weeklyPointsSeries(bundle, weeksStart, today),
      vocab: vocabularySeries(bundle, start, end, granularity),
      frequency: frequencySeries(bundle, weeksStart, today),
      compare: categoryComparison(bundle, startOfWeek(today)),
    }
  }, [bundle, period, today])

  if (!bundle || !stats || !charts) return <LoadingState rows={4} />
  const { participants } = bundle
  const [a, b] = participants
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const scoreOf = (id: string) => stats[id]?.currentWeek?.total ?? 0
  const outcome = compareTotals({ id: a.id, total: scoreOf(a.id) }, { id: b.id, total: scoreOf(b.id) })
  const season = bundle.seasons.find((s) => s.status === 'active')
  const coopProgress = participants.map((p) => Math.min(1, scoreOf(p.id) / COOP_THRESHOLD))
  const coopDone = coopProgress.every((x) => x >= 1)
  const sunday = nextSunday(today)
  const battleToday = bundle.battles.find((x) => x.date === today)
  const recentWinners = [...new Set(bundle.weeklyScores.map((s) => s.weekStart))]
    .filter((w) => w < weekStart)
    .sort()
    .reverse()
    .slice(0, 6)
    .map((w) => {
      const sa = bundle.weeklyScores.find((s) => s.participantId === a.id && s.weekStart === w)?.total ?? 0
      const sb = bundle.weeklyScores.find((s) => s.participantId === b.id && s.weekStart === w)?.total ?? 0
      return { week: w, a: sa, b: sb, winner: compareTotals({ id: a.id, total: sa }, { id: b.id, total: sb }).winnerId }
    })
  const due = active ? vocabularyItemsDue(bundle, active.id, today) : 0

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatLong(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">Placar da semana</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Registrar estudo
          </Button>
          <Button variant="outline" asChild>
            <Link to="/vocabulario">
              <BookOpen /> Revisar{due > 0 && <Badge variant="brand">{due}</Badge>}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/speaking">
              <Mic /> Gravar
            </Link>
          </Button>
        </div>
      </div>

      {season && (
        <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="font-medium">{season.name}</p>
              <p className="text-sm text-muted-foreground">
                Dia {Math.min(season.lengthDays, diffDays(season.startDate, today) + 1)} de {season.lengthDays} · termina em {formatShort(season.endDate)}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <Progress value={((diffDays(season.startDate, today) + 1) / season.lengthDays) * 100} color="var(--brand)" />
          </div>
        </Card>
      )}

      {/* Placar */}
      <div className="grid gap-4 md:grid-cols-2">
        {participants.map((p, i) => {
          const s = stats[p.id]
          const leading = outcome.winnerId === p.id
          const total = scoreOf(p.id)
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className={cn('relative overflow-hidden p-5', leading && 'border-foreground/25')}>
                <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: pColor(p) }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ParticipantAvatar participant={p} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {LANGUAGES[p.language].flag} {LANGUAGES[p.language].label} · {p.currentLevel} → {p.targetLevel}
                      </p>
                    </div>
                  </div>
                  {leading && (
                    <Badge variant="warning" className="shrink-0">
                      <Crown className="size-3" /> Liderando
                    </Badge>
                  )}
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <ProgressRing value={total / 100} size={112} stroke={11} color={pColor(p)} label={`${total} de 100 pontos`}>
                    <span className="tabular text-3xl font-semibold tracking-tight">{Math.round(total)}</span>
                    <span className="text-[11px] text-muted-foreground">de 100 pts</span>
                  </ProgressRing>
                  <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-3 text-sm">
                    <Metric icon={Flame} label="Streak" value={`${s.streak} ${s.streak === 1 ? 'dia' : 'dias'}`} />
                    <Metric icon={Zap} label={`Nív. ${s.level.level}`} value={`${s.xp} XP`} />
                    <Metric icon={Target} label="Metas" value={`${goalsCompletion(s.currentWeek)}%`} />
                    <Metric icon={Clock} label="Semana" value={formatDuration(s.currentWeek?.studyMinutes ?? 0)} />
                    <Metric icon={BookOpen} label="Palavras" value={String(s.wordsLearned)} />
                    <Metric icon={Trophy} label="Título" value={s.level.title} />
                  </dl>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Nível {s.level.level}</span>
                    <span className="tabular">
                      {s.xp - s.level.currentLevelXp} / {s.level.nextLevelXp - s.level.currentLevelXp} XP
                    </span>
                  </div>
                  <Progress value={s.level.progress * 100} color={pColor(p)} className="h-1.5" />
                </div>
                <div className="mt-4 grid gap-2 border-t pt-4">
                  {(s.currentWeek?.breakdown ?? []).map((c) => (
                    <div key={c.category} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{SCORE_CATEGORIES[c.category].label}</span>
                      <Progress value={c.ratio * 100} color={pColor(p)} className="h-1.5" />
                      <span className="tabular w-[90px] text-right text-muted-foreground">
                        {c.category === 'retention' ? `${Math.round(c.achieved)}%/${c.target}%` : `${c.achieved}/${c.target}`} · <span className="font-medium text-foreground">{c.points}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Meta cooperativa + próximo duelo */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <HeartHandshake className={cn('size-5', coopDone ? 'text-success' : 'text-muted-foreground')} />
            <div className="flex-1">
              <p className="font-medium">Meta conjunta {coopDone && '— conquistada! 🎉'}</p>
              <p className="text-sm text-muted-foreground">Os dois com {COOP_THRESHOLD}+ pontos na semana desbloqueiam a recompensa conjunta.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate">{p.name}</span>
                <Progress value={coopProgress[i] * 100} color={pColor(p)} className="h-1.5" />
                <span className="tabular w-14 text-right text-muted-foreground">{Math.round(scoreOf(p.id))}/{COOP_THRESHOLD}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Swords className="size-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Próximo duelo</p>
            <p className="text-sm text-muted-foreground">
              {sunday === today ? (battleToday?.status === 'completed' ? 'Duelo de hoje concluído' : 'É hoje! Domingo de batalha') : formatLong(sunday)}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/battle">Abrir</Link>
          </Button>
        </Card>
      </div>

      {/* Resumo semanal */}
      <section className="mt-8">
        <SectionTitle>Resumo da semana · {formatShort(weekStart)} a {formatShort(weekEnd)}</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Indicador</th>
                {participants.map((p) => (
                  <th key={p.id} className="p-3 text-right font-medium">
                    {p.avatar} {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {(() => {
                const sums = participants.map((p) => weekSummary(bundle, p.id, weekStart, weekEnd))
                const rows: [string, (i: number) => string][] = [
                  ['Dias estudados', (i) => `${sums[i].studyDays}/7`],
                  ['Tempo total', (i) => formatDuration(sums[i].minutes)],
                  ['Palavras aprendidas', (i) => String(sums[i].words)],
                  ['Sessões de speaking', (i) => String(sums[i].speaking)],
                  ['Sessões de listening', (i) => String(sums[i].listening)],
                  ['Textos escritos', (i) => String(sums[i].writing)],
                  ['Desafios concluídos', (i) => String(sums[i].challenges)],
                  ['Meta semanal de tempo', (i) => `${Math.round((sums[i].minutes / participants[i].weeklyGoalMinutes) * 100)}%`],
                ]
                return rows.map(([label, fn]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="p-3 text-muted-foreground">{label}</td>
                    {participants.map((p, i) => (
                      <td key={p.id} className="p-3 text-right font-medium">
                        {fn(i)}
                      </td>
                    ))}
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Gráficos */}
      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Evolução</h2>
          <Segmented
            label="Período dos gráficos"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
              { value: 'quarter', label: 'Trimestre' },
            ]}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Minutos estudados" description={period === 'quarter' ? 'Por semana' : 'Por dia'} legend={legendFor(participants)}>
            <ParticipantBarChart data={charts.minutes} participants={participants} unit=" min" />
          </ChartCard>
          <ChartCard title="Evolução de pontos" description="Pontuação semanal (máx. 100)" legend={legendFor(participants)}>
            <ParticipantLineChart data={charts.points} participants={participants} unit=" pts" domainMax={100} />
          </ChartCard>
          <ChartCard title="Evolução do vocabulário" description="Palavras aprendidas (acumulado)" legend={legendFor(participants)}>
            <ParticipantLineChart data={charts.vocab} participants={participants} unit=" palavras" />
          </ChartCard>
          <ChartCard title="Frequência de estudo" description="Dias estudados por semana" legend={legendFor(participants)}>
            <ParticipantBarChart data={charts.frequency} participants={participants} unit=" dias" domainMax={7} />
          </ChartCard>
          <ChartCard title="Comparação de metas" description="Cumprimento das metas pessoais nesta semana (%)" legend={legendFor(participants)} className="lg:col-span-2">
            <ParticipantBarChart data={charts.compare} participants={participants} unit="%" domainMax={100} />
          </ChartCard>
        </div>
      </section>

      {/* Histórico semanal */}
      <section className="mt-8">
        <SectionTitle>
          Histórico semanal{' '}
          <Link to="/analytics" className="ml-2 text-xs font-normal normal-case underline-offset-4 hover:underline">
            ver tudo
          </Link>
        </SectionTitle>
        {recentWinners.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">O histórico aparece quando a primeira semana terminar (domingo à meia-noite).</Card>
        ) : (
          <Card>
            <CardHeader className="sr-only">
              <CardTitle>Semanas anteriores</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {recentWinners.map((w) => {
                const winner = participants.find((p) => p.id === w.winner)
                return (
                  <div key={w.week} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Semana de {formatShort(w.week)}</span>
                    <span className="tabular">
                      {a.avatar} {Math.round(w.a)} × {Math.round(w.b)} {b.avatar}
                    </span>
                    <span className="w-28 text-right font-medium">{winner ? `🏆 ${winner.name}` : 'Empate'}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </section>

      <ActivityFormDialog open={formOpen} onOpenChange={setFormOpen} participants={participants} defaultParticipantId={active?.id} />
    </PageTransition>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" aria-hidden /> {label}
      </dt>
      <dd className="tabular truncate font-semibold">{value}</dd>
    </div>
  )
}
