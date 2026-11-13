import { SCORE_CATEGORIES, MAX_WEEKLY_POINTS, DEFAULT_GOALS } from '@/lib/constants'
import { endOfWeek, isInRange } from '@/lib/dates'
import { round1 } from '@/lib/utils'
import type {
  CategoryScore,
  DateKey,
  FlashcardReview,
  ID,
  PersonalGoal,
  ScoreCategory,
  StudyActivity,
  WeeklyScore,
} from '@/types'

/**
 * Regras de pontuação semanal (funções puras).
 *
 * Cada categoria vale `maxPoints * min(1, alcançado / meta)`, somando no máximo 100.
 * As metas são pessoais, então a comparação entre os participantes é pelo cumprimento
 * das próprias metas, não pelo volume absoluto de estudo.
 */

/** Mínimo de revisões na semana para a retenção valer a pontuação cheia (evita 100% com 1 revisão). */
export const MIN_REVIEWS_FOR_RETENTION = 10

export type GoalTargets = Omit<PersonalGoal, 'id' | 'participantId' | 'effectiveFrom' | 'createdAt'>

export interface ScoreInputs {
  activities: StudyActivity[]
  reviews: FlashcardReview[]
  /** Datas em que palavras dos flashcards foram aprendidas pela primeira vez */
  learnedDates: DateKey[]
  goal: GoalTargets
}

/** Remove duplicatas por ID e por origem (uma gravação ou desafio gera no máximo uma atividade). */
export function dedupeActivities(activities: StudyActivity[]): StudyActivity[] {
  const ids = new Set<string>()
  const sources = new Set<string>()
  const out: StudyActivity[] = []
  for (const a of activities) {
    if (ids.has(a.id)) continue
    if (a.sourceId) {
      const key = `${a.source}:${a.sourceId}`
      if (sources.has(key)) continue
      sources.add(key)
    }
    ids.add(a.id)
    out.push(a)
  }
  return out
}

/** Escolhe a versão da meta vigente para uma semana. */
export function goalForWeek(goals: PersonalGoal[], weekStart: DateKey): GoalTargets {
  if (goals.length === 0) return { ...DEFAULT_GOALS }
  const sorted = [...goals].sort((a, b) =>
    a.effectiveFrom === b.effectiveFrom ? a.createdAt.localeCompare(b.createdAt) : a.effectiveFrom.localeCompare(b.effectiveFrom),
  )
  let chosen = sorted[0]
  for (const g of sorted) if (g.effectiveFrom <= weekStart) chosen = g
  const { id: _i, participantId: _p, effectiveFrom: _e, createdAt: _c, ...targets } = chosen
  return targets
}

function categoryScore(category: ScoreCategory, achieved: number, target: number): CategoryScore {
  const maxPoints = SCORE_CATEGORIES[category].maxPoints
  const safeTarget = Math.max(0, target)
  const ratio = safeTarget === 0 ? 1 : Math.min(1, Math.max(0, achieved) / safeTarget)
  return { category, achieved: round1(achieved), target: safeTarget, ratio, points: round1(maxPoints * ratio), maxPoints }
}

export interface WeekMetrics {
  wordsLearned: number
  speakingSessions: number
  listeningMinutes: number
  writingTexts: number
  reviewsTotal: number
  reviewsCorrect: number
  retentionPercent: number
  studyMinutes: number
  studyDays: number
}

export function computeWeekMetrics(weekStart: DateKey, inputs: ScoreInputs): WeekMetrics {
  const weekEnd = endOfWeek(weekStart)
  const inWeek = (d: DateKey) => isInRange(d, weekStart, weekEnd)
  const acts = dedupeActivities(inputs.activities).filter((a) => inWeek(a.date))
  const reviews = inputs.reviews.filter((r) => inWeek(r.date))
  const { goal } = inputs

  const wordsFromActivities = acts
    .filter((a) => a.category === 'vocabulary')
    .reduce((s, a) => s + (a.wordCount ?? 0), 0)
  const wordsFromCards = inputs.learnedDates.filter(inWeek).length
  const speakingSessions = acts.filter(
    (a) => a.category === 'speaking' && a.durationMinutes >= goal.speakingMinMinutes,
  ).length
  const listeningMinutes = acts.filter((a) => a.category === 'listening').reduce((s, a) => s + a.durationMinutes, 0)
  const writingTexts = acts.filter(
    (a) => a.category === 'writing' && (a.wordCount ?? 0) >= goal.writingMinWords,
  ).length
  const reviewsCorrect = reviews.filter((r) => r.correct).length
  const studyDays = new Set([...acts.map((a) => a.date), ...reviews.map((r) => r.date)]).size

  return {
    wordsLearned: wordsFromActivities + wordsFromCards,
    speakingSessions,
    listeningMinutes,
    writingTexts,
    reviewsTotal: reviews.length,
    reviewsCorrect,
    retentionPercent: reviews.length ? (reviewsCorrect / reviews.length) * 100 : 0,
    studyMinutes: acts.reduce((s, a) => s + a.durationMinutes, 0),
    studyDays,
  }
}

/** Retenção: acertos/meta, ponderado pelo volume (menos de 10 revisões vale proporcionalmente). */
function retentionScore(m: WeekMetrics, target: number): CategoryScore {
  const base = categoryScore('retention', m.retentionPercent, target)
  const volume = Math.min(1, m.reviewsTotal / MIN_REVIEWS_FOR_RETENTION)
  const ratio = base.ratio * volume
  return { ...base, ratio, points: round1(base.maxPoints * ratio) }
}

export function computeWeeklyScore(
  participantId: ID,
  weekStart: DateKey,
  inputs: ScoreInputs,
  computedAt: string = new Date().toISOString(),
): WeeklyScore {
  const m = computeWeekMetrics(weekStart, inputs)
  const g = inputs.goal
  const breakdown: CategoryScore[] = [
    categoryScore('vocabulary', m.wordsLearned, g.vocabularyWords),
    categoryScore('speaking', m.speakingSessions, g.speakingSessions),
    categoryScore('listening', m.listeningMinutes, g.listeningMinutes),
    categoryScore('writing', m.writingTexts, g.writingTexts),
    retentionScore(m, g.retentionPercent),
  ]
  const total = Math.min(MAX_WEEKLY_POINTS, round1(breakdown.reduce((s, c) => s + c.points, 0)))
  return {
    id: `${participantId}_${weekStart}`,
    participantId,
    weekStart,
    total,
    breakdown,
    studyMinutes: m.studyMinutes,
    studyDays: m.studyDays,
    computedAt,
  }
}

/** Percentual de metas concluídas (categorias com 100%). */
export function goalsCompletion(score: WeeklyScore | undefined): number {
  if (!score) return 0
  const done = score.breakdown.filter((c) => c.ratio >= 1).length
  return Math.round((done / score.breakdown.length) * 100)
}

export type Outcome = { winnerId: ID | 'tie'; margin: number }

export function compareTotals(a: { id: ID; total: number }, b: { id: ID; total: number }): Outcome {
  const diff = round1(a.total - b.total)
  if (Math.abs(diff) < 0.05) return { winnerId: 'tie', margin: 0 }
  return diff > 0 ? { winnerId: a.id, margin: diff } : { winnerId: b.id, margin: -diff }
}
