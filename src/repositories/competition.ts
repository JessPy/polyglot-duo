import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { seasonEndDate } from '@/lib/competition'
import { REWARD_CONDITIONS } from '@/lib/constants'
import { todayKey } from '@/lib/dates'
import { nowIso, uid } from '@/lib/utils'
import type { Battle, Reward, RewardCondition, Season } from '@/types'

export const scoresRepo = {
  list(participantId?: string) {
    return participantId
      ? db.weeklyScores.where('participantId').equals(participantId).sortBy('weekStart')
      : db.weeklyScores.orderBy('weekStart').toArray()
  },
}

export const achievementsRepo = {
  list() {
    return db.achievements.toArray()
  },
}

export type RewardInput = Pick<Reward, 'title' | 'description' | 'condition'>

export const rewardsRepo = {
  async list() {
    return (await db.rewards.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  listUnlocks() {
    return db.rewardUnlocks.reverse().sortBy('unlockedAt')
  },
  async add(input: RewardInput) {
    if (!input.title.trim()) throw new Error('Informe um título.')
    await db.rewards.add({
      ...input,
      title: input.title.trim(),
      category: REWARD_CONDITIONS[input.condition].category,
      id: uid(),
      status: 'active',
      createdAt: nowIso(),
    })
    emitDataChange()
  },
  async update(id: string, changes: Partial<RewardInput & { status: Reward['status'] }>) {
    const patch: Partial<Reward> = { ...changes }
    if (changes.condition) patch.category = REWARD_CONDITIONS[changes.condition as RewardCondition].category
    await db.rewards.update(id, patch)
    emitDataChange()
  },
  async remove(id: string) {
    await db.transaction('rw', db.rewards, db.rewardUnlocks, async () => {
      await db.rewards.delete(id)
      await db.rewardUnlocks.where('rewardId').equals(id).delete()
    })
  },
  async unlockManually(rewardId: string, winnerId: string | 'both') {
    const periodKey = `X${Date.now()}`
    await db.rewardUnlocks.add({ id: `${rewardId}_${periodKey}`, rewardId, periodKey, winnerId, unlockedAt: nowIso() })
  },
  async setRedeemed(unlockId: string, redeemed: boolean) {
    await db.rewardUnlocks.update(unlockId, { redeemedAt: redeemed ? nowIso() : undefined })
  },
}

export const seasonsRepo = {
  list(): Promise<Season[]> {
    return db.seasons.orderBy('startDate').reverse().toArray()
  },
  async active(): Promise<Season | undefined> {
    return db.seasons.where('status').equals('active').first()
  },
  async create(lengthDays: Season['lengthDays'], startDate = todayKey(), name?: string) {
    if (await this.active()) throw new Error('Já existe uma temporada ativa. Encerre-a antes de criar outra.')
    const count = await db.seasons.count()
    await db.seasons.add({
      id: uid(),
      name: name?.trim() || `Temporada ${count + 1}`,
      lengthDays,
      startDate,
      endDate: seasonEndDate(startDate, lengthDays),
      status: 'active',
      createdAt: nowIso(),
    })
    emitDataChange()
  },
  /** Encerra antecipadamente: a data final passa a ser hoje e o motor de jogo calcula vencedor e estatísticas. */
  async endNow(id: string) {
    await db.seasons.update(id, { endDate: todayKey(), status: 'completed' })
    emitDataChange()
  },
  async remove(id: string) {
    await db.seasons.delete(id)
    emitDataChange()
  },
}

export const battlesRepo = {
  list(): Promise<Battle[]> {
    return db.battles.orderBy('date').reverse().toArray()
  },
  get(id: string) {
    return db.battles.get(id)
  },
  async inProgress() {
    return db.battles.where('status').equals('in_progress').first()
  },
  async create(battle: Omit<Battle, 'id' | 'createdAt' | 'status'>) {
    const id = uid()
    await db.battles.add({ ...battle, id, status: 'in_progress', createdAt: nowIso() })
    return id
  },
  async save(id: string, changes: Partial<Battle>) {
    await db.battles.update(id, changes)
    if (changes.status === 'completed') emitDataChange()
  },
  async remove(id: string) {
    await db.battles.delete(id)
    emitDataChange()
  },
}
