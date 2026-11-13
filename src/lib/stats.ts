import { CHALLENGE_TYPES } from '@/lib/constants'
import { diffDays, startOfWeek } from '@/lib/dates'
import {
  computeXp,
  currentStreak,
  levelFromXp,
  longestStreak,
  type AchievementStats,
  type LevelInfo,
} from '@/lib/gamification'
import { dedupeActivities } from '@/lib/scoring'
import type {
  AudioRecording,
  Battle,
  ChallengeAttempt,
  DateKey,
  FlashcardReview,
  ID,
  Participant,
  PersonalGoal,
  Season,
  SpeakingEvaluation,
  StudyActivity,
  VocabularyItem,
  WeeklyScore,
} from '@/types'

/** Conjunto de dados carregado de uma vez (volume pessoal pequeno) para alimentar cálculos derivados. */
export interface DataBundle {
  participants: Participant[]
  goals: PersonalGoal[]
  activities: StudyActivity[]
  reviews: FlashcardReview[]
  vocabulary: VocabularyItem[]
  recordings: AudioRecording[]
  evaluations: SpeakingEvaluation[]
  attempts: ChallengeAttempt[]
  battles: Battle[]
  seasons: Season[]
  weeklyScores: WeeklyScore[]
}

export interface ParticipantStats {
  participantId: ID
  studyDates: DateKey[]
  streak: number
  longestStreak: number
  totalMinutes: number
  activitiesCount: number
  wordsLearned: number
  cardsLearned: number
  recordings: number
  speakingSessions: number
  challengesCompleted: number
  battlesPlayed: number
  battlesWon: number
  reviewsTotal: number
  retentionRate: number
  xp: number
  level: LevelInfo
  currentWeek?: WeeklyScore
  achievementStats: AchievementStats
}

export function buildParticipantStats(bundle: DataBundle, participantId: ID, today: DateKey): ParticipantStats {
  const acts = dedupeActivities(bundle.activities.filter((a) => a.participantId === participantId))
  const reviews = bundle.reviews.filter((r) => r.participantId === participantId)
  const vocab = bundle.vocabulary.filter((v) => v.participantId === participantId)
  const recordings = bundle.recordings.filter((r) => r.participantId === participantId)
  const attempts = bundle.attempts.filter((a) => a.participantId === participantId && a.status === 'completed')
  const battles = bundle.battles.filter((b) => b.status === 'completed' && b.turns.some((t) => t.participantId === participantId))
  const battlesWon = battles.filter((b) => b.winnerId === participantId).length
  const scores = bundle.weeklyScores.filter((s) => s.participantId === participantId)

  const studyDates = [...new Set([...acts.map((a) => a.date), ...reviews.map((r) => r.date), ...recordings.map((r) => r.date)])].sort()
  const cardsLearned = vocab.filter((v) => v.firstLearnedAt).length
  const wordsLearned = cardsLearned + acts.filter((a) => a.category === 'vocabulary').reduce((s, a) => s + (a.wordCount ?? 0), 0)
  const correct = reviews.filter((r) => r.correct).length

  const xp = computeXp({
    activities: acts,
    reviews: reviews.length,
    recordings: recordings.length,
    challengesCompleted: attempts.length,
    battlesPlayed: battles.length,
    battlesWon,
    weeklyPoints: scores.reduce((s, w) => s + w.total, 0),
  })

  const longest = longestStreak(studyDates)
  const seasonsCompleted = bundle.seasons.filter((s) => s.status === 'completed' && s.completedAt).length

  return {
    participantId,
    studyDates,
    streak: currentStreak(studyDates, today),
    longestStreak: longest,
    totalMinutes: acts.reduce((s, a) => s + a.durationMinutes, 0),
    activitiesCount: acts.length,
    wordsLearned,
    cardsLearned,
    recordings: recordings.length,
    speakingSessions: acts.filter((a) => a.category === 'speaking').length,
    challengesCompleted: attempts.length,
    battlesPlayed: battles.length,
    battlesWon,
    reviewsTotal: reviews.length,
    retentionRate: reviews.length ? (correct / reviews.length) * 100 : 0,
    xp,
    level: levelFromXp(xp),
    currentWeek: scores.find((s) => s.weekStart === startOfWeek(today)),
    achievementStats: {
      activities: acts.length,
      longestStreak: longest,
      wordsLearned,
      recordings: recordings.length,
      studyDays: studyDates.length,
      battlesWon,
      seasonsCompleted,
      journeyDays: studyDates.length ? diffDays(studyDates[0], studyDates[studyDates.length - 1]) + 1 : 0,
    },
  }
}

export interface WeekSummary {
  studyDays: number
  minutes: number
  words: number
  speaking: number
  listening: number
  writing: number
  challenges: number
}

export function weekSummary(bundle: DataBundle, participantId: ID, weekStart: DateKey, weekEnd: DateKey): WeekSummary {
  const inWeek = (d: DateKey) => d >= weekStart && d <= weekEnd
  const acts = dedupeActivities(bundle.activities.filter((a) => a.participantId === participantId && inWeek(a.date)))
  const reviews = bundle.reviews.filter((r) => r.participantId === participantId && inWeek(r.date))
  const learned = bundle.vocabulary.filter((v) => v.participantId === participantId && v.firstLearnedAt && inWeek(v.firstLearnedAt)).length
  return {
    studyDays: new Set([...acts.map((a) => a.date), ...reviews.map((r) => r.date)]).size,
    minutes: acts.reduce((s, a) => s + a.durationMinutes, 0),
    words: learned + acts.filter((a) => a.category === 'vocabulary').reduce((s, a) => s + (a.wordCount ?? 0), 0),
    speaking: acts.filter((a) => a.category === 'speaking').length,
    listening: acts.filter((a) => a.category === 'listening').length,
    writing: acts.filter((a) => a.category === 'writing').length,
    challenges: bundle.attempts.filter((a) => a.participantId === participantId && a.status === 'completed' && inWeek(a.date)).length,
  }
}

export function isOralChallenge(a: ChallengeAttempt) {
  return CHALLENGE_TYPES[a.challenge.type].oral
}

export function evaluationTotal(e: Pick<SpeakingEvaluation, 'clarity' | 'grammar' | 'vocabulary' | 'fluency'>) {
  return e.clarity + e.grammar + e.vocabulary + e.fluency
}
