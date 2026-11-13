import Dexie, { type EntityTable } from 'dexie'
import type {
  Achievement,
  AudioRecording,
  Battle,
  ChallengeAttempt,
  FlashcardReview,
  MetaEntry,
  Participant,
  PersonalGoal,
  RecordingBlob,
  Reward,
  RewardUnlock,
  Season,
  SpeakingEvaluation,
  StudyActivity,
  VocabularyItem,
  WeeklyScore,
} from '@/types'
import { applyMigrations } from './migrations'

export class PolyglotDuoDB extends Dexie {
  participants!: EntityTable<Participant, 'id'>
  goals!: EntityTable<PersonalGoal, 'id'>
  activities!: EntityTable<StudyActivity, 'id'>
  vocabulary!: EntityTable<VocabularyItem, 'id'>
  reviews!: EntityTable<FlashcardReview, 'id'>
  attempts!: EntityTable<ChallengeAttempt, 'id'>
  recordings!: EntityTable<AudioRecording, 'id'>
  recordingBlobs!: EntityTable<RecordingBlob, 'id'>
  evaluations!: EntityTable<SpeakingEvaluation, 'id'>
  weeklyScores!: EntityTable<WeeklyScore, 'id'>
  achievements!: EntityTable<Achievement, 'id'>
  rewards!: EntityTable<Reward, 'id'>
  rewardUnlocks!: EntityTable<RewardUnlock, 'id'>
  seasons!: EntityTable<Season, 'id'>
  battles!: EntityTable<Battle, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'polyglot-duo') {
    super(name)
    applyMigrations(this)
  }
}

export const db = new PolyglotDuoDB()

/** Tabelas de dados estruturados incluídas no backup (os blobs vão como arquivos separados). */
export const DATA_TABLES = [
  'participants',
  'goals',
  'activities',
  'vocabulary',
  'reviews',
  'attempts',
  'recordings',
  'evaluations',
  'weeklyScores',
  'achievements',
  'rewards',
  'rewardUnlocks',
  'seasons',
  'battles',
  'meta',
] as const

export type DataTableName = (typeof DATA_TABLES)[number]
