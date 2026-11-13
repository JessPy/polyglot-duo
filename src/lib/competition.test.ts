import { describe, expect, it } from 'vitest'
import { computeRewardUnlocks, decideBattle, journeyDay, milestoneRecordings, seasonEndDate, seasonWinner } from '@/lib/competition'
import type { Battle, Reward, WeeklyScore } from '@/types'

const score = (participantId: string, weekStart: string, total: number): WeeklyScore => ({
  id: `${participantId}_${weekStart}`, participantId, weekStart, total, breakdown: [], studyMinutes: 0, studyDays: 0, computedAt: '',
})
const reward = (condition: Reward['condition']): Reward => ({
  id: condition, title: condition, description: '', category: 'weekly', condition, status: 'active', createdAt: '2026-10-01T12:00:00.000Z',
})

describe('temporadas', () => {
  it('calcula a data final inclusiva', () => {
    expect(seasonEndDate('2026-11-01', 30)).toBe('2026-11-30')
  })
  it('soma pontos semanais e desempata por duelos', () => {
    const scores = [score('a', '2026-11-02', 60), score('b', '2026-11-02', 50), score('a', '2026-11-09', 40), score('b', '2026-11-09', 50)]
    const season = { startDate: '2026-11-02', endDate: '2026-11-15' }
    const battle: Battle = { id: 'x', date: '2026-11-08', challengeType: 'impromptu', status: 'completed', turns: [], winnerId: 'b', createdAt: '' }
    expect(seasonWinner(season, ['a', 'b'], scores, [battle])).toEqual({ winnerId: 'b', finalScores: { a: 100, b: 100 } })
    expect(seasonWinner(season, ['a', 'b'], scores, []).winnerId).toBe('tie')
  })
})

describe('duelo', () => {
  it('usa os mesmos critérios para os dois', () => {
    const t = (participantId: string, n: number) => ({ participantId, clarity: n, grammar: n, vocabulary: n, fluency: n, challenge: {} as never, elapsedSeconds: 0, notes: '', done: true })
    expect(decideBattle({ turns: [t('a', 4), t('b', 3)] })).toBe('a')
    expect(decideBattle({ turns: [t('a', 3), t('b', 3)] })).toBe('tie')
  })
})

describe('recompensas', () => {
  const scores = [score('a', '2026-11-02', 85), score('b', '2026-11-02', 82), score('a', '2026-11-09', 40), score('b', '2026-11-09', 90)]
  const ctx = { participantIds: ['a', 'b'] as [string, string], scores, seasons: [], today: '2026-11-13' }

  it('libera recompensa semanal apenas para semanas encerradas', () => {
    const u = computeRewardUnlocks([reward('weekly_winner')], ctx, 'now')
    expect(u).toEqual([{ id: 'weekly_winner_W2026-11-02', rewardId: 'weekly_winner', periodKey: 'W2026-11-02', winnerId: 'a', unlockedAt: 'now' }])
  })
  it('libera recompensa conjunta quando ambos fazem 80+', () => {
    const u = computeRewardUnlocks([reward('coop_weekly')], ctx, 'now')
    expect(u.map((x) => x.winnerId)).toEqual(['both'])
  })
  it('é determinística (sem duplicação ao rodar novamente)', () => {
    const a = computeRewardUnlocks([reward('weekly_winner')], ctx, 'now')
    const b = computeRewardUnlocks([reward('weekly_winner')], ctx, 'later')
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })
  it('libera recompensa mensal para meses encerrados', () => {
    const u = computeRewardUnlocks([reward('monthly_winner')], { ...ctx, today: '2026-12-02' }, 'now')
    expect(u).toHaveLength(1)
    expect(u[0].winnerId).toBe('b')
  })
})

describe('marcos de gravação', () => {
  it('encontra gravações próximas dos dias 1, 30, 60 e 90', () => {
    expect(journeyDay('2026-01-01', '2026-01-30')).toBe(30)
    const recs = [
      { id: 'r1', date: '2026-01-01', createdAt: '1' },
      { id: 'r30', date: '2026-02-01', createdAt: '2' },
      { id: 'r45', date: '2026-02-14', createdAt: '3' },
    ]
    const m = milestoneRecordings('2026-01-01', recs, [1, 30, 60, 90])
    expect(m[1]?.id).toBe('r1')
    expect(m[30]?.id).toBe('r30')
    expect(m[60]).toBeUndefined()
  })
})

describe('rótulo da jornada', () => {
  it('não mostra dias negativos', async () => {
    const { journeyLabel } = await import('@/lib/competition')
    expect(journeyLabel('2026-11-13', '2026-11-13')).toBe('dia 1')
    expect(journeyLabel('2026-11-13', '2026-11-08', true)).toBe('Antes do início')
  })
})
