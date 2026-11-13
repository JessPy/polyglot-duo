import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { nowIso, uid } from '@/lib/utils'
import type { ActivityCategory, ActivitySource, DateKey, StudyActivity } from '@/types'

export type ActivityInput = Omit<StudyActivity, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'sourceId'>

export interface ActivityFilters {
  participantId?: string
  category?: ActivityCategory
  from?: DateKey
  to?: DateKey
}

export function validateActivity(input: Partial<ActivityInput>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.participantId) errors.participantId = 'Escolha o participante.'
  if (!input.category) errors.category = 'Escolha a categoria.'
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = 'Informe uma data válida.'
  if (input.durationMinutes == null || Number.isNaN(input.durationMinutes) || input.durationMinutes <= 0)
    errors.durationMinutes = 'A duração deve ser maior que zero.'
  else if (input.durationMinutes > 24 * 60) errors.durationMinutes = 'A duração não pode passar de 24 horas.'
  if (input.wordCount != null && (input.wordCount < 0 || !Number.isInteger(input.wordCount)))
    errors.wordCount = 'Use um número inteiro positivo.'
  if ((input.description ?? '').length > 500) errors.description = 'Máximo de 500 caracteres.'
  return errors
}

export const activitiesRepo = {
  async list(filters: ActivityFilters = {}): Promise<StudyActivity[]> {
    let rows = await (filters.participantId
      ? db.activities.where('participantId').equals(filters.participantId).toArray()
      : db.activities.toArray())
    if (filters.category) rows = rows.filter((a) => a.category === filters.category)
    if (filters.from) rows = rows.filter((a) => a.date >= filters.from!)
    if (filters.to) rows = rows.filter((a) => a.date <= filters.to!)
    return rows.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
  },
  get(id: string) {
    return db.activities.get(id)
  },
  async add(input: ActivityInput): Promise<string> {
    const errors = validateActivity(input)
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
    const now = nowIso()
    const id = uid()
    await db.activities.add({ ...input, id, source: 'manual', createdAt: now, updatedAt: now })
    emitDataChange()
    return id
  },
  async update(id: string, input: ActivityInput) {
    const errors = validateActivity(input)
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
    await db.activities.update(id, { ...input, updatedAt: nowIso() })
    emitDataChange()
  },
  async remove(id: string) {
    await db.activities.delete(id)
    emitDataChange()
  },
  /** Cria ou atualiza a atividade gerada por uma origem (gravação/desafio). Nunca duplica. */
  async upsertFromSource(source: Exclude<ActivitySource, 'manual'>, sourceId: string, input: ActivityInput) {
    const existing = await db.activities.where('sourceId').equals(sourceId).filter((a) => a.source === source).first()
    const now = nowIso()
    if (existing) await db.activities.update(existing.id, { ...input, updatedAt: now })
    else await db.activities.add({ ...input, id: uid(), source, sourceId, createdAt: now, updatedAt: now })
    emitDataChange()
  },
  async removeBySource(sourceId: string) {
    await db.activities.where('sourceId').equals(sourceId).delete()
    emitDataChange()
  },
  async findBySource(sourceId: string) {
    return db.activities.where('sourceId').equals(sourceId).first()
  },
}
