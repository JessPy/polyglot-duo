import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AvatarPicker, ColorPicker, GoalFields, LanguageSelect, LevelSelect, MinutesFields } from '@/components/shared/ProfileFields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { DEFAULT_GOALS, LANGUAGES, REWARD_CONDITIONS, SEASON_LENGTHS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { requestPersistentStorage } from '@/services/backup'
import { startCompetition, type OnboardingData, type ParticipantDraft } from '@/services/onboarding'
import { useUiStore } from '@/store/ui'
import type { RewardCondition } from '@/types'

const STEPS = ['Participante 1', 'Participante 2', 'Idiomas', 'Níveis', 'Metas', 'Temporada', 'Recompensa', 'Começar']

const initialParticipants: [ParticipantDraft, ParticipantDraft] = [
  { name: '', avatar: '🦊', language: 'es', currentLevel: 'A2', targetLevel: 'B1', dailyGoalMinutes: 30, weeklyGoalMinutes: 180, color: 'blue' },
  { name: '', avatar: '🐼', language: 'en', currentLevel: 'B1', targetLevel: 'B2', dailyGoalMinutes: 30, weeklyGoalMinutes: 180, color: 'orange' },
]

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [participants, setParticipants] = useState(initialParticipants)
  const [goals, setGoals] = useState<OnboardingData['goals']>([{ ...DEFAULT_GOALS }, { ...DEFAULT_GOALS }])
  const [seasonLength, setSeasonLength] = useState<30 | 60 | 90>(90)
  const [reward, setReward] = useState({ title: 'Escolher o filme do fim de semana', description: '', condition: 'weekly_winner' as RewardCondition })
  const setActive = useUiStore((s) => s.setActiveParticipant)

  const updateP = (i: 0 | 1, changes: Partial<ParticipantDraft>) =>
    setParticipants((prev) => {
      const next = [...prev] as typeof prev
      next[i] = { ...next[i], ...changes }
      return next
    })

  const nameError = (i: 0 | 1) => (participants[i].name.trim().length < 1 ? 'Informe um nome.' : participants[i].name.length > 30 ? 'Máximo de 30 caracteres.' : undefined)
  const canAdvance = step === 0 ? !nameError(0) : step === 1 ? !nameError(1) : true

  const go = (delta: number) => {
    setDir(delta)
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)))
  }

  const finish = async () => {
    setBusy(true)
    try {
      const ids = await startCompetition({ participants, goals, seasonLength, reward: reward.title.trim() ? reward : null })
      setActive(ids[0])
      void requestPersistentStorage()
      toast.success('Competição iniciada! Boa sorte para vocês dois.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setBusy(false)
    }
  }

  const participantStep = (i: 0 | 1) => (
    <div className="flex flex-col gap-5">
      <Field label="Nome" htmlFor={`name-${i}`} error={participants[i].name ? nameError(i) : undefined}>
        <Input id={`name-${i}`} autoFocus value={participants[i].name} maxLength={30} placeholder={i === 0 ? 'Ex.: Jéssica' : 'Ex.: Felipe'} onChange={(e) => updateP(i, { name: e.target.value })} />
      </Field>
      <Field label="Avatar">
        <AvatarPicker value={participants[i].avatar} onChange={(avatar) => updateP(i, { avatar })} />
      </Field>
      <Field label="Cor de identificação" hint="Usada nos gráficos e no calendário.">
        <ColorPicker value={participants[i].color} onChange={(color) => updateP(i, { color })} taken={participants[i === 0 ? 1 : 0].color} />
      </Field>
    </div>
  )

  const both = (render: (i: 0 | 1) => ReactNode) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {([0, 1] as const).map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <p className="flex items-center gap-2 font-medium">
            <span aria-hidden>{participants[i].avatar}</span>
            {participants[i].name || `Participante ${i + 1}`}
          </p>
          {render(i)}
        </div>
      ))}
    </div>
  )

  const content = [
    participantStep(0),
    participantStep(1),
    both((i) => (
      <Field label="Idioma estudado" htmlFor={`lang-${i}`}>
        <LanguageSelect id={`lang-${i}`} value={participants[i].language} onChange={(language) => updateP(i, { language })} />
      </Field>
    )),
    both((i) => (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nível atual" htmlFor={`cur-${i}`}>
          <LevelSelect id={`cur-${i}`} value={participants[i].currentLevel} onChange={(currentLevel) => updateP(i, { currentLevel })} />
        </Field>
        <Field label="Nível desejado" htmlFor={`tgt-${i}`}>
          <LevelSelect id={`tgt-${i}`} value={participants[i].targetLevel} onChange={(targetLevel) => updateP(i, { targetLevel })} />
        </Field>
      </div>
    )),
    both((i) => (
      <div className="flex flex-col gap-4">
        <MinutesFields idPrefix={`m${i}`} daily={participants[i].dailyGoalMinutes} weekly={participants[i].weeklyGoalMinutes} onDaily={(dailyGoalMinutes) => updateP(i, { dailyGoalMinutes })} onWeekly={(weeklyGoalMinutes) => updateP(i, { weeklyGoalMinutes })} />
        <GoalFields
          idPrefix={`g${i}`}
          value={goals[i]}
          onChange={(g) =>
            setGoals((prev) => {
              const next = [...prev] as typeof prev
              next[i] = g
              return next
            })
          }
        />
      </div>
    )),
    <div key="season" className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Duração da temporada">
      {SEASON_LENGTHS.map((d) => (
        <button
          key={d}
          role="radio"
          aria-checked={seasonLength === d}
          onClick={() => setSeasonLength(d)}
          className={cn('flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition hover:bg-muted', seasonLength === d && 'border-foreground ring-1 ring-foreground')}
        >
          <span className="text-2xl font-semibold">{d} dias</span>
          <span className="text-sm text-muted-foreground">{d === 30 ? 'Sprint curto para criar o hábito' : d === 60 ? 'Equilíbrio entre ritmo e evolução' : 'Evolução real: compare o dia 1 com o dia 90'}</span>
        </button>
      ))}
    </div>,
    <div key="reward" className="flex flex-col gap-4">
      <Field label="Recompensa" htmlFor="rw-title" hint="Deixe em branco para pular. Você pode criar outras depois.">
        <Input id="rw-title" value={reward.title} maxLength={80} onChange={(e) => setReward({ ...reward, title: e.target.value })} />
      </Field>
      <Field label="Descrição (opcional)" htmlFor="rw-desc">
        <Textarea id="rw-desc" value={reward.description} maxLength={300} onChange={(e) => setReward({ ...reward, description: e.target.value })} />
      </Field>
      <Field label="Condição de desbloqueio" htmlFor="rw-cond" hint={REWARD_CONDITIONS[reward.condition].hint}>
        <NativeSelect id="rw-cond" value={reward.condition} onChange={(e) => setReward({ ...reward, condition: e.target.value as RewardCondition })}>
          {(Object.keys(REWARD_CONDITIONS) as RewardCondition[]).map((c) => (
            <option key={c} value={c}>
              {REWARD_CONDITIONS[c].label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>,
    <div key="summary" className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {participants.map((p, i) => (
          <div key={i} className="rounded-xl border p-4">
            <p className="text-lg font-semibold">
              {p.avatar} {p.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {LANGUAGES[p.language].flag} {LANGUAGES[p.language].label} · {p.currentLevel} → {p.targetLevel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Meta: {p.dailyGoalMinutes} min/dia · {p.weeklyGoalMinutes} min/semana
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Temporada de <strong className="text-foreground">{seasonLength} dias</strong> começando hoje.
        {reward.title.trim() && (
          <>
            {' '}Recompensa: <strong className="text-foreground">{reward.title}</strong>.
          </>
        )}
      </p>
      <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        🔒 Tudo fica salvo apenas neste navegador. Faça backups em <strong>Configurações → Dados</strong> para não perder suas gravações.
      </div>
    </div>,
  ]

  const titles = [
    'Quem é o primeiro participante?',
    'E o segundo participante?',
    'Quais idiomas vocês estudam?',
    'Em que nível vocês estão?',
    'Metas semanais',
    'Duração da primeira temporada',
    'Defina uma recompensa',
    'Tudo pronto!',
  ]
  const subtitles = [
    'Cada perfil tem seus próprios dados, metas e gravações.',
    'A competição compara o cumprimento das metas de cada um.',
    'O catálogo de desafios se adapta ao idioma.',
    'Use o CEFR (A1 a C2). Isso ajusta a dificuldade dos desafios.',
    'Cada categoria vale pontos proporcionais ao cumprimento, até 100 por semana.',
    'Ao final, quem somar mais pontos semanais vence.',
    'Competição saudável precisa de um bom prêmio.',
    'Revise e comece a jornada.',
  ]

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">P²</div>
            <span className="font-semibold tracking-tight">Polyglot Duo</span>
          </div>
          <span className="text-sm text-muted-foreground tabular">
            {step + 1} de {STEPS.length}
          </span>
        </div>
        <div className="mb-6 flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full bg-muted transition-colors', i <= step && 'bg-foreground')} />
          ))}
        </div>
        <Card className="overflow-hidden p-5 sm:p-7">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.2 }}>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{titles[step]}</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitles[step]}</p>
              {content[step]}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0 || busy}>
              <ArrowLeft /> Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(1)} disabled={!canAdvance}>
                Continuar <ArrowRight />
              </Button>
            ) : (
              <Button variant="brand" onClick={finish} disabled={busy}>
                <Rocket /> {busy ? 'Iniciando…' : 'Iniciar competição'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
