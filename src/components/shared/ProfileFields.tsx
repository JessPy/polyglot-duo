import { Field, Input, NativeSelect } from '@/components/ui/input'
import { AVATARS, CEFR_LEVELS, LANGUAGES, PARTICIPANT_COLORS } from '@/lib/constants'
import type { GoalTargets } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { CefrLevel, LanguageCode, ParticipantColor } from '@/types'
import { useIsDark } from '@/hooks/useTheme'

export function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Avatar">
      {AVATARS.map((a) => (
        <button
          key={a}
          role="radio"
          aria-checked={value === a}
          onClick={() => onChange(a)}
          className={cn('flex aspect-square items-center justify-center rounded-lg border text-xl transition hover:bg-muted', value === a && 'border-foreground bg-muted ring-1 ring-foreground')}
        >
          {a}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange, taken }: { value: ParticipantColor; onChange: (v: ParticipantColor) => void; taken?: ParticipantColor }) {
  const dark = useIsDark()
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de identificação">
      {(Object.keys(PARTICIPANT_COLORS) as ParticipantColor[]).map((c) => {
        const disabled = taken === c
        return (
          <button
            key={c}
            role="radio"
            aria-checked={value === c}
            aria-label={PARTICIPANT_COLORS[c].label + (disabled ? ' (em uso)' : '')}
            title={PARTICIPANT_COLORS[c].label}
            disabled={disabled}
            onClick={() => onChange(c)}
            className={cn('size-9 rounded-full ring-offset-2 ring-offset-card transition disabled:opacity-25', value === c && 'ring-2 ring-foreground')}
            style={{ background: dark ? PARTICIPANT_COLORS[c].dark : PARTICIPANT_COLORS[c].light }}
          />
        )
      })}
    </div>
  )
}

export function LanguageSelect({ value, onChange, id }: { value: LanguageCode; onChange: (v: LanguageCode) => void; id?: string }) {
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as LanguageCode)}>
      {(Object.keys(LANGUAGES) as LanguageCode[]).map((l) => (
        <option key={l} value={l}>
          {LANGUAGES[l].flag} {LANGUAGES[l].label}
        </option>
      ))}
    </NativeSelect>
  )
}

export function LevelSelect({ value, onChange, id }: { value: CefrLevel; onChange: (v: CefrLevel) => void; id?: string }) {
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as CefrLevel)}>
      {CEFR_LEVELS.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </NativeSelect>
  )
}

function NumberField({ label, value, onChange, min = 0, max = 10000, suffix, id }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; suffix?: string; id: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))} className="pr-16" />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </Field>
  )
}

/** Campos das metas semanais (pontuação). */
export function GoalFields({ value, onChange, idPrefix }: { value: GoalTargets; onChange: (v: GoalTargets) => void; idPrefix: string }) {
  const set = (k: keyof GoalTargets) => (n: number) => onChange({ ...value, [k]: n })
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField id={`${idPrefix}-voc`} label="Vocabulário (20 pts)" value={value.vocabularyWords} onChange={set('vocabularyWords')} min={1} suffix="palavras" />
      <NumberField id={`${idPrefix}-spk`} label="Speaking (25 pts)" value={value.speakingSessions} onChange={set('speakingSessions')} min={1} max={50} suffix="sessões" />
      <NumberField id={`${idPrefix}-spkmin`} label="Duração mínima speaking" value={value.speakingMinMinutes} onChange={set('speakingMinMinutes')} min={1} max={180} suffix="min" />
      <NumberField id={`${idPrefix}-lis`} label="Listening (20 pts)" value={value.listeningMinutes} onChange={set('listeningMinutes')} min={1} suffix="min" />
      <NumberField id={`${idPrefix}-wri`} label="Writing (15 pts)" value={value.writingTexts} onChange={set('writingTexts')} min={1} max={50} suffix="textos" />
      <NumberField id={`${idPrefix}-wrimin`} label="Palavras por texto" value={value.writingMinWords} onChange={set('writingMinWords')} min={10} suffix="palavras" />
      <NumberField id={`${idPrefix}-ret`} label="Retenção (20 pts)" value={value.retentionPercent} onChange={set('retentionPercent')} min={10} max={100} suffix="% acertos" />
    </div>
  )
}

export function MinutesFields({ daily, weekly, onDaily, onWeekly, idPrefix }: { daily: number; weekly: number; onDaily: (n: number) => void; onWeekly: (n: number) => void; idPrefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField id={`${idPrefix}-daily`} label="Meta diária" value={daily} onChange={onDaily} min={5} max={600} suffix="min" />
      <NumberField id={`${idPrefix}-weekly`} label="Meta semanal" value={weekly} onChange={onWeekly} min={10} max={4000} suffix="min" />
    </div>
  )
}
