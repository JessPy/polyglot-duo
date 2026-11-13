import { CHALLENGE_TYPES } from '@/lib/constants'
import { pickRandom, sampleN, uid, type Rng } from '@/lib/utils'
import type { CefrLevel, Challenge, ChallengeDifficulty, ChallengeType, LanguageCode } from '@/types'

/**
 * Catálogo local de desafios, organizado por idioma e faixa de nível.
 * O sorteio combina itens do catálogo; nada é gerado por IA.
 * Para adicionar conteúdo, basta incluir itens nas listas abaixo.
 */

type Band = 'basic' | 'intermediate' | 'advanced'

interface LanguageCatalog {
  topics: Record<Band, string[]>
  words: Record<Band, string[]>
  interview: Record<Band, string[]>
  describe: Record<Band, string[]>
  writing: Record<Band, string[]>
  videoQuestions: string[]
  listeningQuestions: string[]
}

const es: LanguageCatalog = {
  topics: {
    basic: [
      'Mi rutina de los fines de semana',
      'Mi comida favorita y cómo se prepara',
      'Un viaje que hice',
      'Mi ciudad: lo que me gusta y lo que no',
      'Mi familia y mis amigos',
      'Lo que hago para relajarme',
      'Mi casa ideal',
      'Un día perfecto',
    ],
    intermediate: [
      'Las ventajas y desventajas de trabajar desde casa',
      'Una película o serie que recomendaría y por qué',
      'Cómo la tecnología cambió mi vida',
      'Un desafío que superé',
      'Cómo sería mi vida si viviera en otro país',
      'La importancia de aprender idiomas',
      'Un recuerdo de mi infancia',
      'Mis metas para el próximo año',
    ],
    advanced: [
      '¿Las redes sociales nos acercan o nos alejan?',
      'El impacto del turismo en las ciudades',
      '¿Debería la educación universitaria ser gratuita?',
      'El futuro del trabajo con la automatización',
      'Qué significa tener éxito en la vida',
      'La relación entre cultura e idioma',
    ],
  },
  words: {
    basic: ['playa', 'perro', 'tren', 'pastel', 'lluvia', 'llave', 'mercado', 'abuela', 'bicicleta', 'sombrero', 'ventana', 'café', 'regalo', 'montaña', 'libro', 'gato', 'maleta', 'cumpleaños', 'luna', 'cocina'],
    intermediate: ['aeropuerto', 'equivocarse', 'sorpresa', 'vecino', 'tormenta', 'perderse', 'mensaje', 'disfraz', 'secreto', 'apuesta', 'enfadarse', 'recuerdo', 'cartera', 'atasco', 'madrugada', 'desconocido', 'mudanza', 'olvidar', 'cita', 'carretera'],
    advanced: ['malentendido', 'remordimiento', 'desafortunadamente', 'casualidad', 'imprescindible', 'aprovechar', 'desenlace', 'ambiguo', 'arriesgarse', 'herencia', 'sospechar', 'agotador', 'cotidiano', 'sin embargo', 'hallazgo', 'empeñarse', 'disculparse', 'rumbo', 'trámite', 'nostalgia'],
  },
  interview: {
    basic: [
      '¿Cómo te llamas y de dónde eres?',
      '¿Qué haces normalmente por la mañana?',
      '¿Cuál es tu comida favorita?',
      '¿Qué te gusta hacer los domingos?',
      '¿Tienes mascotas?',
      '¿Cómo es tu mejor amigo?',
      '¿Qué música escuchas?',
      '¿Adónde te gustaría viajar?',
    ],
    intermediate: [
      '¿Qué harías con un día libre inesperado?',
      '¿Cuál ha sido el mejor consejo que has recibido?',
      '¿Qué costumbre de tu país explicarías a un extranjero?',
      '¿Qué te motivó a aprender español?',
      '¿Qué habilidad te gustaría aprender y por qué?',
      '¿Cómo te imaginas dentro de cinco años?',
      '¿Prefieres la ciudad o el campo? ¿Por qué?',
      '¿Qué libro o película te marcó?',
    ],
    advanced: [
      '¿Crees que la inteligencia artificial cambiará la educación?',
      '¿Qué cambiarías del sistema educativo de tu país?',
      '¿Es mejor ser especialista o generalista?',
      '¿Hasta qué punto somos responsables del cambio climático?',
      '¿Qué papel tiene el fracaso en el aprendizaje?',
      '¿Vale la pena sacrificar tiempo libre por la carrera?',
    ],
  },
  describe: {
    basic: ['paraguas', 'nevera', 'cepillo de dientes', 'bicicleta', 'reloj', 'espejo', 'almohada', 'tijeras', 'helado', 'zapatos'],
    intermediate: ['aeropuerto', 'cumpleaños', 'vacaciones', 'supermercado', 'despertador', 'contraseña', 'mudanza', 'entrevista de trabajo', 'atasco', 'propina'],
    advanced: ['nostalgia', 'democracia', 'procrastinar', 'amistad', 'libertad', 'confianza', 'burocracia', 'creatividad', 'empatía', 'sostenibilidad'],
  },
  writing: {
    basic: ['Escribe sobre tu último fin de semana', 'Describe tu barrio', 'Escribe un mensaje invitando a un amigo a cenar', 'Cuenta qué comiste ayer'],
    intermediate: ['Escribe una reseña de un restaurante', 'Cuenta una anécdota divertida de un viaje', 'Escribe una carta a tu yo del futuro', 'Explica una tradición brasileña'],
    advanced: ['Argumenta a favor o en contra del teletrabajo', 'Escribe un artículo de opinión sobre el uso del móvil', 'Analiza los beneficios de vivir en el extranjero', 'Escribe sobre el papel de la música en tu vida'],
  },
  videoQuestions: [
    '¿Cuál es el tema principal del vídeo?',
    '¿Quiénes son las personas que aparecen o hablan?',
    'Menciona tres ideas o datos importantes.',
    '¿Qué palabras o expresiones nuevas aprendiste?',
    '¿Estás de acuerdo con lo que se dice? ¿Por qué?',
  ],
  listeningQuestions: [
    '¿De qué trata el audio?',
    '¿Cuál es el tono (formal, informal, divertido, serio)?',
    'Resume la idea principal en dos frases.',
    'Anota tres palabras nuevas y su significado.',
    '¿Qué parte fue más difícil de entender?',
  ],
}

