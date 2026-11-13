import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { startOfWeek, todayKey } from '@/lib/dates'
import { goalForWeek, type GoalTargets } from '@/lib/scoring'
import { nowIso, uid } from '@/lib/utils'
import type { PersonalGoal } from '@/types'

export const goalsRepo = {
  listAll(): Promise<PersonalGoal[]> {
    return db.goals.toArray()
  },
  listByParticipant(participantId: string) {
    return db.goals.where('participantId').equals(participantId).toArray()
  },
  async current(participantId: string): Promise<GoalTargets> {
    return goalForWeek(await this.listByParticipant(participantId), startOfWeek(todayKey()))
  },
  /** Cria uma nova versão das metas a partir da semana atual; semanas anteriores mantêm as metas antigas. */
  async save(participantId: string, targets: GoalTargets) {
    const effectiveFrom = startOfWeek(todayKey())
    const existing = await db.goals.where({ participantId }).filter((g) => g.effectiveFrom === effectiveFrom).first()
    const record: PersonalGoal = {
      id: existing?.id ?? uid(),
      participantId,
      effectiveFrom,
      ...targets,
      createdAt: nowIso(),
    }
    await db.goals.put(record)
    emitDataChange()
  },
}
