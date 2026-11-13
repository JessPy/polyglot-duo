import { describe, expect, it } from 'vitest'
import { CHALLENGE_TYPES } from '@/lib/constants'
import { drawChallenge } from '@/data/challenges'
import type { ChallengeType } from '@/types'

describe('catálogo de desafios', () => {
  it('gera todos os tipos nos dois idiomas e níveis', () => {
    for (const language of ['es', 'en'] as const)
      for (const level of ['A2', 'B1', 'B2'] as const)
        for (const type of Object.keys(CHALLENGE_TYPES) as ChallengeType[]) {
          const c = drawChallenge({ language, level, type })
          expect(c.type).toBe(type)
          expect(c.language).toBe(language)
          if (type === 'story') expect(new Set(c.words).size).toBe(5)
          if (type === 'interview') expect(c.questions).toHaveLength(5)
        }
  })
})
