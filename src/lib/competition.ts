import { COOP_THRESHOLD } from '@/lib/constants'
import { addDays, diffDays, endOfWeek, isInRange, monthKey, startOfWeek, toDateKey } from '@/lib/dates'
import { round1 } from '@/lib/utils'
import type { Battle, DateKey, ID, Reward, RewardUnlock, Season, WeeklyScore } from '@/types'

/** Regras de temporadas, duelos e recompensas (funções puras). */

export function seasonEndDate(startDate: DateKey, lengthDays: number): DateKey {
  return addDays(startDate, lengthDays - 1)
}

export function seasonPoints(season: Pick<Season, 'startDate' | 'endDate'>, scores: WeeklyScore[], participantId: ID): number {
  return round1(
    scores
      .filter((s) => s.participantId === participantId && isInRange(s.weekStart, startOfWeek(season.startDate), season.endDate))
      .reduce((sum, s) => sum + s.total, 0),
  )
}

export function battleWinsInRange(battles: Battle[], participantId: ID, start: DateKey, end: DateKey): number {
  return battles.filter((b) => b.status === 'completed' && b.winnerId === participantId && isInRange(b.date, start, end)).length
}

/** Vencedor da temporada: mais pontos semanais; desempate por duelos vencidos. */
export function seasonWinner(
  season: Pick<Season, 'startDate' | 'endDate'>,
  participantIds: [ID, ID],
  scores: WeeklyScore[],
  battles: Battle[],
): { winnerId: ID | 'tie'; finalScores: Record<ID, number> } {
  const [a, b] = participantIds
  const pa = seasonPoints(season, scores, a)
  const pb = seasonPoints(season, scores, b)
  const finalScores = { [a]: pa, [b]: pb }
  if (pa !== pb) return { winnerId: pa > pb ? a : b, finalScores }
  const wa = battleWinsInRange(battles, a, season.startDate, season.endDate)
  const wb = battleWinsInRange(battles, b, season.startDate, season.endDate)
  if (wa !== wb) return { winnerId: wa > wb ? a : b, finalScores }
  return { winnerId: 'tie', finalScores }
}

/** Vencedor de uma batalha a partir das notas (critérios iguais para os dois). */
export function battleTurnTotal(t: { clarity: number; grammar: number; vocabulary: number; fluency: number }): number {
  return t.clarity + t.grammar + t.vocabulary + t.fluency
}

export function decideBattle(battle: Pick<Battle, 'turns'>): ID | 'tie' {
  const [t1, t2] = battle.turns
  if (!t1 || !t2) return 'tie'
  const a = battleTurnTotal(t1)
  const b = battleTurnTotal(t2)
  if (a === b) return 'tie'
  return a > b ? t1.participantId : t2.participantId
}

function weekWinner(scores: WeeklyScore[], weekStart: DateKey, [a, b]: [ID, ID]): ID | 'tie' | null {
  const sa = scores.find((s) => s.participantId === a && s.weekStart === weekStart)
  const sb = scores.find((s) => s.participantId === b && s.weekStart === weekStart)
  const ta = sa?.total ?? 0
  const tb = sb?.total ?? 0
  if (ta === 0 && tb === 0) return null
  if (ta === tb) return 'tie'
  return ta > tb ? a : b
}

export interface RewardContext {
  participantIds: [ID, ID]
  scores: WeeklyScore[]
  seasons: Season[]
  today: DateKey
}

/**
 * Calcula os desbloqueios devidos. Cada desbloqueio tem ID determinístico
 * (`recompensa_período`), então rodar de novo nunca duplica.
 * Só considera períodos que terminam depois da criação da recompensa.
 */
export function computeRewardUnlocks(rewards: Reward[], ctx: RewardContext, nowIso: string): RewardUnlock[] {
  const out: RewardUnlock[] = []
  const weekStarts = [...new Set(ctx.scores.map((s) => s.weekStart))].sort()
  const currentWeek = startOfWeek(ctx.today)

  for (const r of rewards) {
    if (r.status !== 'active') continue
    const created = toDateKey(new Date(r.createdAt))
    const push = (periodKey: string, winnerId: ID | 'both') =>
      out.push({ id: `${r.id}_${periodKey}`, rewardId: r.id, periodKey, winnerId, unlockedAt: nowIso })

    if (r.condition === 'weekly_winner') {
      for (const w of weekStarts) {
        if (w >= currentWeek || endOfWeek(w) < created) continue
        const win = weekWinner(ctx.scores, w, ctx.participantIds)
        if (win && win !== 'tie') push(`W${w}`, win)
      }
    }

    if (r.condition === 'coop_weekly') {
      for (const w of weekStarts) {
        if (endOfWeek(w) < created) continue
        const both = ctx.participantIds.every(
          (p) => (ctx.scores.find((s) => s.participantId === p && s.weekStart === w)?.total ?? 0) >= COOP_THRESHOLD,
        )
        if (both) push(`W${w}`, 'both')
      }
    }

    if (r.condition === 'monthly_winner') {
      const months = [...new Set(weekStarts.map(monthKey))]
      for (const m of months) {
        const monthEnd = lastDayOfMonth(m)
        if (monthEnd >= ctx.today || monthEnd < created) continue
        const [a, b] = ctx.participantIds
        const total = (p: ID) =>
          ctx.scores.filter((s) => s.participantId === p && monthKey(s.weekStart) === m).reduce((x, s) => x + s.total, 0)
        const ta = total(a)
        const tb = total(b)
        if (ta !== tb) push(`M${m}`, ta > tb ? a : b)
      }
    }

    if (r.condition === 'season_winner') {
      for (const s of ctx.seasons) {
        if (s.status !== 'completed' || !s.winnerId || s.winnerId === 'tie' || s.endDate < created) continue
        push(`S${s.id}`, s.winnerId)
      }
    }
  }
  return out
}

export function lastDayOfMonth(month: string): DateKey {
  const [y, m] = month.split('-').map(Number)
  return toDateKey(new Date(y, m, 0))
}

/** Dia N da jornada (dia 1 = data de início). */
export function journeyDay(startDate: DateKey, date: DateKey): number {
  return diffDays(startDate, date) + 1
}

/** Encontra, para cada marco (1, 30, 60, 90), a gravação mais próxima do dia (tolerância de ±3 dias). */
export function milestoneRecordings<T extends { id: ID; date: DateKey; createdAt: string }>(
  startDate: DateKey,
  recordings: T[],
  milestones: readonly number[],
  tolerance = 3,
): Record<number, T | undefined> {
  const result: Record<number, T | undefined> = {}
  for (const m of milestones) {
    let best: T | undefined
    let bestDist = Infinity
    for (const r of recordings) {
      const dist = Math.abs(journeyDay(startDate, r.date) - m)
      if (dist <= tolerance && (dist < bestDist || (dist === bestDist && best && r.createdAt < best.createdAt))) {
        best = r
        bestDist = dist
      }
    }
    result[m] = best
  }
  return result
}
