import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS } from '@/lib/constants'
import { compareTotals, computeWeeklyScore, dedupeActivities, goalForWeek, goalsCompletion } from '@/lib/scoring'
import type { FlashcardReview, PersonalGoal, StudyActivity } from '@/types'

const week = '2026-11-09' // segunda-feira

function act(p: Partial<StudyActivity>): StudyActivity {
  return {
    id: Math.random().toString(36),
    participantId: 'p1',
    category: 'listening',
    date: week,
    durationMinutes: 10,
    description: '',
    notes: '',
    source: 'manual',
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

function review(correct: boolean, date = week): FlashcardReview {
  return { id: Math.random().toString(36), itemId: 'i', participantId: 'p1', date, rating: correct ? 'good' : 'again', correct, previousInterval: 0, nextInterval: 1, reviewedAt: '' }
}

describe('computeWeeklyScore', () => {
  it('dá 100 pontos quando todas as metas são cumpridas', () => {
    const activities = [
      act({ category: 'vocabulary', wordCount: 25 }),
      act({ category: 'speaking', durationMinutes: 10 }),
      act({ category: 'speaking', durationMinutes: 15 }),
      act({ category: 'speaking', durationMinutes: 12 }),
      act({ category: 'listening', durationMinutes: 100 }),
      act({ category: 'writing', wordCount: 100 }),
      act({ category: 'writing', wordCount: 120 }),
      act({ category: 'writing', wordCount: 150 }),
    ]
    const reviews = [...Array(8)].map(() => review(true)).concat([review(false), review(false)])
    const s = computeWeeklyScore('p1', week, { activities, reviews, learnedDates: [], goal: DEFAULT_GOALS })
    expect(s.total).toBe(100)
    expect(goalsCompletion(s)).toBe(100)
  })

  it('é proporcional ao cumprimento e limitado ao máximo da categoria', () => {
    const activities = [act({ category: 'listening', durationMinutes: 50 }), act({ category: 'listening', durationMinutes: 500, date: '2026-11-10' })]
    const s = computeWeeklyScore('p1', week, { activities: activities.slice(0, 1), reviews: [], learnedDates: [], goal: DEFAULT_GOALS })
    expect(s.breakdown.find((c) => c.category === 'listening')!.points).toBe(10)
    const capped = computeWeeklyScore('p1', week, { activities, reviews: [], learnedDates: [], goal: DEFAULT_GOALS })
    expect(capped.breakdown.find((c) => c.category === 'listening')!.points).toBe(20)
    expect(capped.total).toBe(20)
  })

  it('ignora atividades fora da semana (fuso local, segunda a domingo)', () => {
    const activities = [act({ date: '2026-11-08', durationMinutes: 100 }), act({ date: '2026-11-16', durationMinutes: 100 }), act({ date: '2026-11-15', durationMinutes: 50 })]
    const s = computeWeeklyScore('p1', week, { activities, reviews: [], learnedDates: [], goal: DEFAULT_GOALS })
    expect(s.studyMinutes).toBe(50)
  })

  it('não conta speaking abaixo da duração mínima nem textos curtos', () => {
    const activities = [act({ category: 'speaking', durationMinutes: 5 }), act({ category: 'writing', wordCount: 40 })]
    const s = computeWeeklyScore('p1', week, { activities, reviews: [], learnedDates: [], goal: DEFAULT_GOALS })
    expect(s.total).toBe(0)
  })

  it('soma palavras aprendidas nos flashcards e em atividades', () => {
    const s = computeWeeklyScore('p1', week, {
      activities: [act({ category: 'vocabulary', wordCount: 10 })],
      reviews: [],
      learnedDates: ['2026-11-10', '2026-11-11', '2026-10-01'],
      goal: { ...DEFAULT_GOALS, vocabularyWords: 24 },
    })
    expect(s.breakdown[0].achieved).toBe(12)
    expect(s.breakdown[0].points).toBe(10)
  })

  it('retenção sem revisões vale zero; acima da meta vale o máximo', () => {
    const none = computeWeeklyScore('p1', week, { activities: [], reviews: [], learnedDates: [], goal: DEFAULT_GOALS })
    expect(none.breakdown[4].points).toBe(0)
    const half = computeWeeklyScore('p1', week, { activities: [], reviews: [...Array(5)].flatMap(() => [review(true), review(false)]), learnedDates: [], goal: DEFAULT_GOALS })
    expect(half.breakdown[4].points).toBe(12.5) // 50% de 80% = 0.625 × 20
    const few = computeWeeklyScore('p1', week, { activities: [], reviews: [review(true), review(true)], learnedDates: [], goal: DEFAULT_GOALS })
    expect(few.breakdown[4].points).toBe(4) // 100% de acertos, mas só 2 de 10 revisões mínimas
  })
})

describe('dedupeActivities', () => {
  it('remove atividades repetidas por ID e por origem', () => {
    const a = act({ id: 'a' })
    const r1 = act({ id: 'b', source: 'recording', sourceId: 'rec1' })
    const r2 = act({ id: 'c', source: 'recording', sourceId: 'rec1' })
    expect(dedupeActivities([a, a, r1, r2]).map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('goalForWeek', () => {
  const g = (effectiveFrom: string, listeningMinutes: number): PersonalGoal => ({
    id: effectiveFrom, participantId: 'p1', effectiveFrom, createdAt: effectiveFrom, ...DEFAULT_GOALS, listeningMinutes,
  })
  it('usa a versão vigente na semana', () => {
    const goals = [g('2026-11-02', 100), g('2026-11-16', 150)]
    expect(goalForWeek(goals, '2026-11-09').listeningMinutes).toBe(100)
    expect(goalForWeek(goals, '2026-11-16').listeningMinutes).toBe(150)
    expect(goalForWeek(goals, '2026-10-01').listeningMinutes).toBe(100)
    expect(goalForWeek([], week).listeningMinutes).toBe(DEFAULT_GOALS.listeningMinutes)
  })
})

describe('compareTotals', () => {
  it('declara vencedor ou empate', () => {
    expect(compareTotals({ id: 'a', total: 80 }, { id: 'b', total: 70 })).toEqual({ winnerId: 'a', margin: 10 })
    expect(compareTotals({ id: 'a', total: 70 }, { id: 'b', total: 70 })).toEqual({ winnerId: 'tie', margin: 0 })
  })
})