const en: LanguageCatalog = {
  topics: {
    basic: [
      'My weekend routine',
      'My favourite food and how to make it',
      'A trip I remember',
      'My city: what I like and dislike',
      'My family and friends',
      'What I do to relax',
      'My dream house',
      'A perfect day',
    ],
    intermediate: [
      'The pros and cons of working from home',
      'A movie or series I would recommend and why',
      'How technology changed my life',
      'A challenge I overcame',
      'What my life would be like in another country',
      'Why learning languages matters',
      'A childhood memory',
      'My goals for next year',
    ],
    advanced: [
      'Do social networks bring us closer or push us apart?',
      'The impact of tourism on cities',
      'Should university education be free?',
      'The future of work with automation',
      'What does success really mean?',
      'How language shapes the way we think',
    ],
  },
  words: {
    basic: ['beach', 'dog', 'train', 'cake', 'rain', 'key', 'market', 'grandmother', 'bicycle', 'hat', 'window', 'coffee', 'gift', 'mountain', 'book', 'cat', 'suitcase', 'birthday', 'moon', 'kitchen'],
    intermediate: ['airport', 'mistake', 'surprise', 'neighbour', 'storm', 'get lost', 'message', 'costume', 'secret', 'bet', 'upset', 'memory', 'wallet', 'traffic jam', 'midnight', 'stranger', 'move out', 'forget', 'appointment', 'highway'],
    advanced: ['misunderstanding', 'regret', 'unfortunately', 'coincidence', 'essential', 'take advantage of', 'outcome', 'ambiguous', 'take a risk', 'inheritance', 'suspicious', 'exhausting', 'nevertheless', 'breakthrough', 'apologise', 'overwhelming', 'paperwork', 'nostalgia', 'reluctant', 'thrilled'],
  },
  interview: {
    basic: [
      'What is your name and where are you from?',
      'What do you usually do in the morning?',
      'What is your favourite food?',
      'What do you like to do on Sundays?',
      'Do you have any pets?',
      'What is your best friend like?',
      'What kind of music do you listen to?',
      'Where would you like to travel?',
    ],
    intermediate: [
      'What would you do with an unexpected day off?',
      'What is the best advice you have ever received?',
      'Which Brazilian custom would you explain to a foreigner?',
      'Why did you decide to learn English?',
      'What skill would you like to learn and why?',
      'Where do you see yourself in five years?',
      'Do you prefer the city or the countryside? Why?',
      'Which book or film had a big impact on you?',
    ],
    advanced: [
      'Do you think artificial intelligence will change education?',
      'What would you change about the education system in your country?',
      'Is it better to be a specialist or a generalist?',
      'How responsible are individuals for climate change?',
      'What role does failure play in learning?',
      'Is it worth sacrificing free time for your career?',
    ],
  },
  describe: {
    basic: ['umbrella', 'fridge', 'toothbrush', 'bicycle', 'watch', 'mirror', 'pillow', 'scissors', 'ice cream', 'shoes'],
    intermediate: ['airport', 'birthday', 'holiday', 'supermarket', 'alarm clock', 'password', 'moving house', 'job interview', 'traffic jam', 'tip'],
    advanced: ['nostalgia', 'democracy', 'procrastination', 'friendship', 'freedom', 'trust', 'bureaucracy', 'creativity', 'empathy', 'sustainability'],
  },
  writing: {
    basic: ['Write about your last weekend', 'Describe your neighbourhood', 'Write a message inviting a friend to dinner', 'Describe what you ate yesterday'],
    intermediate: ['Write a review of a restaurant', 'Tell a funny story from a trip', 'Write a letter to your future self', 'Explain a Brazilian tradition'],
    advanced: ['Argue for or against remote work', 'Write an opinion piece about smartphone use', 'Discuss the benefits of living abroad', 'Write about the role of music in your life'],
  },
  videoQuestions: [
    'What is the main topic of the video?',
    'Who are the people speaking or appearing?',
    'Mention three important ideas or facts.',
    'Which new words or expressions did you learn?',
    'Do you agree with what was said? Why?',
  ],
  listeningQuestions: [
    'What is the audio about?',
    'What is the tone (formal, informal, funny, serious)?',
    'Summarise the main idea in two sentences.',
    'Write down three new words and their meaning.',
    'Which part was the hardest to understand?',
  ],
}

