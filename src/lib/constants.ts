import type {
  ActivityCategory,
  ActivityResult,
  CefrLevel,
  ChallengeDifficulty,
  ChallengeType,
  LanguageCode,
  ParticipantColor,
  ReviewRating,
  RewardCategory,
  RewardCondition,
  ScoreCategory,
} from '@/types'

export const LANGUAGES: Record<LanguageCode, { label: string; flag: string; native: string }> = {
  es: { label: 'Espanhol', flag: '🇪🇸', native: 'Español' },
  en: { label: 'Inglês', flag: '🇬🇧', native: 'English' },
}

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/**
 * Cores de identificação. Os pares padrão (azul/laranja) foram validados para daltonismo;
 * os gráficos sempre exibem legenda e nomes, então a cor nunca é a única pista.
 */
export const PARTICIPANT_COLORS: Record<ParticipantColor, { label: string; light: string; dark: string }> = {
  blue: { label: 'Azul', light: '#2a78d6', dark: '#3987e5' },
  orange: { label: 'Laranja', light: '#eb6834', dark: '#d95926' },
  aqua: { label: 'Verde-água', light: '#1baf7a', dark: '#199e70' },
  violet: { label: 'Violeta', light: '#6250d6', dark: '#9085e9' },
  magenta: { label: 'Magenta', light: '#e87ba4', dark: '#d55181' },
}

export const AVATARS = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐸', '🦉', '🐙', '🦄', '🐧', '🌻', '🌵', '⚡', '🎧', '📚', '🚀']

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, { label: string; hint: string }> = {
  vocabulary: { label: 'Vocabulário', hint: 'Palavras aprendidas fora dos flashcards' },
  speaking: { label: 'Speaking', hint: 'Conversação, aulas, prática oral' },
  listening: { label: 'Listening', hint: 'Podcasts, séries, músicas, vídeos' },
  reading: { label: 'Reading', hint: 'Livros, artigos, notícias' },
  writing: { label: 'Writing', hint: 'Textos, diários, mensagens' },
  grammar: { label: 'Grammar', hint: 'Exercícios e estudo gramatical' },
  review: { label: 'Revisão', hint: 'Revisão de conteúdo estudado' },
}

export const ACTIVITY_RESULTS: Record<ActivityResult, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  ok: 'Regular',
  hard: 'Difícil',
}

export const SCORE_CATEGORIES: Record<ScoreCategory, { label: string; maxPoints: number; unit: string }> = {
  vocabulary: { label: 'Vocabulário', maxPoints: 20, unit: 'palavras' },
  speaking: { label: 'Speaking', maxPoints: 25, unit: 'sessões' },
  listening: { label: 'Listening', maxPoints: 20, unit: 'min' },
  writing: { label: 'Writing', maxPoints: 15, unit: 'textos' },
  retention: { label: 'Retenção', maxPoints: 20, unit: '%' },
}

export const MAX_WEEKLY_POINTS = 100
export const COOP_THRESHOLD = 80

export const DEFAULT_GOALS = {
  vocabularyWords: 25,
  speakingSessions: 3,
  speakingMinMinutes: 10,
  listeningMinutes: 100,
  writingTexts: 3,
  writingMinWords: 100,
  retentionPercent: 80,
}

export const REVIEW_RATINGS: Record<ReviewRating, { label: string; key: string }> = {
  again: { label: 'Errei', key: '1' },
  hard: { label: 'Difícil', key: '2' },
  good: { label: 'Bom', key: '3' },
  easy: { label: 'Fácil', key: '4' },
}

export const CHALLENGE_TYPES: Record<ChallengeType, { label: string; oral: boolean; description: string }> = {
  impromptu: { label: 'Fala improvisada', oral: true, description: 'Fale por 2 minutos sobre um tema sorteado.' },
  story: { label: 'História surpresa', oral: true, description: 'Crie uma história usando as 5 palavras sorteadas.' },
  interview: { label: 'Entrevista relâmpago', oral: true, description: 'Responda oralmente a 5 perguntas.' },
  describe: { label: 'Descreva sem dizer', oral: true, description: 'Explique o conceito sem dizer o nome dele.' },
  video: { label: 'Resumo de vídeo', oral: false, description: 'Assista a um vídeo e responda às perguntas.' },
  writing: { label: 'Desafio de escrita', oral: false, description: 'Escreva um pequeno texto sobre o tema.' },
  listening: { label: 'Listening', oral: false, description: 'Ouça um conteúdo e responda às perguntas.' },
}

export const DIFFICULTIES: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

export const REWARD_CONDITIONS: Record<RewardCondition, { label: string; category: RewardCategory; hint: string }> = {
  weekly_winner: { label: 'Vencedor da semana', category: 'weekly', hint: 'Quem fizer mais pontos na semana' },
  monthly_winner: { label: 'Vencedor do mês', category: 'monthly', hint: 'Maior soma de pontos semanais no mês' },
  season_winner: { label: 'Vencedor da temporada', category: 'quarterly', hint: 'Quem vencer a temporada' },
  coop_weekly: { label: 'Meta conjunta (80+ pontos cada)', category: 'cooperative', hint: 'Os dois fazem 80 pontos ou mais na semana' },
  manual: { label: 'Liberação manual', category: 'special', hint: 'Vocês liberam quando quiserem' },
}

export const REWARD_CATEGORIES: Record<RewardCategory, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  cooperative: 'Conjunta',
  special: 'Especial',
}

export const SEASON_LENGTHS = [30, 60, 90] as const

export const EVALUATION_CRITERIA = [
  { key: 'clarity', label: 'Clareza' },
  { key: 'grammar', label: 'Gramática' },
  { key: 'vocabulary', label: 'Vocabulário' },
  { key: 'fluency', label: 'Fluidez' },
] as const

export const MILESTONE_DAYS = [1, 30, 60, 90] as const
