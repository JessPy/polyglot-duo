import type { DateKey } from '@/types'

/** Utilitários de data baseados no fuso horário local do navegador. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Diferença em dias de calendário (b - a), imune a horário de verão. */
export function diffDays(a: DateKey, b: DateKey): number {
  const da = fromDateKey(a)
  const db = fromDateKey(b)
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}

/** Semanas começam na segunda-feira e terminam no domingo (dia do Sunday Battle). */
export function startOfWeek(key: DateKey): DateKey {
  const d = fromDateKey(key)
  const dow = (d.getDay() + 6) % 7 // 0 = segunda
  return addDays(key, -dow)
}

export function endOfWeek(key: DateKey): DateKey {
  return addDays(startOfWeek(key), 6)
}

export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function isInRange(key: DateKey, start: DateKey, end: DateKey): boolean {
  return key >= start && key <= end
}

export function rangeDays(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k)
  return out
}

/** Lista os inícios de semana entre duas datas (inclusive). */
export function weekStartsBetween(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = startOfWeek(start); k <= end; k = addDays(k, 7)) out.push(k)
  return out
}

export function nextSunday(key: DateKey): DateKey {
  return endOfWeek(key)
}

export function monthKey(key: DateKey): string {
  return key.slice(0, 7)
}

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const longFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

export const formatWeekday = (key: DateKey) => weekdayFmt.format(fromDateKey(key)).replace('.', '')
export const formatShort = (key: DateKey) => shortFmt.format(fromDateKey(key)).replace('.', '')
export const formatLong = (key: DateKey) => longFmt.format(fromDateKey(key))
export const formatMonth = (key: DateKey) => {
  const s = monthFmt.format(fromDateKey(key))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h}h ${m}min` : `${h}h`
}

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${pad(m)}:${pad(s % 60)}`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}
