import { SCORE_CATEGORIES } from '@/lib/constants'
import { addDays, endOfWeek, formatShort, rangeDays, startOfWeek, weekStartsBetween } from '@/lib/dates'
import { dedupeActivities } from '@/lib/scoring'
import type { DataBundle } from '@/lib/stats'
import { evaluationTotal } from '@/lib/stats'
import type { DateKey, Participant, ScoreCategory } from '@/types'

/** Preparação de séries para gráficos (funções puras). Chaves das séries: p1 / p2 (slot do participante). */

export type ChartRow = { key: string; label: string } & Record<string, number | string | null>
export type Granularity = 'day' | 'week'

const sk = (p: Pick<Participant, 'slot'>) => `p${p.slot}`

export function minutesSeries(bundle: DataBundle, start: DateKey, end: DateKey, granularity: Granularity): ChartRow[] {
  const acts = dedupeActivities(bundle.activities)
  if (granularity === 'day') {
    return rangeDays(start, end).map((d) => {
      const row: ChartRow = { key: d, label: formatShort(d) }
      for (const p of bundle.participants) row[sk(p)] = acts.filter((a) => a.participantId === p.id && a.date === d).reduce((s, a) => s + a.durationMinutes, 0)
      return row
    })
  }
  return weekStartsBetween(start, end).map((w) => {
    const we = endOfWeek(w)
    const row: ChartRow = { key: w, label: formatShort(w) }
    for (const p of bundle.participants) row[sk(p)] = acts.filter((a) => a.participantId === p.id && a.date >= w && a.date <= we).reduce((s, a) => s + a.durationMinutes, 0)
    return row
  })
}

export function weeklyPointsSeries(bundle: DataBundle, start: DateKey, end: DateKey): ChartRow[] {
  return weekStartsBetween(start, end).map((w) => {
    const row: ChartRow = { key: w, label: formatShort(w) }
    for (const p of bundle.participants) row[sk(p)] = bundle.weeklyScores.find((s) => s.participantId === p.id && s.weekStart === w)?.total ?? 0
    return row
  })
}

/** Palavras aprendidas acumuladas (flashcards aprendidos + vocabulário registrado). */
export function vocabularySeries(bundle: DataBundle, start: DateKey, end: DateKey, granularity: Granularity): ChartRow[] {
  const acts = dedupeActivities(bundle.activities).filter((a) => a.category === 'vocabulary')
  const points = granularity === 'day' ? rangeDays(start, end) : weekStartsBetween(start, end).map((w) => (endOfWeek(w) > end ? end : endOfWeek(w)))
  return points.map((d) => {
    const row: ChartRow = { key: d, label: formatShort(granularity === 'day' ? d : startOfWeek(d)) }
    for (const p of bundle.participants) {
      const cards = bundle.vocabulary.filter((v) => v.participantId === p.id && v.firstLearnedAt && v.firstLearnedAt <= d).length
      const logged = acts.filter((a) => a.participantId === p.id && a.date <= d).reduce((s, a) => s + (a.wordCount ?? 0), 0)
      row[sk(p)] = cards + logged
    }
    return row
  })
}

/** Dias estudados por semana. */
export function frequencySeries(bundle: DataBundle, start: DateKey, end: DateKey): ChartRow[] {
  return weekStartsBetween(start, end).map((w) => {
    const we = endOfWeek(w)
    const row: ChartRow = { key: w, label: formatShort(w) }
    for (const p of bundle.participants) {
      const dates = new Set([
        ...bundle.activities.filter((a) => a.participantId === p.id && a.date >= w && a.date <= we).map((a) => a.date),
        ...bundle.reviews.filter((r) => r.participantId === p.id && r.date >= w && r.date <= we).map((r) => r.date),
      ])
      row[sk(p)] = dates.size
    }
    return row
  })
}

/** Percentual de cumprimento de cada meta na semana, lado a lado. */
export function categoryComparison(bundle: DataBundle, weekStart: DateKey): ChartRow[] {
  return (Object.keys(SCORE_CATEGORIES) as ScoreCategory[]).map((c) => {
    const row: ChartRow = { key: c, label: SCORE_CATEGORIES[c].label }
    for (const p of bundle.participants) {
      const s = bundle.weeklyScores.find((x) => x.participantId === p.id && x.weekStart === weekStart)
      row[sk(p)] = Math.round((s?.breakdown.find((b) => b.category === c)?.ratio ?? 0) * 100)
    }
    return row
  })
}

/** Distribuição de minutos por categoria de atividade. */
export function activityDistribution(bundle: DataBundle, participantIds: string[], start: DateKey, end: DateKey) {
  const acts = dedupeActivities(bundle.activities).filter((a) => participantIds.includes(a.participantId) && a.date >= start && a.date <= end)
  const totals = new Map<string, number>()
  for (const a of acts) totals.set(a.category, (totals.get(a.category) ?? 0) + a.durationMinutes)
  return [...totals.entries()].map(([category, minutes]) => ({ category, minutes })).sort((a, b) => b.minutes - a.minutes)
}

/** Evolução das avaliações manuais de speaking de um participante. */
export function speakingEvolution(bundle: DataBundle, participantId: string) {
  return bundle.recordings
    .filter((r) => r.participantId === participantId)
    .map((r) => ({ r, e: bundle.evaluations.filter((e) => e.recordingId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] }))
    .filter((x) => x.e)
    .sort((a, b) => a.r.date.localeCompare(b.r.date) || a.r.createdAt.localeCompare(b.r.createdAt))
    .map(({ r, e }) => ({
      key: r.id,
      label: formatShort(r.date),
      title: r.title,
      total: evaluationTotal(e!),
      clarity: e!.clarity,
      grammar: e!.grammar,
      vocabulary: e!.vocabulary,
      fluency: e!.fluency,
    }))
}

export function periodRange(period: 'week' | 'month' | 'quarter', today: DateKey): { start: DateKey; end: DateKey; granularity: Granularity } {
  if (period === 'week') return { start: startOfWeek(today), end: endOfWeek(today), granularity: 'day' }
  if (period === 'month') return { start: addDays(today, -29), end: today, granularity: 'day' }
  return { start: addDays(today, -89), end: today, granularity: 'week' }
}
