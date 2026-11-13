import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { activitiesRepo, vocabularyRepo } from '@/repositories'
import { syncGameState } from '@/services/gameEngine'
import { startCompetition } from '@/services/onboarding'
import { DEFAULT_GOALS } from '@/lib/constants'
import { todayKey, startOfWeek } from '@/lib/dates'

async function setup() {
  return startCompetition({
    participants: [
      { name: 'Ana', avatar: '🦊', language: 'es', currentLevel: 'A2', targetLevel: 'B1', dailyGoalMinutes: 20, weeklyGoalMinutes: 150, color: 'blue' },
      { name: 'Beto', avatar: '🐼', language: 'en', currentLevel: 'B1', targetLevel: 'B2', dailyGoalMinutes: 20, weeklyGoalMinutes: 150, color: 'orange' },
    ],
    goals: [DEFAULT_GOALS, DEFAULT_GOALS],
    seasonLength: 30,
    reward: { title: 'Escolher o filme', description: '', condition: 'weekly_winner' },
  })
}

describe('repositories + motor de jogo', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('recalcula pontos ao adicionar, editar e excluir atividades', async () => {
    const [a] = await setup()
    const id = await activitiesRepo.add({ participantId: a, category: 'listening', date: todayKey(), durationMinutes: 50, description: '', notes: '' })
    await syncGameState()
    const key = `${a}_${startOfWeek(todayKey())}`
    expect((await db.weeklyScores.get(key))?.total).toBe(10)

    await activitiesRepo.update(id, { participantId: a, category: 'listening', date: todayKey(), durationMinutes: 100, description: '', notes: '' })
    await syncGameState()
    expect((await db.weeklyScores.get(key))?.total).toBe(20)

    await activitiesRepo.remove(id)
    await syncGameState()
    expect((await db.weeklyScores.get(key))?.total).toBe(0)
  })

  it('rejeita atividades inválidas', async () => {
    const [a] = await setup()
    await expect(activitiesRepo.add({ participantId: a, category: 'speaking', date: todayKey(), durationMinutes: 0, description: '', notes: '' })).rejects.toThrow()
  })

  it('uma origem gera no máximo uma atividade', async () => {
    const [a] = await setup()
    const input = { participantId: a, category: 'speaking' as const, date: todayKey(), durationMinutes: 12, description: '', notes: '' }
    await activitiesRepo.upsertFromSource('recording', 'rec1', input)
    await activitiesRepo.upsertFromSource('recording', 'rec1', { ...input, durationMinutes: 15 })
    const all = await db.activities.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].durationMinutes).toBe(15)
  })

  it('revisa flashcards registrando histórico e não duplica palavras', async () => {
    const [a] = await setup()
    await vocabularyRepo.add({ participantId: a, term: 'casa', translation: 'casa', example: '', language: 'es', category: '' })
    await expect(vocabularyRepo.add({ participantId: a, term: ' Casa ', translation: 'x', example: '', language: 'es', category: '' })).rejects.toThrow()
    const [card] = await vocabularyRepo.due(a)
    await vocabularyRepo.review(card.id, 'good')
    expect((await db.vocabulary.get(card.id))?.state).toBe('learning')
    expect(await db.reviews.count()).toBe(1)
    expect(await vocabularyRepo.due(a)).toHaveLength(0)
  })

  it('desbloqueia a conquista de primeira atividade uma única vez', async () => {
    const [a] = await setup()
    await activitiesRepo.add({ participantId: a, category: 'reading', date: todayKey(), durationMinutes: 20, description: '', notes: '' })
    const first = await syncGameState()
    const second = await syncGameState()
    expect(first.newAchievements.map((x) => x.key)).toContain('first_activity')
    expect(second.newAchievements).toHaveLength(0)
  })
})

describe('consultas dos repositories', () => {
  it('listam sem depender de índices inexistentes', async () => {
    const { rewardsRepo, seasonsRepo, battlesRepo, scoresRepo, recordingsRepo, attemptsRepo } = await import('@/repositories')
    await Promise.all(db.tables.map((t) => t.clear()))
    await setup()
    await expect(rewardsRepo.list()).resolves.toHaveLength(1)
    await expect(rewardsRepo.listUnlocks()).resolves.toEqual([])
    await expect(seasonsRepo.list()).resolves.toHaveLength(1)
    await expect(battlesRepo.list()).resolves.toEqual([])
    await expect(scoresRepo.list()).resolves.toBeDefined()
    await expect(recordingsRepo.list()).resolves.toEqual([])
    await expect(attemptsRepo.list()).resolves.toEqual([])
  })
})
