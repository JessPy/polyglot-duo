import { addDays } from '@/lib/dates'
import type { DateKey, LearningState, ReviewRating, VocabularyItem } from '@/types'

/**
 * Revisão espaçada baseada no SM-2 (SuperMemo 2, Piotr Woźniak, 1987), simplificado como no Anki:
 *
 * - "Errei": repetições zeram, ease cai 0.20 (mínimo 1.3) e a carta volta para hoje.
 * - 1ª resposta correta: 1 dia (Fácil: 3). 2ª: 3 dias (Difícil: 2, Fácil: 5).
 * - Depois: intervalo × fator (Difícil: 1.2, Bom: ease, Fácil: ease × 1.3).
 * - Difícil reduz o ease em 0.15; Fácil aumenta 0.15.
 *
 * Estados: new (nunca revisada) → learning (0–1 acertos seguidos) → review (2) → learned (3+).
 * Cadastrar uma palavra não a torna aprendida: são necessárias 3 revisões corretas seguidas
 * em dias diferentes.
 */

export const INITIAL_EASE = 2.5
export const MIN_EASE = 1.3
export const LEARNED_REPETITIONS = 3

export type SrsFields = Pick<VocabularyItem, 'ease' | 'intervalDays' | 'repetitions' | 'lapses' | 'dueDate' | 'state' | 'firstLearnedAt'>

export function stateFor(repetitions: number, reviewed: boolean): LearningState {
  if (!reviewed) return 'new'
  if (repetitions >= LEARNED_REPETITIONS) return 'learned'
  if (repetitions === 2) return 'review'
  return 'learning'
}

export function scheduleReview(card: SrsFields, rating: ReviewRating, today: DateKey): SrsFields {
  let { ease, intervalDays, repetitions, lapses } = card

  if (rating === 'again') {
    return {
      ease: Math.max(MIN_EASE, round2(ease - 0.2)),
      intervalDays: 0,
      repetitions: 0,
      lapses: lapses + 1,
      dueDate: today,
      state: 'learning',
      firstLearnedAt: card.firstLearnedAt,
    }
  }

  if (repetitions === 0) {
    intervalDays = rating === 'easy' ? 3 : 1
  } else if (repetitions === 1) {
    intervalDays = rating === 'hard' ? 2 : rating === 'easy' ? 5 : 3
  } else {
    const factor = rating === 'hard' ? 1.2 : rating === 'easy' ? ease * 1.3 : ease
    intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * factor))
  }

  if (rating === 'hard') ease = Math.max(MIN_EASE, round2(ease - 0.15))
  if (rating === 'easy') ease = round2(ease + 0.15)
  repetitions += 1

  const state = stateFor(repetitions, true)
  return {
    ease,
    intervalDays,
    repetitions,
    lapses,
    dueDate: addDays(today, intervalDays),
    state,
    firstLearnedAt: card.firstLearnedAt ?? (state === 'learned' ? today : undefined),
  }
}

export function isDue(card: Pick<VocabularyItem, 'dueDate'>, today: DateKey): boolean {
  return card.dueDate <= today
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
