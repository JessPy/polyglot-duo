import JSZip from 'jszip'
import { DATA_TABLES, db, type DataTableName } from '@/db/database'
import { emitDataChange } from '@/db/events'
import { SCHEMA_VERSION } from '@/db/migrations'
import { META_KEYS } from '@/repositories/meta'
import { nowIso } from '@/lib/utils'
import type { AudioRecording, Participant } from '@/types'

/**
 * Formato de backup (ZIP versionado):
 *   manifest.json  → { app, kind, formatVersion, schemaVersion, exportedAt, counts, audioFiles[] }
 *   data.json      → { [tabela]: registros[] }
 *   audio/<id>.<ext> → arquivos de áudio originais, sem conversão
 */
export const BACKUP_FORMAT_VERSION = 1
export const APP_ID = 'polyglot-duo'

export type BackupKind = 'full' | 'recordings'
export type ImportMode = 'replace' | 'merge'

interface AudioFileEntry {
  id: string
  path: string
  mimeType: string
  size: number
}

export interface BackupManifest {
  app: typeof APP_ID
  kind: BackupKind
  formatVersion: number
  schemaVersion: number
  exportedAt: string
  counts: Partial<Record<DataTableName, number>>
  audioFiles: AudioFileEntry[]
}

const RECORDING_TABLES: DataTableName[] = ['recordings', 'evaluations']

export function extensionForMime(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'audio'
}

function tablesFor(kind: BackupKind): DataTableName[] {
  return kind === 'full' ? [...DATA_TABLES] : RECORDING_TABLES
}

export async function exportBackup(kind: BackupKind, onProgress?: (pct: number) => void): Promise<Blob> {
  const zip = new JSZip()
  const data: Record<string, unknown[]> = {}
  const counts: BackupManifest['counts'] = {}
  for (const t of tablesFor(kind)) {
    const rows = await db.table(t).toArray()
    data[t] = rows
    counts[t] = rows.length
  }
  if (kind === 'recordings') {
    // Inclui os perfis para permitir mapear participantes ao restaurar em outro aparelho.
    data.participants = await db.participants.toArray()
  }

  const recordings = (await db.recordings.toArray()) as AudioRecording[]
  const audioFiles: AudioFileEntry[] = []
  for (const r of recordings) {
    const blob = (await db.recordingBlobs.get(r.id))?.blob
    if (!blob) continue
    const path = `audio/${r.id}.${extensionForMime(r.mimeType)}`
    zip.file(path, blob)
    audioFiles.push({ id: r.id, path, mimeType: r.mimeType, size: blob.size })
  }

  const manifest: BackupManifest = {
    app: APP_ID,
    kind,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    counts,
    audioFiles,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('data.json', JSON.stringify(data))
  // Áudio já é comprimido: STORE evita gastar CPU recomprimindo.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => onProgress?.(m.percent))
  if (kind === 'full') await db.meta.put({ key: META_KEYS.lastBackupAt, value: manifest.exportedAt })
  return blob
}

export class BackupValidationError extends Error {}

export interface ParsedBackup {
  manifest: BackupManifest
  data: Record<string, Record<string, unknown>[]>
  zip: JSZip
  warnings: string[]
}

export async function readBackup(file: Blob): Promise<ParsedBackup> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new BackupValidationError('O arquivo não é um ZIP válido.')
  }
  const manifestFile = zip.file('manifest.json')
  const dataFile = zip.file('data.json')
  if (!manifestFile || !dataFile) throw new BackupValidationError('Backup incompleto: manifest.json ou data.json ausente.')

  let manifest: BackupManifest
  let data: Record<string, Record<string, unknown>[]>
  try {
    manifest = JSON.parse(await manifestFile.async('string'))
    data = JSON.parse(await dataFile.async('string'))
  } catch {
    throw new BackupValidationError('Não foi possível ler os dados do backup (JSON inválido).')
  }
  if (manifest.app !== APP_ID) throw new BackupValidationError('Este arquivo não é um backup do Polyglot Duo.')
  if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion > BACKUP_FORMAT_VERSION)
    throw new BackupValidationError('Backup criado por uma versão mais nova do app. Atualize antes de importar.')
  if (manifest.kind !== 'full' && manifest.kind !== 'recordings') throw new BackupValidationError('Tipo de backup desconhecido.')

  for (const [table, rows] of Object.entries(data)) {
    if (!(DATA_TABLES as readonly string[]).includes(table)) throw new BackupValidationError(`Tabela desconhecida: ${table}`)
    if (!Array.isArray(rows)) throw new BackupValidationError(`Formato inválido na tabela ${table}.`)
    const key = table === 'meta' ? 'key' : 'id'
    if (rows.some((r) => !r || typeof r !== 'object' || typeof r[key] !== 'string'))
      throw new BackupValidationError(`Registro sem identificador na tabela ${table}.`)
  }

  const warnings: string[] = []
  const audioIds = new Set(manifest.audioFiles?.map((a) => a.id) ?? [])
  for (const a of manifest.audioFiles ?? []) {
    if (!zip.file(a.path)) warnings.push(`Áudio ausente no arquivo: ${a.path}`)
  }
  const missing = (data.recordings ?? []).filter((r) => !audioIds.has(r.id as string))
  if (missing.length) warnings.push(`${missing.length} gravação(ões) sem arquivo de áudio serão ignoradas.`)
  return { manifest, data, zip, warnings }
}

