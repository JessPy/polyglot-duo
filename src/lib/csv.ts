/** CSV simples (RFC 4180): campos com vírgula, aspas ou quebra de linha são delimitados por aspas. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',' || c === ';') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

function escapeField(v: string): string {
  return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeField).join(',')).join('\r\n')
}

export const FLASHCARD_CSV_HEADER = ['term', 'translation', 'example', 'category'] as const

export interface FlashcardCsvRow {
  term: string
  translation: string
  example: string
  category: string
}

/** Aceita cabeçalho em inglês ou português; sem cabeçalho, usa a ordem padrão. */
export function parseFlashcardCsv(text: string): { rows: FlashcardCsvRow[]; errors: string[] } {
  const table = parseCsv(text)
  const errors: string[] = []
  if (table.length === 0) return { rows: [], errors: ['Arquivo vazio.'] }

  const aliases: Record<string, keyof FlashcardCsvRow> = {
    term: 'term', termo: 'term', palavra: 'term', word: 'term',
    translation: 'translation', traducao: 'translation', 'tradução': 'translation',
    example: 'example', exemplo: 'example', frase: 'example',
    category: 'category', categoria: 'category',
  }
  const head = table[0].map((h) => aliases[h.trim().toLowerCase()])
  const hasHeader = head.some(Boolean)
  const columns: (keyof FlashcardCsvRow | undefined)[] = hasHeader ? head : [...FLASHCARD_CSV_HEADER]
  const body = hasHeader ? table.slice(1) : table

  const rows: FlashcardCsvRow[] = []
  body.forEach((r, idx) => {
    const item: FlashcardCsvRow = { term: '', translation: '', example: '', category: '' }
    columns.forEach((col, i) => {
      if (col) item[col] = (r[i] ?? '').trim()
    })
    if (!item.term || !item.translation) {
      errors.push(`Linha ${idx + (hasHeader ? 2 : 1)}: termo e tradução são obrigatórios.`)
      return
    }
    rows.push(item)
  })
  return { rows, errors }
}
