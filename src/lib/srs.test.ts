import { describe, expect, it } from 'vitest'
import { INITIAL_EASE, scheduleReview, type SrsFields } from '@/lib/srs'

const fresh: SrsFields = { ease: INITIAL_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueDate: '2026-11-13', state: 'new' }

describe('scheduleReview (SM-2 simplificado)', () => {
  it('agenda 1, 3 e depois intervalo × ease', () => {
    const r1 = scheduleReview(fresh, 'good', '2026-11-13')
    expect(r1).toMatchObject({ intervalDays: 1, dueDate: '2026-11-14', state: 'learning', repetitions: 1 })
    const r2 = scheduleReview(r1, 'good', '2026-11-14')
    expect(r2).toMatchObject({ intervalDays: 3, dueDate: '2026-11-17', state: 'review' })
    const r3 = scheduleReview(r2, 'good', '2026-11-17')
    expect(r3.intervalDays).toBe(8)
    expect(r3.state).toBe('learned')
    expect(r3.firstLearnedAt).toBe('2026-11-17')
  })

  it('errar zera repetições, reduz o ease e mantém a data da primeira aprendizagem', () => {
    const learned: SrsFields = { ...fresh, repetitions: 4, intervalDays: 20, state: 'learned', firstLearnedAt: '2026-10-01' }
    const r = scheduleReview(learned, 'again', '2026-11-13')
    expect(r).toMatchObject({ repetitions: 0, lapses: 1, dueDate: '2026-11-13', state: 'learning', ease: 2.3, firstLearnedAt: '2026-10-01' })
  })

  it('ease nunca fica abaixo de 1.3', () => {
    let c: SrsFields = { ...fresh, ease: 1.35 }
    c = scheduleReview(c, 'again', '2026-11-13')
    c = scheduleReview(c, 'again', '2026-11-13')
    expect(c.ease).toBe(1.3)
  })

  it('fácil aumenta o intervalo mais que bom; difícil menos', () => {
    const base: SrsFields = { ...fresh, repetitions: 2, intervalDays: 10, state: 'review' }
    const hard = scheduleReview(base, 'hard', '2026-11-13').intervalDays
    const good = scheduleReview(base, 'good', '2026-11-13').intervalDays
    const easy = scheduleReview(base, 'easy', '2026-11-13').intervalDays
    expect(hard).toBeLessThan(good)
    expect(good).toBeLessThan(easy)
  })

  it('cadastrar não torna a palavra aprendida', () => {
    expect(fresh.state).toBe('new')
    expect(fresh.firstLearnedAt).toBeUndefined()
  })
})
