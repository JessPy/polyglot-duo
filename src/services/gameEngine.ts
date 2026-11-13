import { db } from '@/db/database'
import { battleWinsInRange, computeRewardUnlocks, seasonWinner } from '@/lib/competition'
import { isInRange, todayKey, weekStartsBetween } from '@/lib/dates'
import { unlockedAchievements } from '@/lib/gamification'
import { computeWeeklyScore, dedupeActivities, goalForWeek } from '@/lib/scoring'
import { buildParticipantStats } from '@/lib/stats'
import { nowIso } from '@/lib/utils'
import type { Achievement, RewardUnlock, Season, WeeklyScore } from '@/types'
import { loadDataBundle } from './dataBundle'

export interface SyncResult {
  newAchievements: Achievement[]
  newUnlocks: RewardUnlock[]
}

const sameScore = (a: WeeklyScore, b: WeeklyScore) =>
  a.total === b.total &&
  a.studyMinutes === b.studyMinutes &&
  a.studyDays === b.studyDays &&
  JSON.stringify(a.breakdown) === JSON.stringify(b.breakdown)

/**
 * Recalcula tudo o que é derivado dos registros: placar semanal (histórico completo),
 * fechamento de temporadas, desbloqueio de recompensas e conquistas.
 * É idempotente: pode rodar quantas vezes for preciso sem duplicar nada.
 */
export async function syncGameState(today = todayKey()): Promise<SyncResult> {
  const empty: SyncResult = { newAchievements: [], newUnlocks: [] }
  const bundle = await loadDataBundle()
  if (bundle.participants.length < 2) return empty
  const now = nowIso()

  // 1. Placar semanal de todas as semanas desde o início
  const scores: WeeklyScore[] = []
  for (const p of bundle.participants) {
    const acts = dedupeActivities(bundle.activities.filter((a) => a.participantId === p.id))
    const reviews = bundle.reviews.filter((r) => r.participantId === p.id)
    const learnedDates = bundle.vocabulary.filter((v) => v.participantId === p.id && v.firstLearnedAt).map((v) => v.firstLearnedAt!)
    const goals = bundle.goals.filter((g) => g.participantId === p.id)
    const firstDate = [p.startDate, ...acts.map((a) => a.date), ...reviews.map((r) => r.date)].sort()[0]
    for (const w of weekStartsBetween(firstDate, today)) {
      scores.push(computeWeeklyScore(p.id, w, { activities: acts, reviews, learnedDates, goal: goalForWeek(goals, w) }, now))
    }
  }
  const previous = new Map(bundle.weeklyScores.map((s) => [s.id, s]))
  const changed = scores.filter((s) => {
    const old = previous.get(s.id)
    return !old || !sameScore(old, s)
  })
  const validIds = new Set(scores.map((s) => s.id))
  const stale = bundle.weeklyScores.filter((s) => !validIds.has(s.id)).map((s) => s.id)
  if (changed.length || stale.length) {
    await db.transaction('rw', db.weeklyScores, async () => {
      if (stale.length) await db.weeklyScores.bulkDelete(stale)
      if (changed.length) await db.weeklyScores.bulkPut(changed)
    })
  }

  // 2. Temporadas encerradas (por data ou manualmente)
  const ids = [bundle.participants[0].id, bundle.participants[1].id] as [string, string]
  const seasons: Season[] = []
  for (const s of bundle.seasons) {
    const expired = s.status === 'active' && s.endDate < today
    const pendingClose = s.status === 'completed' && !s.completedAt
    if (!expired && !pendingClose) {
      seasons.push(s)
      continue
    }
    const { winnerId, finalScores } = seasonWinner(s, ids, scores, bundle.battles)
    const stats: Season['stats'] = {}
    for (const pid of ids) {
      const acts = dedupeActivities(bundle.activities.filter((a) => a.participantId === pid && isInRange(a.date, s.startDate, s.endDate)))
      stats[pid] = {
        minutes: acts.reduce((x, a) => x + a.durationMinutes, 0),
        studyDays: new Set(acts.map((a) => a.date)).size,
        battlesWon: battleWinsInRange(bundle.battles, pid, s.startDate, s.endDate),
        words:
          bundle.vocabulary.filter((v) => v.participantId === pid && v.firstLearnedAt && isInRange(v.firstLearnedAt, s.startDate, s.endDate)).length +
          acts.filter((a) => a.category === 'vocabulary').reduce((x, a) => x + (a.wordCount ?? 0), 0),
      }
    }
    const closed: Season = { ...s, status: 'completed', winnerId, finalScores, stats, completedAt: now }
    await db.seasons.put(closed)
    seasons.push(closed)
  }

  // 3. Recompensas
  const rewards = await db.rewards.toArray()
  const candidates = computeRewardUnlocks(rewards, { participantIds: ids, scores, seasons, today }, now)
  const existing = new Set(await db.rewardUnlocks.toCollection().primaryKeys())
  const newUnlocks = candidates.filter((u) => !existing.has(u.id))
  if (newUnlocks.length) await db.rewardUnlocks.bulkAdd(newUnlocks)

  // 4. Conquistas (permanecem desbloqueadas mesmo se registros forem excluídos depois)
  const fullBundle = { ...bundle, weeklyScores: scores, seasons }
  const unlockedIds = new Set(await db.achievements.toCollection().primaryKeys())
  const newAchievements: Achievement[] = []
  for (const p of bundle.participants) {
    const stats = buildParticipantStats(fullBundle, p.id, today)
    for (const key of unlockedAchievements(stats.achievementStats)) {
      const id = `${p.id}_${key}`
      if (!unlockedIds.has(id)) newAchievements.push({ id, participantId: p.id, key, unlockedAt: now })
    }
  }
  if (newAchievements.length) await db.achievements.bulkAdd(newAchievements)

  return { newAchievements, newUnlocks }
}

/** Quanto falta para a meia-noite local (para recalcular na virada do dia/semana). */
export function msUntilMidnight(now = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 5, 0)
  return next.getTime() - now.getTime()
}

