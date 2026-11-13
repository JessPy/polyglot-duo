/**
 * Modelos de dados do Polyglot Duo.
 * Datas de calendário usam o formato local `yyyy-MM-dd` (DateKey) para respeitar o fuso horário do usuário.
 * Instantes usam ISO 8601 completo (`toISOString`).
 */

export type ID = string
/** Data local no formato yyyy-MM-dd */
export type DateKey = string

export type LanguageCode = 'es' | 'en'
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ParticipantColor = 'blue' | 'orange' | 'aqua' | 'violet' | 'magenta'

export interface Participant {
  id: ID
  slot: 1 | 2
  name: string
  avatar: string
  language: LanguageCode
  currentLevel: CefrLevel
  targetLevel: CefrLevel
  dailyGoalMinutes: number
  weeklyGoalMinutes: number
  startDate: DateKey
  color: ParticipantColor
  createdAt: string
  updatedAt: string
}

export type ActivityCategory =
  | 'vocabulary'
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'grammar'
  | 'review'

export type ActivityResult = 'excellent' | 'good' | 'ok' | 'hard'
export type ActivitySource = 'manual' | 'challenge' | 'recording'

export interface StudyActivity {
  id: ID
  participantId: ID
  category: ActivityCategory
  date: DateKey
  durationMinutes: number
  description: string
  /** Palavras aprendidas (vocabulário) ou palavras escritas (writing) */
  wordCount?: number
  notes: string
  result?: ActivityResult
  source: ActivitySource
  /** ID da entidade de origem (gravação, tentativa de desafio). Garante que uma origem gere no máximo uma atividade. */
  sourceId?: ID
  createdAt: string
  updatedAt: string
}

/** Metas semanais versionadas: a versão vigente numa semana é a mais recente com effectiveFrom <= início da semana. */
export interface PersonalGoal {
  id: ID
  participantId: ID
  effectiveFrom: DateKey
  vocabularyWords: number
  speakingSessions: number
  speakingMinMinutes: number
  listeningMinutes: number
  writingTexts: number
  writingMinWords: number
  retentionPercent: number
  createdAt: string
}

export type LearningState = 'new' | 'learning' | 'review' | 'learned'

export interface VocabularyItem {
  id: ID
  participantId: ID
  term: string
  translation: string
  example: string
  language: LanguageCode
  category: string
  createdAt: string
  state: LearningState
  ease: number
  intervalDays: number
  repetitions: number
  lapses: number
  dueDate: DateKey
  lastReviewedAt?: string
  /** Primeira vez que a palavra foi considerada aprendida. Nunca é limpo, evitando pontuação duplicada. */
  firstLearnedAt?: DateKey
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface FlashcardReview {
  id: ID
  itemId: ID
  participantId: ID
  date: DateKey
  rating: ReviewRating
  correct: boolean
  previousInterval: number
  nextInterval: number
  reviewedAt: string
}

export type ChallengeType =
  | 'impromptu'
  | 'story'
  | 'interview'
  | 'describe'
  | 'video'
  | 'writing'
  | 'listening'

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

/** Desafio concreto sorteado a partir do catálogo local. */
export interface Challenge {
  id: ID
  type: ChallengeType
  title: string
  description: string
  language: LanguageCode
  level: CefrLevel
  difficulty: ChallengeDifficulty
  suggestedMinutes: number
  topic?: string
  words?: string[]
  questions?: string[]
  target?: string
  minWords?: number
}

export type AttemptStatus = 'in_progress' | 'completed' | 'skipped'

export interface ChallengeAttempt {
  id: ID
  participantId: ID
  challenge: Challenge
  status: AttemptStatus
  date: DateKey
  startedAt: string
  completedAt?: string
  durationMinutes?: number
  /** Nota de 0 a 10 */
  result?: number
  answers: string[]
  text?: string
  link?: string
  recordingId?: ID
  notes: string
}

export interface AudioRecording {
  id: ID
  participantId: ID
  language: LanguageCode
  date: DateKey
  createdAt: string
  durationSeconds: number
  title: string
  topic: string
  challengeAttemptId?: ID
  mimeType: string
  size: number
  notes: string
}

/** O áudio fica numa tabela separada para que listagens não carreguem os blobs. */
export interface RecordingBlob {
  id: ID
  blob: Blob
}

export type Evaluator = 'self' | 'partner'

export interface SpeakingEvaluation {
  id: ID
  recordingId: ID
  participantId: ID
  clarity: number
  grammar: number
  vocabulary: number
  fluency: number
  evaluator: Evaluator
  createdAt: string
}

export type ScoreCategory = 'vocabulary' | 'speaking' | 'listening' | 'writing' | 'retention'

export interface CategoryScore {
  category: ScoreCategory
  achieved: number
  target: number
  ratio: number
  points: number
  maxPoints: number
}

export interface WeeklyScore {
  /** `${participantId}_${weekStart}` */
  id: string
  participantId: ID
  weekStart: DateKey
  total: number
  breakdown: CategoryScore[]
  studyMinutes: number
  studyDays: number
  computedAt: string
}

export type AchievementKey =
  | 'first_activity'
  | 'streak_7'
  | 'words_100'
  | 'recordings_10'
  | 'study_days_30'
  | 'first_battle_win'
  | 'first_season'
  | 'days_90'

export interface Achievement {
  /** `${participantId}_${key}` */
  id: string
  participantId: ID
  key: AchievementKey
  unlockedAt: string
}

export type RewardCondition =
  | 'weekly_winner'
  | 'monthly_winner'
  | 'season_winner'
  | 'coop_weekly'
  | 'manual'

export type RewardCategory = 'weekly' | 'monthly' | 'quarterly' | 'cooperative' | 'special'

export interface Reward {
  id: ID
  title: string
  description: string
  category: RewardCategory
  condition: RewardCondition
  status: 'active' | 'paused'
  createdAt: string
}

/** Desbloqueio de uma recompensa num período. O ID determinístico impede duplicação. */
export interface RewardUnlock {
  /** `${rewardId}_${periodKey}` */
  id: string
  rewardId: ID
  periodKey: string
  winnerId: ID | 'both'
  unlockedAt: string
  redeemedAt?: string
}

export interface Season {
  id: ID
  name: string
  lengthDays: 30 | 60 | 90
  startDate: DateKey
  endDate: DateKey
  status: 'active' | 'completed'
  winnerId?: ID | 'tie'
  finalScores?: Record<ID, number>
  stats?: Record<ID, { minutes: number; studyDays: number; battlesWon: number; words: number }>
  completedAt?: string
  createdAt: string
}

export interface BattleTurn {
  participantId: ID
  challenge: Challenge
  startedAt?: string
  elapsedSeconds: number
  clarity: number
  grammar: number
  vocabulary: number
  fluency: number
  recordingId?: ID
  notes: string
  done: boolean
}

export interface Battle {
  id: ID
  date: DateKey
  challengeType: ChallengeType
  status: 'in_progress' | 'completed'
  turns: BattleTurn[]
  winnerId?: ID | 'tie'
  createdAt: string
  completedAt?: string
}

export interface MetaEntry {
  key: string
  value: unknown
}
