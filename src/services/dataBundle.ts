import { db } from '@/db/database'
import type { DataBundle } from '@/lib/stats'

/** Carrega todos os dados estruturados (sem blobs de áudio). */
export async function loadDataBundle(): Promise<DataBundle> {
  const [participants, goals, activities, reviews, vocabulary, recordings, evaluations, attempts, battles, seasons, weeklyScores] =
    await Promise.all([
      db.participants.orderBy('slot').toArray(),
      db.goals.toArray(),
      db.activities.toArray(),
      db.reviews.toArray(),
      db.vocabulary.toArray(),
      db.recordings.toArray(),
      db.evaluations.toArray(),
      db.attempts.toArray(),
      db.battles.toArray(),
      db.seasons.toArray(),
      db.weeklyScores.toArray(),
    ])
  return { participants, goals, activities, reviews, vocabulary, recordings, evaluations, attempts, battles, seasons, weeklyScores }
}
