import { useLiveQuery } from 'dexie-react-hooks'
import { Flag, GitCompareArrows, HardDrive, Library, Mic, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts/ChartKit'
import { LoadingState, PageHeader, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { useActiveParticipant, useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useToday } from '@/hooks/useToday'
import { speakingEvolution } from '@/lib/chartData'
import { journeyDay, milestoneRecordings } from '@/lib/competition'
import { MILESTONE_DAYS } from '@/lib/constants'
import { addDays, formatLong, formatSeconds, formatShort } from '@/lib/dates'
import { evaluationTotal, isOralChallenge } from '@/lib/stats'
import { cn, formatBytes } from '@/lib/utils'
import { getStorageInfo } from '@/services/backup'
import { useUiStore } from '@/store/ui'
import { CompareProgress } from './CompareProgress'
import { RecorderPanel } from './RecorderPanel'
import { RecordingLibrary } from './RecordingLibrary'

const CRITERIA_LINES = [
  { key: 'clarity', label: 'Clareza', dash: '0' },
  { key: 'grammar', label: 'Gramática', dash: '6 3' },
  { key: 'vocabulary', label: 'Vocabulário', dash: '2 3' },
  { key: 'fluency', label: 'Fluidez', dash: '8 3 2 3' },
] as const

export default function SpeakingPage() {
  const bundle = useDataBundle()
  const today = useToday()
  const active = useActiveParticipant(bundle?.participants)
  const setActive = useUiStore((s) => s.setActiveParticipant)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'record'
  const [compare, setCompare] = useState<[string?, string?]>([])
  const storage = useLiveQuery(() => getStorageInfo(), [bundle?.recordings.length])

  const recordings = useMemo(() => (bundle && active ? bundle.recordings.filter((r) => r.participantId === active.id) : []), [bundle, active])
  if (!bundle || !active) return <LoadingState />

  const evaluations = bundle.evaluations.filter((e) => e.participantId === active.id)
  const oralAttempts = bundle.attempts.filter((a) => a.participantId === active.id && isOralChallenge(a)).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 15)
  const milestones = milestoneRecordings(active.startDate, recordings, MILESTONE_DAYS)
  const evolution = speakingEvolution(bundle, active.id)
  const timeline = [...recordings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const milestoneIds = new Set(Object.values(milestones).filter(Boolean).map((r) => r!.id))
  const setTab = (t: string) => setParams((p) => {
    p.set('tab', t)
    return p
  }, { replace: true })

  return (
    <PageTransition>
      <PageHeader
        title="Speaking Studio"
        icon={Mic}
        description="Grave, ouça e compare sua fala ao longo dos meses. Tudo fica salvo neste navegador."
        actions={<ParticipantPicker participants={bundle.participants} value={active.id} onChange={setActive} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="record">
            <Mic className="size-4" /> Gravar
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="size-4" /> Biblioteca <Badge>{recordings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="compare">
            <GitCompareArrows className="size-4" /> Compare Your Progress
          </TabsTrigger>
          <TabsTrigger value="evolution">
            <TrendingUp className="size-4" /> Evolução
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <RecorderPanel key={active.id} participant={active} attempts={oralAttempts} defaultTopic={params.get('topic') ?? ''} defaultAttemptId={params.get('attempt') ?? undefined} />
            <div className="flex flex-col gap-4">
              <MilestoneCard startDate={active.startDate} today={today} milestones={milestones} />
              <StorageCard storage={storage} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <RecordingLibrary participant={active} recordings={recordings} evaluations={evaluations} />
        </TabsContent>

        <TabsContent value="compare">
          <CompareProgress participant={active} recordings={recordings} evaluations={evaluations} initial={compare} />
        </TabsContent>

        <TabsContent value="evolution" className="flex flex-col gap-6">
          <section>
            <SectionTitle>Gravações de evolução (dias 1, 30, 60 e 90)</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {MILESTONE_DAYS.map((d) => {
                const r = milestones[d]
                const target = addDays(active.startDate, d - 1)
                return (
                  <Card key={d} className={cn('flex flex-col gap-1 p-4', r && 'border-foreground/25')}>
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Flag className="size-3.5" /> Dia {d}
                    </p>
                    {r ? (
                      <>
                        <p className="truncate text-sm">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShort(r.date)} · {formatSeconds(r.durationSeconds)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{target < today ? 'Sem gravação próxima deste dia' : `Grave em ${formatShort(target)}`}</p>
                    )}
                  </Card>
                )
              })}
            </div>
            {milestones[1] && Object.entries(milestones).filter(([k, v]) => k !== '1' && v).length > 0 && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  const last = [...MILESTONE_DAYS].reverse().map((d) => milestones[d]).find(Boolean)
                  setCompare([milestones[1]!.id, last!.id])
                  setTab('compare')
                }}
              >
                <GitCompareArrows /> Comparar dia 1 com o marco mais recente
              </Button>
            )}
          </section>

          <ChartCard
            title="Evolução das avaliações manuais"
            description="Notas dadas por vocês (autoavaliação ou parceiro), de 0 a 5 por critério"
            legend={[{ label: 'Total (÷4)', color: pColor(active) }, ...CRITERIA_LINES.map((c) => ({ label: c.label, color: 'var(--chart-axis)' }))]}
          >
            {evolution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Avalie suas gravações para ver a evolução.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution.map((e) => ({ ...e, avg: e.total / 4 }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={12} />
                  <YAxis {...axisProps} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  {CRITERIA_LINES.map((c) => (
                    <Line key={c.key} dataKey={c.key} name={c.label} stroke="var(--chart-axis)" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray={c.dash} dot={false} type="monotone" />
                  ))}
                  <Line dataKey="avg" name="Total ÷ 4" stroke={pColor(active)} strokeWidth={2.5} dot={{ r: 3.5, fill: pColor(active), stroke: 'var(--card)', strokeWidth: 2 }} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <section>
            <SectionTitle>Linha do tempo</SectionTitle>
            {timeline.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground">Nenhuma gravação ainda.</Card>
            ) : (
              <ol className="relative ml-3 border-l pl-6">
                {timeline.map((r) => {
                  const ev = evaluations.filter((e) => e.recordingId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
                  const milestone = milestoneIds.has(r.id)
                  return (
                    <li key={r.id} className="relative pb-5 last:pb-0">
                      <span aria-hidden className={cn('absolute top-1.5 -left-[31px] size-3 rounded-full border-2 border-card', milestone ? 'size-3.5' : '')} style={{ background: milestone ? pColor(active) : 'var(--chart-axis)' }} />
                      <p className="text-xs text-muted-foreground">
                        Dia {journeyDay(active.startDate, r.date)} · {formatLong(r.date)}
                      </p>
                      <p className="font-medium">
                        {r.title} {milestone && <Badge variant="brand">Marco</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSeconds(r.durationSeconds)}
                        {ev && ` · ${evaluationTotal(ev)}/20`}
                        {r.topic && ` · ${r.topic}`}
                      </p>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}

function MilestoneCard({ startDate, today, milestones }: { startDate: string; today: string; milestones: Record<number, { id: string } | undefined> }) {
  const day = journeyDay(startDate, today)
  const next = MILESTONE_DAYS.find((d) => d >= day && !milestones[d])
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">Hoje é o dia {day} da jornada</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {MILESTONE_DAYS.includes(day as (typeof MILESTONE_DAYS)[number]) && !milestones[day]
          ? `Dia de marco! Grave hoje para comparar depois.`
          : next
            ? `Próximo marco: dia ${next} (${formatShort(addDays(startDate, next - 1))}).`
            : 'Todos os marcos foram registrados. 🎉'}
      </p>
      <div className="mt-3 flex gap-1.5">
        {MILESTONE_DAYS.map((d) => (
          <span key={d} className={cn('flex-1 rounded-md border py-1 text-center text-xs tabular', milestones[d] ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            {d}
          </span>
        ))}
      </div>
    </Card>
  )
}

function StorageCard({ storage }: { storage?: Awaited<ReturnType<typeof getStorageInfo>> }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <HardDrive className="size-4" /> Armazenamento local
      </p>
      {storage ? (
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>
            Áudios: <span className="tabular text-foreground">{formatBytes(storage.audioBytes)}</span>
          </p>
          {storage.usage != null && storage.quota != null && (
            <p>
              Navegador: <span className="tabular text-foreground">{formatBytes(storage.usage)}</span> de {formatBytes(storage.quota)}
            </p>
          )}
          <p className="text-xs">As gravações não sincronizam entre aparelhos. Faça backups regularmente.</p>
          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <Link to="/configuracoes?tab=data">Fazer backup agora →</Link>
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Calculando…</p>
      )}
    </Card>
  )
}
