import { cn } from '@/lib/utils'
import { LANGUAGES } from '@/lib/constants'
import { pColor } from '@/hooks/useParticipantColors'
import type { Participant } from '@/types'

/** Seletor de participante em forma de botões (dois perfis lado a lado). */
export function ParticipantPicker({
  participants,
  value,
  onChange,
  allowBoth,
  className,
}: {
  participants: Participant[]
  value: string
  onChange: (id: string) => void
  allowBoth?: boolean
  className?: string
}) {
  const options = [...(allowBoth ? [{ id: 'both', label: 'Ambos', avatar: '👫', slot: 0 }] : []), ...participants.map((p) => ({ id: p.id, label: p.name, avatar: p.avatar, slot: p.slot }))]
  return (
    <div role="radiogroup" aria-label="Participante" className={cn('inline-flex max-w-full gap-1 rounded-lg bg-muted p-1', className)}>
      {options.map((o) => {
        const p = participants.find((x) => x.id === o.id)
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-all',
              value === o.id && 'bg-card text-foreground shadow-sm',
            )}
          >
            <span aria-hidden>{o.avatar}</span>
            <span className="truncate">{o.label}</span>
            {p && <span className="text-xs opacity-70">{LANGUAGES[p.language].flag}</span>}
            {p && value === o.id && <span aria-hidden className="size-1.5 rounded-full" style={{ background: pColor(p) }} />}
          </button>
        )
      })}
    </div>
  )
}
