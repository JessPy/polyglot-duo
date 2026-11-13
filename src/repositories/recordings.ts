import { db } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { nowIso, uid } from '@/lib/utils'
import type { AudioRecording, SpeakingEvaluation } from '@/types'
import { activitiesRepo } from './activities'

export type RecordingInput = Omit<AudioRecording, 'id' | 'createdAt' | 'size' | 'mimeType'>
export type EvaluationInput = Pick<SpeakingEvaluation, 'clarity' | 'grammar' | 'vocabulary' | 'fluency' | 'evaluator'>

export class StorageError extends Error {}

export const recordingsRepo = {
  list(participantId?: string): Promise<AudioRecording[]> {
    const q = participantId ? db.recordings.where('participantId').equals(participantId) : db.recordings.toCollection()
    return q.reverse().sortBy('createdAt')
  },
  get(id: string) {
    return db.recordings.get(id)
  },
  async getBlob(id: string): Promise<Blob | undefined> {
    return (await db.recordingBlobs.get(id))?.blob
  },
  /** Salva metadados e o Blob original (sem Base64) numa única transação. */
  async save(input: RecordingInput, blob: Blob, options: { registerAsSpeaking: boolean }): Promise<string> {
    const id = uid()
    const recording: AudioRecording = {
      ...input,
      id,
      createdAt: nowIso(),
      size: blob.size,
      mimeType: blob.type || 'audio/webm',
    }
    try {
      await db.transaction('rw', db.recordings, db.recordingBlobs, async () => {
        await db.recordings.add(recording)
        await db.recordingBlobs.add({ id, blob })
      })
    } catch (err) {
      const name = (err as { name?: string })?.name ?? ''
      if (name.includes('Quota')) throw new StorageError('Sem espaço de armazenamento no navegador. Exporte e apague gravações antigas.')
      throw new StorageError('Não foi possível salvar a gravação no armazenamento local.')
    }
    if (options.registerAsSpeaking) await this.registerActivity(recording)
    if (recording.challengeAttemptId) await db.attempts.update(recording.challengeAttemptId, { recordingId: id })
    emitDataChange()
    return id
  },
  async registerActivity(r: AudioRecording) {
    await activitiesRepo.upsertFromSource('recording', r.id, {
      participantId: r.participantId,
      category: 'speaking',
      date: r.date,
      durationMinutes: Math.max(1, Math.round(r.durationSeconds / 60)),
      description: `Gravação: ${r.title}`,
      notes: r.notes,
    })
  },
  async update(id: string, changes: Partial<Pick<AudioRecording, 'title' | 'topic' | 'notes' | 'date'>>) {
    await db.recordings.update(id, changes)
    emitDataChange()
  },
  /** Exclusão definitiva: metadados, áudio, avaliações e atividade vinculada. */
  async remove(id: string) {
    await db.transaction('rw', [db.recordings, db.recordingBlobs, db.evaluations, db.activities], async () => {
      await db.recordings.delete(id)
      await db.recordingBlobs.delete(id)
      await db.evaluations.where('recordingId').equals(id).delete()
      await db.activities.where('sourceId').equals(id).delete()
    })
    emitDataChange()
  },
  async totalSize(): Promise<number> {
    let total = 0
    await db.recordings.each((r) => {
      total += r.size
    })
    return total
  },
  listEvaluations(participantId?: string): Promise<SpeakingEvaluation[]> {
    return participantId ? db.evaluations.where('participantId').equals(participantId).toArray() : db.evaluations.toArray()
  },
  async evaluationFor(recordingId: string) {
    const list = await db.evaluations.where('recordingId').equals(recordingId).toArray()
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  },
  async evaluate(recordingId: string, input: EvaluationInput) {
    const rec = await db.recordings.get(recordingId)
    if (!rec) throw new Error('Gravação não encontrada.')
    for (const v of [input.clarity, input.grammar, input.vocabulary, input.fluency])
      if (v < 0 || v > 5) throw new Error('As notas vão de 0 a 5.')
    const existing = await this.evaluationFor(recordingId)
    await db.evaluations.put({
      id: existing?.id ?? uid(),
      recordingId,
      participantId: rec.participantId,
      ...input,
      createdAt: nowIso(),
    })
    emitDataChange()
  },
}
