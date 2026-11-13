import { CalendarDays, Dices, Flag, GraduationCap, Swords } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Heatmap } from '@/components/shared/Heatmap'
import { MonthGrid, firstOfMonth } from '@/components/shared/MonthGrid'
import { LoadingState, PageHeader, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { Card } from '@/components/ui/card'
import { useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useToday } from '@/hooks/useToday'
import { journeyDay } from '@/lib/competition'
import { ACTIVITY_CATEGORIES, CHALLENGE_TYPES, MILESTONE_DAYS } from '@/lib/constants'
import { formatDuration, formatLong } from '@/lib/dates'
import { dedupeActivities } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { DateKey } from '@/types'

export default function CalendarPage() {
  const bundle = useDataBundle()
  const today = useToday()
  const [month, setMonth] = useState(firstOfMonth(today))
  const [selected, setSelected] = useState<DateKey>(today)

  const index = useMemo(() => {
    if (!bundle) return null
    const acts = dedupeActivities(bundle.activities)
    const minutes = new Map<string, number>() // `${pid}|${date}`
    for (const a of acts) minutes.set(`${a.participantId}|${a.date}`, (minutes.get(`${a.participantId}|${a.date}`) ?? 0) + a.durationMinutes)
    const reviewed = new Set(bundle.reviews.map((r) => `${r.participantId}|${r.date}`))
    const minutesByParticipant = Object.fromEntries(
      bundle.participants.map((p) => {
        const m = new Map<DateKey, number>()
        for (const [k, v] of minutes) if (k.startsWith(p.id + '|')) m.set(k.split('|')[1], v)
        for (const k of reviewed) if (k.startsWith(p.id + '|') && !m.has(k.split('|')[1])) m.set(k.split('|')[1], 1)
        return [p.id, m]
      }),
    )
    return { acts, minutes, reviewed, minutesByParticipant }
  }, [bundle])

  if (!bundle || !index) return <LoadingState />
  const { participants } = bundle

  const dayInfo = (d: DateKey) => {
    const perP = participants.map((p) => {
      const minutes = index.minutes.get(`${p.id}|${d}`) ?? 0
      const studied = minutes > 0 || index.reviewed.has(`${p.id}|${d}`)
      const milestone = MILESTONE_DAYS.find((m) => journeyDay(p.startDate, d) === m)
      return { p, minutes, studied, goalMet: minutes >= p.dailyGoalMinutes, milestone }
    })
    const challenges = bundle.attempts.filter((a) => a.date === d && a.status === 'completed')
    const battles = bundle.battles.filter((b) => b.date === d)
    const due = d >= today ? bundle.vocabulary.filter((v) => (d === today ? v.dueDate <= d : v.dueDate === d)).length : 0
    return { perP, challenges, battles, due }
  }

  const sel = dayInfo(selected)
  const selActs = index.acts.filter((a) => a.date === selected)

  return (
    <PageTransition>
      <PageHeader title="Calendário" icon={CalendarDays} description="Dias estudados, metas, desafios, duelos, revisões e marcos de avaliação." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-3 sm:p-4">
          <MonthGrid
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={setSelected}
            renderDay={(d) => {
              const info = dayInfo(d)
              return (
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap gap-1">
                    {info.perP.map(({ p, studied, goalMet }) =>
                      studied ? (
                        <span
                          key={p.id}
                          title={`${p.name}${goalMet ? ' — meta diária cumprida' : ''}`}
                          className={cn('size-2.5 rounded-full border-2')}
                          style={{ borderColor: pColor(p), background: goalMet ? pColor(p) : 'transparent' }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5 text-[10px] leading-none text-muted-foreground">
                    {info.battles.length > 0 && <Swords className="size-3" aria-label="Duelo" />}
                    {info.challenges.length > 0 && <Dices className="size-3" aria-label="Desafio" />}
                    {info.perP.some((x) => x.milestone) && <Flag className="size-3" aria-label="Marco de avaliação" />}
                    {info.due > 0 && <GraduationCap className="size-3" aria-label="Revisões pendentes" />}
                  </div>
                </div>
              )
            }}
          />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
            {participants.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: pColor(p) }} /> {p.name} (cheio = meta diária)
              </span>
            ))}
            <span className="flex items-center gap-1">
              <Swords className="size-3" /> Duelo
            </span>
            <span className="flex items-center gap-1">
              <Dices className="size-3" /> Desafio
            </span>
            <span className="flex items-center gap-1">
              <Flag className="size-3" /> Marco (dia 1/30/60/90)
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3" /> Revisões
            </span>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-4">
          <h2 className="font-semibold">{formatLong(selected)}</h2>
          {sel.perP.map(({ p, minutes, goalMet, milestone }) => (
            <div key={p.id} className="flex items-center gap-3">
              <ParticipantAvatar participant={p} size="sm" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {minutes ? `${formatDuration(minutes)} · ${goalMet ? 'meta diária ✓' : `meta: ${p.dailyGoalMinutes} min`}` : 'Sem estudo registrado'}
                  {milestone && ` · 🚩 dia ${milestone}`}
                </p>
              </div>
            </div>
          ))}
          {selActs.length > 0 && (
            <ul className="space-y-1 border-t pt-3 text-sm">
              {selActs.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {participants.find((p) => p.id === a.participantId)?.avatar} {ACTIVITY_CATEGORIES[a.category].label}
                  </span>
                  <span className="tabular shrink-0 text-muted-foreground">{a.durationMinutes} min</span>
                </li>
              ))}
            </ul>
          )}
          {sel.challenges.map((c) => (
            <p key={c.id} className="text-sm">
              🎯 {participants.find((p) => p.id === c.participantId)?.name}: {CHALLENGE_TYPES[c.challenge.type].label}
            </p>
          ))}
          {sel.battles.map((b) => (
            <p key={b.id} className="text-sm">
              ⚔️ Duelo {b.status === 'completed' ? `— ${participants.find((p) => p.id === b.winnerId)?.name ?? 'empate'}` : 'em andamento'}
            </p>
          ))}
          {sel.due > 0 && <p className="text-sm">📚 {sel.due} revisões de flashcards</p>}
        </Card>
      </div>

      <section className="mt-8">
        <SectionTitle>Consistência (últimas 26 semanas)</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          {participants.map((p) => (
            <Card key={p.id} className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ParticipantAvatar participant={p} size="sm" /> {p.name}
              </p>
              <Heatmap minutesByDay={index.minutesByParticipant[p.id]} color={pColor(p)} label={`Heatmap de estudo de ${p.name}`} end={today} />
            </Card>
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
