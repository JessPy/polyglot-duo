import { describe, expect, it } from 'vitest'
import { parseCsv, parseFlashcardCsv, toCsv } from '@/lib/csv'

describe('CSV', () => {
  it('faz ida e volta com aspas, vírgulas e quebras de linha', () => {
    const rows = [['term', 'example'], ['hola', 'Dijo "hola, amigo"\nmañana']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
  it('lê flashcards com cabeçalho em português e valida campos', () => {
    const { rows, errors } = parseFlashcardCsv('termo;tradução;exemplo\ncasa;house;Mi casa\n;sem termo;')
    expect(rows).toEqual([{ term: 'casa', translation: 'house', example: 'Mi casa', category: '' }])
    expect(errors).toHaveLength(1)
  })
  it('aceita arquivo sem cabeçalho', () => {
    expect(parseFlashcardCsv('dog,cachorro').rows[0]).toMatchObject({ term: 'dog', translation: 'cachorro' })
  })
})
