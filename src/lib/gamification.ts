import { addDays, diffDays } from '@/lib/dates'
import type { AchievementKey, DateKey } from '@/types'

/* ---------------------------------- Streak --------------------------------- */

/**
 * Dias consecutivos de estudo. O streak continua "vivo" se a pessoa estudou ontem
 * e ainda não estudou hoje.
 */
export function currentStreak(studyDates: Iterable<DateKey>, today: DateKey): number {
  const set = new Set(studyDates)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let count = 0
  while (set.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function longestStreak(studyDates: Iterable<DateKey>): number {
  const sorted = [...new Set(studyDates)].sort()
  let best = 0
  let run = 0
  let prev: DateKey | null = null
  for (const d of sorted) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/* ------------------------------------ XP ----------------------------------- */

/** Tabela de XP. Todo o XP é derivado dos dados, então editar/excluir registros recalcula. */
export const XP_RULES = {
  activityBase: 10,
  perMinute: 1,
  flashcardReview: 2,
  recording: 15,
  challengeCompleted: 25,
  battleParticipation: 20,
  battleWin: 30,
  perWeeklyPoint: 1,
}

export interface XpInputs {
  activities: { durationMinutes: number }[]
  reviews: number
  recordings: number
  challengesCompleted: number
  battlesPlayed: number
  battlesWon: number
  weeklyPoints: number
}

export function computeXp(i: XpInputs): number {
  const fromActivities = i.activities.reduce(
    (s, a) => s + XP_RULES.activityBase + Math.round(a.durationMinutes) * XP_RULES.perMinute,
    0,
  )
  return Math.round(
    fromActivities +
      i.reviews * XP_RULES.flashcardReview +
      i.recordings * XP_RULES.recording +
      i.challengesCompleted * XP_RULES.challengeCompleted +
      i.battlesPlayed * XP_RULES.battleParticipation +
      i.battlesWon * XP_RULES.battleWin +
      i.weeklyPoints * XP_RULES.perWeeklyPoint,
  )
}

/* --------------------------------- Níveis ---------------------------------- */

/** Níveis de jogo (não confundir com CEFR). XP total para chegar ao nível L = 50·L·(L−1). */
export const LEVEL_TITLES = [
  'Semente',
  'Broto',
  'Aprendiz',
  'Curioso',
  'Viajante',
  'Explorador',
  'Desbravador',
  'Contador de histórias',
  'Poliglota',
  'Mestre',
  'Lenda',
]

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export interface LevelInfo {
  level: number
  title: string
  xp: number
  currentLevelXp: number
  nextLevelXp: number
  progress: number
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xp,
    currentLevelXp,
    nextLevelXp,
    progress: (xp - currentLevelXp) / (nextLevelXp - currentLevelXp),
  }
}

/* ------------------------------- Conquistas -------------------------------- */

export interface AchievementStats {
  activities: number
  longestStreak: number
  wordsLearned: number
  recordings: number
  studyDays: number
  battlesWon: number
  seasonsCompleted: number
  /** Dias entre o primeiro e o último dia de estudo */
  journeyDays: number
}

export const ACHIEVEMENTS: Record<
  AchievementKey,
  { title: string; description: string; icon: string; check: (s: AchievementStats) => boolean; progress: (s: AchievementStats) => [number, number] }
> = {
  first_activity: {
    title: 'Primeiro passo',
    description: 'Registrar a primeira atividade',
    icon: '🌱',
    check: (s) => s.activities >= 1,
    progress: (s) => [Math.min(1, s.activities), 1],
  },
  streak_7: {
    title: 'Semana em chamas',
    description: '7 dias consecutivos de estudo',
    icon: '🔥',
    check: (s) => s.longestStreak >= 7,
    progress: (s) => [Math.min(7, s.longestStreak), 7],
  },
  words_100: {
    title: 'Centena de palavras',
    description: '100 palavras aprendidas',
    icon: '📖',
    check: (s) => s.wordsLearned >= 100,
    progress: (s) => [Math.min(100, s.wordsLearned), 100],
  },
  recordings_10: {
    title: 'Voz ativa',
    description: '10 gravações no Speaking Studio',
    icon: '🎙️',
    check: (s) => s.recordings >= 10,
    progress: (s) => [Math.min(10, s.recordings), 10],
  },
  study_days_30: {
    title: 'Hábito formado',
    description: '30 dias de estudo',
    icon: '📅',
    check: (s) => s.studyDays >= 30,
    progress: (s) => [Math.min(30, s.studyDays), 30],
  },
  first_battle_win: {
    title: 'Campeão de domingo',
    description: 'Vencer o primeiro duelo',
    icon: '⚔️',
    check: (s) => s.battlesWon >= 1,
    progress: (s) => [Math.min(1, s.battlesWon), 1],
  },
  first_season: {
    title: 'Temporada completa',
    description: 'Concluir a primeira temporada',
    icon: '🏁',
    check: (s) => s.seasonsCompleted >= 1,
    progress: (s) => [Math.min(1, s.seasonsCompleted), 1],
  },
  days_90: {
    title: '90 dias de evolução',
    description: 'Estudar ao longo de 90 dias',
    icon: '🏆',
    check: (s) => s.journeyDays >= 90,
    progress: (s) => [Math.min(90, s.journeyDays), 90],
  },
}

export function unlockedAchievements(stats: AchievementStats): AchievementKey[] {
  return (Object.keys(ACHIEVEMENTS) as AchievementKey[]).filter((k) => ACHIEVEMENTS[k].check(stats))
}
