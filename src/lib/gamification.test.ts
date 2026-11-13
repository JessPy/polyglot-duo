import { describe, expect, it } from 'vitest'
import { computeXp, currentStreak, levelFromXp, longestStreak, unlockedAchievements, xpForLevel } from '@/lib/gamification'

describe('streak', () => {
  it('conta dias consecutivos terminando hoje ou ontem', () => {
    const dates = ['2026-11-10', '2026-11-11', '2026-11-12']
    expect(currentStreak(dates, '2026-11-12')).toBe(3)
    expect(currentStreak(dates, '2026-11-13')).toBe(3)
    expect(currentStreak(dates, '2026-11-14')).toBe(0)
  })
  it('atravessa viradas de mês', () => {
    expect(currentStreak(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2)
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'])).toBe(3)
  })
})

describe('XP e níveis', () => {
  it('calcula XP a partir dos registros', () => {
    expect(computeXp({ activities: [{ durationMinutes: 30 }], reviews: 5, recordings: 1, challengesCompleted: 1, battlesPlayed: 1, battlesWon: 1, weeklyPoints: 50 })).toBe(
      40 + 10 + 15 + 25 + 20 + 30 + 50,
    )
  })
  it('progride por limiares crescentes', () => {
    expect(xpForLevel(2)).toBe(100)
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
    expect(levelFromXp(200).progress).toBeCloseTo(0.5)
  })
})

describe('conquistas', () => {
  it('desbloqueia conforme as estatísticas', () => {
    const keys = unlockedAchievements({ activities: 1, longestStreak: 7, wordsLearned: 99, recordings: 10, studyDays: 3, battlesWon: 0, seasonsCompleted: 0, journeyDays: 5 })
    expect(keys).toEqual(['first_activity', 'streak_7', 'recordings_10'])
  })
})
