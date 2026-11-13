import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import type { FlashcardCsvRow } from '@/lib/csv'
import { todayKey } from '@/lib/dates'
import { INITIAL_EASE, scheduleReview } from '@/lib/srs'
import { nowIso, uid } from '@/lib/utils'
import type { FlashcardReview, LanguageCode, ReviewRating, VocabularyItem } from '@/types'

export type VocabularyInput = Pick<VocabularyItem, 'participantId' | 'term' | 'translation' | 'example' | 'language' | 'category'>

function newItem(input: VocabularyInput): VocabularyItem {
  return {
    ...input,
    term: input.term.trim(),
    translation: input.translation.trim(),
    example: input.example.trim(),
    category: input.category.trim(),
    id: uid(),
    createdAt: nowIso(),
    state: 'new',
    ease: INITIAL_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueDate: todayKey(),
  }
}

const normalize = (s: string) => s.trim().toLowerCase()

export const vocabularyRepo = {
  list(participantId: string): Promise<VocabularyItem[]> {
    return db.vocabulary.where('participantId').equals(participantId).reverse().sortBy('createdAt')
  },
  listAll() {
    return db.vocabulary.toArray()
  },
  async due(participantId: string, today = todayKey()): Promise<VocabularyItem[]> {
    const rows = await db.vocabulary
      .where('[participantId+dueDate]')
      .between([participantId, ''], [participantId, today], true, true)
      .toArray()
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt))
  },
  async exists(participantId: string, term: string, ignoreId?: string) {
    const t = normalize(term)
    const found = await db.vocabulary
      .where('participantId')
      .equals(participantId)
      .filter((v) => normalize(v.term) === t && v.id !== ignoreId)
      .first()
    return Boolean(found)
  },
  async add(input: VocabularyInput) {
    if (!input.term.trim() || !input.translation.trim()) throw new Error('Termo e tradução são obrigatórios.')
    if (await this.exists(input.participantId, input.term)) throw new Error('Essa palavra já está cadastrada.')
    await db.vocabulary.add(newItem(input))
    emitDataChange()
  },
  async update(id: string, changes: Partial<VocabularyInput>) {
    const current = await db.vocabulary.get(id)
    if (!current) throw new Error('Palavra não encontrada.')
    if (changes.term && (await this.exists(current.participantId, changes.term, id)))
      throw new Error('Essa palavra já está cadastrada.')
    await db.vocabulary.update(id, changes)
    emitDataChange()
  },
  async remove(id: string) {
    await db.transaction('rw', db.vocabulary, db.reviews, async () => {
      await db.vocabulary.delete(id)
      await db.reviews.where('itemId').equals(id).delete()
    })
    emitDataChange()
  },
  /** Importa linhas de CSV ignorando termos já cadastrados. */
  async importRows(participantId: string, language: LanguageCode, rows: FlashcardCsvRow[]) {
    const existing = new Set((await this.list(participantId)).map((v) => normalize(v.term)))
    const toAdd: VocabularyItem[] = []
    let skipped = 0
    for (const r of rows) {
      const key = normalize(r.term)
      if (existing.has(key)) {
        skipped++
        continue
      }
      existing.add(key)
      toAdd.push(newItem({ participantId, language, ...r }))
    }
    await db.vocabulary.bulkAdd(toAdd)
    emitDataChange()
    return { added: toAdd.length, skipped }
  },
  async review(itemId: string, rating: ReviewRating) {
    const today = todayKey()
    await db.transaction('rw', db.vocabulary, db.reviews, async () => {
      const card = await db.vocabulary.get(itemId)
      if (!card) throw new Error('Palavra não encontrada.')
      const next = scheduleReview(card, rating, today)
      const review: FlashcardReview = {
        id: uid(),
        itemId,
        participantId: card.participantId,
        date: today,
        rating,
        correct: rating !== 'again',
        previousInterval: card.intervalDays,
        nextInterval: next.intervalDays,
        reviewedAt: nowIso(),
      }
      await db.vocabulary.update(itemId, { ...next, lastReviewedAt: review.reviewedAt })
      await db.reviews.add(review)
    })
    emitDataChange()
  },
  listReviews(participantId?: string): Promise<FlashcardReview[]> {
    return participantId ? db.reviews.where('participantId').equals(participantId).toArray() : db.reviews.toArray()
  },
}
