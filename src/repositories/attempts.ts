import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { CHALLENGE_TYPES } from '@/lib/constants'
import { todayKey } from '@/lib/dates'
import { countWords, nowIso, uid } from '@/lib/utils'
import type { Challenge, ChallengeAttempt } from '@/types'
import { activitiesRepo } from './activities'

export const attemptsRepo = {
  list(participantId?: string): Promise<ChallengeAttempt[]> {
    const q = participantId ? db.attempts.where('participantId').equals(participantId) : db.attempts.toCollection()
    return q.reverse().sortBy('startedAt')
  },
  get(id: string) {
    return db.attempts.get(id)
  },
  async start(participantId: string, challenge: Challenge): Promise<string> {
    const id = uid()
    await db.attempts.add({
      id,
      participantId,
      challenge,
      status: 'in_progress',
      date: todayKey(),
      startedAt: nowIso(),
      answers: challenge.questions?.map(() => '') ?? [],
      notes: '',
    })
    return id
  },
  async save(id: string, changes: Partial<ChallengeAttempt>) {
    await db.attempts.update(id, changes)
  },
  /** Conclui o desafio e registra a atividade correspondente (uma por tentativa). */
  async complete(id: string, changes: Partial<ChallengeAttempt>) {
    const current = await db.attempts.get(id)
    if (!current) throw new Error('Desafio não encontrado.')
    const attempt: ChallengeAttempt = { ...current, ...changes, status: 'completed', completedAt: nowIso() }
    await db.attempts.put(attempt)

    const minutes = Math.max(1, Math.round(attempt.durationMinutes ?? attempt.challenge.suggestedMinutes))
    const type = attempt.challenge.type
    const category = CHALLENGE_TYPES[type].oral ? 'speaking' : type === 'writing' ? 'writing' : 'listening'
    await activitiesRepo.upsertFromSource('challenge', id, {
      participantId: attempt.participantId,
      category,
      date: attempt.date,
      durationMinutes: minutes,
      description: `Desafio: ${attempt.challenge.title}${attempt.challenge.topic ? ` — ${attempt.challenge.topic}` : ''}`,
      wordCount: type === 'writing' ? countWords(attempt.text ?? '') : undefined,
      notes: attempt.notes,
    })
    emitDataChange()
  },
  async skip(id: string) {
    await db.attempts.update(id, { status: 'skipped' })
    emitDataChange()
  },
  async remove(id: string) {
    await db.attempts.delete(id)
    await activitiesRepo.removeBySource(id)
  },
}
