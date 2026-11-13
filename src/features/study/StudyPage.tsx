import { CalendarDays, List, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActivityFormDialog } from '@/components/shared/ActivityForm'
import { MonthGrid, firstOfMonth } from '@/components/shared/MonthGrid'
import { EmptyState, LoadingState, PageHeader, PageTransition } from '@/components/shared/Page'
import { ParticipantAvatar, ParticipantDot } from '@/components/shared/ParticipantAvatar'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { useActiveParticipant, useDataBundle } from '@/hooks/useData'
import { useToday } from '@/hooks/useToday'
import { ACTIVITY_CATEGORIES, ACTIVITY_RESULTS } from '@/lib/constants'
import { addDays, formatDuration, formatLong, startOfWeek } from '@/lib/dates'
import { activitiesRepo } from '@/repositories'
import type { ActivityCategory, DateKey, StudyActivity } from '@/types'

type Period = 'week' | 'month' | 'quarter' | 'all' | 'custom'

export default function StudyPage() {
  const bundle = useDataBundle()
  const today = useToday()
  const active = useActiveParticipant(bundle?.participants)
  const [participantFilter, setParticipantFilter] = useState('both')
  const [category, setCategory] = useState<ActivityCategory | ''>('')
  const [period, setPeriod] = useState<Period>('month')
  const [from, setFrom] = useState(addDays(today, -30))
  const [to, setTo] = useState(today)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StudyActivity>()
  const [deleting, setDeleting] = useState<StudyActivity>()
  const [month, setMonth] = useState(firstOfMonth(today))
  const [selectedDay, setSelectedDay] = useState<DateKey>(today)
  const remove = useAction((id: string) => activitiesRepo.remove(id), 'Atividade excluída.')

  const range = useMemo((): [DateKey, DateKey] => {
    switch (period) {
      case 'week':
        return [startOfWeek(today), today]
      case 'month':
        return [addDays(today, -29), today]
      case 'quarter':
        return [addDays(today, -89), today]
      case 'all':
        return ['0000-01-01', '9999-12-31']
      case 'custom':
        return [from, to]
    }
  }, [period, today, from, to])

  const filtered = useMemo(() => {
    if (!bundle) return []
    return bundle.activities
      .filter((a) => (participantFilter === 'both' || a.participantId === participantFilter) && (!category || a.category === category) && a.date >= range[0] && a.date <= range[1])
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [bundle, participantFilter, category, range])

  const grouped = useMemo(() => {
    const map = new Map<DateKey, StudyActivity[]>()
    for (const a of filtered) map.set(a.date, [...(map.get(a.date) ?? []), a])
    return [...map.entries()]
  }, [filtered])

  if (!bundle) return <LoadingState />
  const participants = bundle.participants
  const byId = (id: string) => participants.find((p) => p.id === id)
  const totalMinutes = filtered.reduce((s, a) => s + a.durationMinutes, 0)

  const openNew = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const ActivityRow = ({ a }: { a: StudyActivity }) => {
    const p = byId(a.participantId)
    return (
      <li className="flex items-start gap-3 py-3">
        {p && <ParticipantAvatar participant={p} size="sm" className="mt-0.5" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{ACTIVITY_CATEGORIES[a.category].label}</span>
            <span className="text-sm text-muted-foreground tabular">· {formatDuration(a.durationMinutes)}</span>
            {a.wordCount != null && <Badge variant="outline">{a.wordCount} palavras</Badge>}
            {a.result && <Badge>{ACTIVITY_RESULTS[a.result]}</Badge>}
            {a.source !== 'manual' && <Badge variant="brand">{a.source === 'recording' ? 'Gravação' : 'Desafio'}</Badge>}
          </div>
          {a.description && <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.description}</p>}
          {a.notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.notes}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar atividade"
            onClick={() => {
              setEditing(a)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Excluir atividade" onClick={() => setDeleting(a)}>
            <Trash2 />
          </Button>
        </div>
      </li>
    )
  }

  const minutesByDay = (d: DateKey) => {
    const acts = bundle.activities.filter((a) => a.date === d && (participantFilter === 'both' || a.participantId === participantFilter))
    return participants.map((p) => ({ p, minutes: acts.filter((a) => a.participantId === p.id).reduce((s, a) => s + a.durationMinutes, 0) }))
  }
  const dayActivities = bundle.activities.filter((a) => a.date === selectedDay && (participantFilter === 'both' || a.participantId === participantFilter))

  return (
    <PageTransition>
      <PageHeader
        title="Estudos"
        icon={NotebookPen}
        description="Registre cada sessão. Editar ou excluir recalcula a pontuação."
        actions={
          <Button onClick={openNew}>
            <Plus /> Registrar estudo
          </Button>
        }
      />

      <Tabs defaultValue="list">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="list">
              <List className="size-4" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="size-4" /> Calendário
            </TabsTrigger>
          </TabsList>
          <ParticipantPicker participants={participants} value={participantFilter} onChange={setParticipantFilter} allowBoth />
        </div>

        <TabsContent value="list">
          <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Categoria" htmlFor="f-cat">
              <NativeSelect id="f-cat" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}>
                <option value="">Todas</option>
                {(Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {ACTIVITY_CATEGORIES[c].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Período" htmlFor="f-period">
              <NativeSelect id="f-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                <option value="week">Esta semana</option>
                <option value="month">Últimos 30 dias</option>
                <option value="quarter">Últimos 90 dias</option>
                <option value="all">Tudo</option>
                <option value="custom">Personalizado</option>
              </NativeSelect>
            </Field>
            {period === 'custom' && (
              <>
                <Field label="De" htmlFor="f-from">
                  <Input id="f-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Até" htmlFor="f-to">
                  <Input id="f-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </>
            )}
          </Card>

          {filtered.length > 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'atividade' : 'atividades'} · {formatDuration(totalMinutes)}
            </p>
          )}

          {grouped.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Nenhuma atividade encontrada"
              description="Registre sua primeira sessão de estudo ou ajuste os filtros."
              action={
                <Button onClick={openNew}>
                  <Plus /> Registrar estudo
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map(([date, acts]) => (
                <Card key={date} className="px-4 py-2">
                  <h3 className="flex items-center justify-between border-b py-2 text-sm font-semibold">
                    <span >{date === today ? 'Hoje' : formatLong(date)}</span>
                    <span className="font-normal text-muted-foreground tabular">{formatDuration(acts.reduce((s, a) => s + a.durationMinutes, 0))}</span>
                  </h3>
                  <ul className="divide-y">
                    {acts.map((a) => (
                      <ActivityRow key={a.id} a={a} />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="p-4">
              <MonthGrid
                month={month}
                onMonthChange={setMonth}
                selected={selectedDay}
                onSelect={setSelectedDay}
                renderDay={(d) => (
                  <div className="flex flex-col gap-0.5">
                    {minutesByDay(d)
                      .filter((x) => x.minutes > 0)
                      .map(({ p, minutes }) => (
                        <span key={p.id} className="flex items-center gap-1 text-[10px] text-muted-foreground tabular">
                          <ParticipantDot participant={p} className="size-1.5" />
                          <span className="max-sm:hidden">{minutes}m</span>
                        </span>
                      ))}
                  </div>
                )}
              />
            </Card>
            <Card className="p-4">
              <h3 className="mb-2 font-semibold">{formatLong(selectedDay)}</h3>
              {dayActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>
              ) : (
                <ul className="divide-y">
                  {dayActivities.map((a) => (
                    <ActivityRow key={a.id} a={a} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ActivityFormDialog open={formOpen} onOpenChange={setFormOpen} participants={participants} defaultParticipantId={participantFilter !== 'both' ? participantFilter : active?.id} activity={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Excluir atividade?"
        description="Essa ação não pode ser desfeita. A pontuação da semana será recalculada."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleting) await remove.run(deleting.id)
        }}
      />
    </PageTransition>
  )
}
