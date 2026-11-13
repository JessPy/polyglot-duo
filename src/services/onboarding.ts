import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { seasonEndDate } from '@/lib/competition'
import { REWARD_CONDITIONS } from '@/lib/constants'
import { startOfWeek, todayKey } from '@/lib/dates'
import type { GoalTargets } from '@/lib/scoring'
import { nowIso, uid } from '@/lib/utils'
import type { Participant, RewardCondition, Season } from '@/types'
import { META_KEYS } from '@/repositories/meta'

export type ParticipantDraft = Pick<
  Participant,
  'name' | 'avatar' | 'language' | 'currentLevel' | 'targetLevel' | 'dailyGoalMinutes' | 'weeklyGoalMinutes' | 'color'
>

export interface OnboardingData {
  participants: [ParticipantDraft, ParticipantDraft]
  goals: [GoalTargets, GoalTargets]
  seasonLength: Season['lengthDays']
  reward: { title: string; description: string; condition: RewardCondition } | null
}

/** Cria os dois perfis, metas, primeira temporada e recompensa numa transação. */
export async function startCompetition(data: OnboardingData): Promise<string[]> {
  const today = todayKey()
  const now = nowIso()
  const ids = [uid(), uid()]
  await db.transaction('rw', [db.participants, db.goals, db.seasons, db.rewards, db.meta], async () => {
    for (let i = 0; i < 2; i++) {
      const p = data.participants[i]
      await db.participants.add({
        ...p,
        name: p.name.trim(),
        id: ids[i],
        slot: (i + 1) as 1 | 2,
        startDate: today,
        createdAt: now,
        updatedAt: now,
      })
      await db.goals.add({ id: uid(), participantId: ids[i], effectiveFrom: startOfWeek(today), ...data.goals[i], createdAt: now })
    }
    await db.seasons.add({
      id: uid(),
      name: 'Temporada 1',
      lengthDays: data.seasonLength,
      startDate: today,
      endDate: seasonEndDate(today, data.seasonLength),
      status: 'active',
      createdAt: now,
    })
    if (data.reward?.title.trim()) {
      await db.rewards.add({
        id: uid(),
        title: data.reward.title.trim(),
        description: data.reward.description.trim(),
        condition: data.reward.condition,
        category: REWARD_CONDITIONS[data.reward.condition].category,
        status: 'active',
        createdAt: now,
      })
    }
    await db.meta.put({ key: META_KEYS.onboarded, value: now })
  })
  emitDataChange()
  return ids
}
