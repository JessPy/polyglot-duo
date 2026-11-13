import { BookOpen, Calendar, ChartLine, Clock, Flame, Mic, Percent, Star, Target, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts/ChartKit'
import { ParticipantBarChart, ParticipantLineChart, legendFor } from '@/components/charts/Charts'
import { Heatmap } from '@/components/shared/Heatmap'
import { LoadingState, PageHeader, PageTransition, SectionTitle, StatTile } from '@/components/shared/Page'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/misc'
import { useAllStats, useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useToday } from '@/hooks/useToday'
import { activityDistribution, categoryComparison, minutesSeries, speakingEvolution, weeklyPointsSeries } from '@/lib/chartData'
import { ACTIVITY_CATEGORIES } from '@/lib/constants'
import { addDays, formatDuration, formatShort, startOfWeek } from '@/lib/dates'
import { compareTotals, dedupeActivities, goalsCompletion } from '@/lib/scoring'
import type { ActivityCategory } from '@/types'

type Period = '30' | '90' | 'all'

export default function AnalyticsPage() {
  const bundle = useDataBundle()
  const stats = useAllStats(bundle)
  const today = useToday()
  const [who, setWho] = useState('both')
  const [period, setPeriod] = useState<Period>('90')

  const start = useMemo(() => {
    if (!bundle) return today
    // Nunca antes do início da competição (ou da primeira atividade registrada retroativamente).
    const first = [...bundle.participants.map((p) => p.startDate), ...bundle.activities.map((a) => a.date)].sort()[0] ?? today
    if (period === 'all') return first
    const periodStart = addDays(today, -(Number(period) - 1))
    return periodStart > first ? periodStart : first
  }, [bundle, period, today])

  const data = useMemo(() => {
    if (!bundle) return null
    const participants = who === 'both' ? bundle.participants : bundle.participants.filter((p) => p.id === who)
    const ids = participants.map((p) => p.id)
    const acts = dedupeActivities(bundle.activities).filter((a) => ids.includes(a.participantId) && a.date >= start && a.date <= today)
    const reviews = bundle.reviews.filter((r) => ids.includes(r.participantId) && r.date >= start && r.date <= today)
    const recordings = bundle.recordings.filter((r) => ids.includes(r.participantId) && r.date >= start && r.date <= today)
    const scores = bundle.weeklyScores.filter((s) => ids.includes(s.participantId) && s.weekStart >= startOfWeek(start) && s.weekStart <= today)
    const learned =
      bundle.vocabulary.filter((v) => ids.includes(v.participantId) && v.firstLearnedAt && v.firstLearnedAt >= start && v.firstLearnedAt <= today).length +
      acts.filter((a) => a.category === 'vocabulary').reduce((s, a) => s + (a.wordCount ?? 0), 0)
    const recEvals = bundle.evaluations.filter((e) => recordings.some((r) => r.id === e.recordingId))
    const weeks = [...new Set(bundle.weeklyScores.map((s) => s.weekStart))].filter((w) => w < startOfWeek(today) && w >= startOfWeek(start)).sort()
    const [a, b] = bundle.participants
    const winners = weeks.map((w) => {
      const ta = bundle.weeklyScores.find((s) => s.participantId === a.id && s.weekStart === w)?.total ?? 0
      const tb = bundle.weeklyScores.find((s) => s.participantId === b.id && s.weekStart === w)?.total ?? 0
      return { week: w, a: ta, b: tb, winner: compareTotals({ id: a.id, total: ta }, { id: b.id, total: tb }).winnerId }
    })
    const weekly = period === 'all' || period === '90'
    return {
      participants,
      kpi: {
        minutes: acts.reduce((s, x) => s + x.durationMinutes, 0),
        activeDays: new Set([...acts.map((x) => `${x.participantId}|${x.date}`), ...reviews.map((r) => `${r.participantId}|${r.date}`)]).size,
        learned,
        retention: reviews.length ? Math.round((reviews.filter((r) => r.correct).length / reviews.length) * 100) : null,
        speaking: acts.filter((x) => x.category === 'speaking').length,
        recordings: recordings.length,
        avgEval: recEvals.length ? Math.round((recEvals.reduce((s, e) => s + e.clarity + e.grammar + e.vocabulary + e.fluency, 0) / recEvals.length) * 10) / 10 : null,
        avgScore: scores.length ? Math.round(scores.reduce((s, x) => s + x.total, 0) / scores.length) : 0,
        goalsDone: scores.reduce((s, x) => s + x.breakdown.filter((c) => c.ratio >= 1).length, 0),
      },
      winners,
      points: weeklyPointsSeries(bundle, start, today),
      minutes: minutesSeries(bundle, start, today, weekly ? 'week' : 'day'),
      compare: categoryComparison(bundle, startOfWeek(today)),
      distribution: activityDistribution(bundle, ids, start, today).map((d) => ({ ...d, label: ACTIVITY_CATEGORIES[d.category as ActivityCategory].label })),
      speaking: participants.map((p) => ({ p, series: speakingEvolution(bundle, p.id) })),
      heat: participants.map((p) => {
        const m = new Map<string, number>()
        for (const x of dedupeActivities(bundle.activities)) if (x.participantId === p.id) m.set(x.date, (m.get(x.date) ?? 0) + x.durationMinutes)
        return { p, m }
      }),
    }
  }, [bundle, who, start, today, period])

  if (!bundle || !stats || !data) return <LoadingState rows={4} />
  const { participants, kpi } = data
  const streak = participants.map((p) => stats[p.id].streak)
  const wins = (id: string) => data.winners.filter((w) => w.winner === id).length

  // Evolução de speaking: une as séries dos participantes por índice da gravação avaliada.
  const maxLen = Math.max(0, ...data.speaking.map((s) => s.series.length))
  const speakingRows = Array.from({ length: maxLen }, (_, i) => {
    const row: Record<string, number | string | null> = { key: String(i), label: `#${i + 1}` }
    for (const { p, series } of data.speaking) row[`p${p.slot}`] = series[i]?.total ?? null
    return row
  }) as ReturnType<typeof minutesSeries>

  return (
    <PageTransition>
      <PageHeader title="Analytics" icon={ChartLine} description="Indicadores e relatórios de evolução." />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ParticipantPicker participants={bundle.participants} value={who} onChange={setWho} allowBoth />
        <Segmented
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '30', label: '30 dias' },
            { value: '90', label: '90 dias' },
            { value: 'all', label: 'Tudo' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Clock} label="Horas estudadas" value={(kpi.minutes / 60).toFixed(1)} hint={formatDuration(kpi.minutes)} />
        <StatTile icon={Calendar} label="Dias ativos" value={kpi.activeDays} hint={who === 'both' ? 'soma dos dois' : undefined} />
        <StatTile icon={Flame} label="Streak atual" value={streak.join(' · ')} hint={participants.map((p) => p.name).join(' · ')} />
        <StatTile icon={BookOpen} label="Palavras aprendidas" value={kpi.learned} />
        <StatTile icon={Percent} label="Retenção" value={kpi.retention == null ? '—' : `${kpi.retention}%`} />
        <StatTile icon={Mic} label="Sessões de speaking" value={kpi.speaking} />
        <StatTile icon={Mic} label="Gravações salvas" value={kpi.recordings} />
        <StatTile icon={Star} label="Avaliação média" value={kpi.avgEval == null ? '—' : `${kpi.avgEval}/20`} hint="autoavaliações" />
        <StatTile icon={Target} label="Pontuação semanal média" value={kpi.avgScore} hint={`${kpi.goalsDone} metas cumpridas`} />
        <StatTile icon={Trophy} label="Semanas vencidas" value={bundle.participants.map((p) => wins(p.id)).join(' × ')} hint={bundle.participants.map((p) => p.name).join(' × ')} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Pontuação semanal" description="Linha de evolução (máx. 100)" legend={legendFor(participants)}>
          <ParticipantLineChart data={data.points} participants={participants} unit=" pts" domainMax={100} />
        </ChartCard>
        <ChartCard title="Estudo semanal" description={period === '30' ? 'Minutos por dia' : 'Minutos por semana'} legend={legendFor(participants)}>
          <ParticipantBarChart data={data.minutes} participants={participants} unit=" min" />
        </ChartCard>
        <ChartCard title="Comparação de metas (semana atual)" description="% de cumprimento por categoria" legend={legendFor(participants)}>
          <ParticipantBarChart data={data.compare} participants={participants} unit="%" domainMax={100} />
        </ChartCard>
        <ChartCard title="Distribuição de atividades" description="Minutos por categoria no período">
          {data.distribution.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem atividades no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distribution} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="label" {...axisProps} width={84} />
                <Tooltip content={<ChartTooltip unit=" min" />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
                <Bar dataKey="minutes" name="Minutos" fill={who === 'both' ? 'var(--brand)' : pColor(participants[0])} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Evolução de speaking" description="Total das avaliações manuais (0–20) por gravação avaliada" legend={legendFor(participants)} className="lg:col-span-2">
          {speakingRows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Avalie gravações no Speaking Studio para ver a evolução.</div>
          ) : (
            <ParticipantLineChart data={speakingRows} participants={participants} unit="/20" domainMax={20} />
          )}
        </ChartCard>
      </div>

      <section className="mt-8">
        <SectionTitle>Heatmap de consistência</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.heat.map(({ p, m }) => (
            <Card key={p.id} className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ParticipantAvatar participant={p} size="sm" /> {p.name}
              </p>
              <Heatmap minutesByDay={m} color={pColor(p)} label={`Heatmap de ${p.name}`} end={today} />
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Histórico de vencedores</SectionTitle>
        {data.winners.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Nenhuma semana encerrada no período.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Semana</th>
                  {bundle.participants.map((p) => (
                    <th key={p.id} className="p-3 text-right font-medium">
                      {p.avatar} {p.name}
                    </th>
                  ))}
                  <th className="p-3 text-right font-medium">Vencedor</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {[...data.winners].reverse().map((w) => (
                  <tr key={w.week} className="border-b last:border-0">
                    <td className="p-3 text-muted-foreground">{formatShort(w.week)}</td>
                    <td className="p-3 text-right">{Math.round(w.a)}</td>
                    <td className="p-3 text-right">{Math.round(w.b)}</td>
                    <td className="p-3 text-right font-medium">{bundle.participants.find((p) => p.id === w.winner)?.name ?? 'Empate'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Metas da semana atual: {bundle.participants.map((p) => `${p.name} ${goalsCompletion(stats[p.id].currentWeek)}%`).join(' · ')}
        </p>
      </section>
    </PageTransition>
  )
}
