import type Dexie from 'dexie'

/**
 * Histórico de versões do schema local (IndexedDB).
 *
 * Regras para evoluir:
 * 1. Nunca altere uma versão já publicada; adicione uma nova `db.version(n + 1)`.
 * 2. Declare apenas as tabelas/índices que mudaram (o Dexie herda o restante).
 * 3. Use `.upgrade(tx => ...)` para transformar dados existentes.
 * 4. Atualize SCHEMA_VERSION e, se o formato dos dados mudar, BACKUP_FORMAT_VERSION em services/backup.ts.
 *
 * Exemplo de migração futura:
 *   db.version(2)
 *     .stores({ activities: 'id, participantId, date, category, sourceId, [participantId+date], tag' })
 *     .upgrade((tx) => tx.table('activities').toCollection().modify((a) => { a.tag ??= '' }))
 */
export const SCHEMA_VERSION = 1

export function applyMigrations(db: Dexie) {
  db.version(1).stores({
    participants: 'id, slot',
    goals: 'id, participantId, effectiveFrom',
    activities: 'id, participantId, date, category, sourceId, [participantId+date]',
    vocabulary: 'id, participantId, dueDate, state, [participantId+dueDate]',
    reviews: 'id, participantId, itemId, date',
    attempts: 'id, participantId, date, status',
    recordings: 'id, participantId, date',
    recordingBlobs: 'id',
    evaluations: 'id, recordingId, participantId',
    weeklyScores: 'id, participantId, weekStart',
    achievements: 'id, participantId',
    rewards: 'id',
    rewardUnlocks: 'id, rewardId',
    seasons: 'id, status, startDate',
    battles: 'id, date, status',
    meta: 'key',
  })
}