export const CATALOG: Record<LanguageCode, LanguageCatalog> = { es, en }

export function bandForLevel(level: CefrLevel): Band {
  if (level === 'A1' || level === 'A2') return 'basic'
  if (level === 'B1') return 'intermediate'
  return 'advanced'
}

const difficultyByBand: Record<Band, ChallengeDifficulty> = { basic: 'easy', intermediate: 'medium', advanced: 'hard' }

export const BANDS: Record<Band, { label: string; level: CefrLevel }> = {
  basic: { label: 'Básico (A1–A2)', level: 'A2' },
  intermediate: { label: 'Intermediário (B1)', level: 'B1' },
  advanced: { label: 'Avançado (B2+)', level: 'B2' },
}

export interface DrawOptions {
  language: LanguageCode
  level: CefrLevel
  type?: ChallengeType
  types?: ChallengeType[]
  rng?: Rng
}

/** Sorteia um desafio concreto do catálogo. */
export function drawChallenge({ language, level, type, types, rng = Math.random }: DrawOptions): Challenge {
  const cat = CATALOG[language]
  const band = bandForLevel(level)
  const chosenType = type ?? pickRandom(types ?? (Object.keys(CHALLENGE_TYPES) as ChallengeType[]), rng)
  const base = {
    id: uid(),
    type: chosenType,
    language,
    level,
    difficulty: difficultyByBand[band],
  }
  const minWords = band === 'basic' ? 80 : band === 'intermediate' ? 100 : 150

  switch (chosenType) {
    case 'impromptu': {
      const topic = pickRandom(cat.topics[band], rng)
      return { ...base, title: 'Fala improvisada', description: 'Fale por 2 minutos sem parar sobre o tema. Vale reformular, o importante é não travar.', topic, suggestedMinutes: 2 }
    }
    case 'story': {
      const words = sampleN(cat.words[band], 5, rng)
      return { ...base, title: 'História surpresa', description: 'Conte uma história curta que use as 5 palavras, na ordem que quiser.', words, suggestedMinutes: 3 }
    }
    case 'interview': {
      const questions = sampleN(cat.interview[band], 5, rng)
      return { ...base, title: 'Entrevista relâmpago', description: 'Responda oralmente a cada pergunta com pelo menos 3 frases.', questions, suggestedMinutes: 5 }
    }
    case 'describe': {
      const target = pickRandom(cat.describe[band], rng)
      return { ...base, title: 'Descreva sem dizer', description: 'Explique o conceito sem dizer a palavra. Seu parceiro tenta adivinhar.', target, suggestedMinutes: 2 }
    }
    case 'writing': {
      const topic = pickRandom(cat.writing[band], rng)
      return { ...base, title: 'Desafio de escrita', description: `Escreva um texto de pelo menos ${minWords} palavras sobre o tema.`, topic, minWords, suggestedMinutes: 20 }
    }
    case 'video':
      return { ...base, title: 'Resumo de vídeo', description: 'Escolha um vídeo no idioma estudado, cole o link e responda às perguntas.', questions: [...cat.videoQuestions], suggestedMinutes: 20 }
    case 'listening':
      return { ...base, title: 'Listening', description: 'Ouça um podcast, música ou áudio, registre o que ouviu e responda às perguntas.', questions: [...cat.listeningQuestions], suggestedMinutes: 20 }
  }
}