/** Mapeia participantes do backup para os perfis locais pelo slot (1/2), evitando perfis duplicados. */
function buildParticipantMap(imported: Participant[], local: Participant[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of imported) {
    const match = local.find((l) => l.slot === p.slot)
    if (match && match.id !== p.id) map.set(p.id, match.id)
  }
  return map
}

function remapRow(table: string, row: Record<string, unknown>, map: Map<string, string>): Record<string, unknown> {
  if (map.size === 0) return row
  const sub = (v: unknown) => (typeof v === 'string' && map.has(v) ? map.get(v)! : v)
  const r: Record<string, unknown> = { ...row }
  if ('participantId' in r) r.participantId = sub(r.participantId)
  if ('winnerId' in r) r.winnerId = sub(r.winnerId)
  if (table === 'battles' && Array.isArray(r.turns))
    r.turns = (r.turns as Record<string, unknown>[]).map((t) => ({ ...t, participantId: sub(t.participantId) }))
  for (const field of ['finalScores', 'stats'])
    if (r[field] && typeof r[field] === 'object')
      r[field] = Object.fromEntries(Object.entries(r[field] as object).map(([k, v]) => [sub(k), v]))
  if (table === 'achievements' && typeof r.id === 'string') {
    const [pid, ...rest] = (r.id as string).split('_')
    r.id = [sub(pid), ...rest].join('_')
  }
  return r
}

export interface ImportSummary {
  added: Record<string, number>
  skipped: number
  audioRestored: number
  warnings: string[]
}

export async function importBackup(parsed: ParsedBackup, mode: ImportMode): Promise<ImportSummary> {
  const { manifest, data, zip } = parsed
  const warnings = [...parsed.warnings]
  const audioById = new Map((manifest.audioFiles ?? []).map((a) => [a.id, a]))

  // Lê os áudios antes da transação (IndexedDB não permite await de operações externas dentro dela).
  const blobs = new Map<string, Blob>()
  for (const [id, entry] of audioById) {
    const f = zip.file(entry.path)
    if (!f) continue
    const buf = await f.async('arraybuffer')
    blobs.set(id, new Blob([buf], { type: entry.mimeType }))
  }

  const tables = manifest.kind === 'full' ? [...DATA_TABLES] : RECORDING_TABLES
  const localParticipants = await db.participants.toArray()
  const map =
    mode === 'merge' || manifest.kind === 'recordings'
      ? buildParticipantMap((data.participants ?? []) as unknown as Participant[], localParticipants) : new Map<string, string>()
  if (manifest.kind === 'recordings' && localParticipants.length === 0)
    throw new BackupValidationError('Configure os participantes antes de restaurar apenas gravações.')

  const summary: ImportSummary = { added: {}, skipped: 0, audioRestored: 0, warnings }

  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      for (const t of tables) await db.table(t).clear()
      if (manifest.kind === 'full' || tables.includes('recordings')) await db.recordingBlobs.clear()
    }
    for (const t of tables) {
      // Placar é derivado: em mesclagem será recalculado pelo motor de jogo.
      if (mode === 'merge' && t === 'weeklyScores') continue
      if (mode === 'merge' && t === 'participants' && localParticipants.length > 0) continue
      let rows = (data[t] ?? []).map((r) => remapRow(t, r, map))
      if (t === 'recordings') rows = rows.filter((r) => blobs.has(r.id as string))
      const table = db.table(t)
      if (mode === 'merge') {
        const keyField = t === 'meta' ? 'key' : 'id'
        const existing = new Set((await table.toCollection().primaryKeys()) as string[])
        const fresh = rows.filter((r) => !existing.has(r[keyField] as string))
        summary.skipped += rows.length - fresh.length
        rows = fresh
      }
      if (rows.length) await table.bulkAdd(rows)
      summary.added[t] = rows.length
      if (t === 'recordings') {
        for (const r of rows) {
          await db.recordingBlobs.put({ id: r.id as string, blob: blobs.get(r.id as string)! })
          summary.audioRestored++
        }
      }
    }
  })
  emitDataChange()
  return summary
}

export interface StorageInfo {
  usage?: number
  quota?: number
  audioBytes: number
  dataBytes: number
  persisted?: boolean
}

export async function getStorageInfo(): Promise<StorageInfo> {
  let audioBytes = 0
  await db.recordings.each((r) => {
    audioBytes += r.size
  })
  let dataBytes = 0
  for (const t of DATA_TABLES) {
    const rows = await db.table(t).toArray()
    dataBytes += new Blob([JSON.stringify(rows)]).size
  }
  const info: StorageInfo = { audioBytes, dataBytes }
  if (navigator.storage?.estimate) {
    const e = await navigator.storage.estimate()
    info.usage = e.usage
    info.quota = e.quota
  }
  if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted()
  return info
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

export async function clearAllData() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
  emitDataChange()
}
