import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { nowIso } from '@/lib/utils'
import type { Participant } from '@/types'

export const participantsRepo = {
  list(): Promise<Participant[]> {
    return db.participants.orderBy('slot').toArray()
  },
  get(id: string) {
    return db.participants.get(id)
  },
  async update(id: string, changes: Partial<Omit<Participant, 'id' | 'slot' | 'createdAt'>>) {
    await db.participants.update(id, { ...changes, updatedAt: nowIso() })
    emitDataChange()
  },
}
