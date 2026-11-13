import type { DataBundle } from '@/lib/stats'
import type { DateKey } from '@/types'

export function vocabularyItemsDue(bundle: DataBundle, participantId: string, today: DateKey): number {
  return bundle.vocabulary.filter((v) => v.participantId === participantId && v.dueDate <= today).length
}
