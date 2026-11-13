import { cn } from '@/lib/utils'
import { pColor } from '@/hooks/useParticipantColors'
import type { Participant } from '@/types'

export function ParticipantAvatar({ participant, size = 'md', className }: { participant: Pick<Participant, 'avatar' | 'slot' | 'name'>; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { sm: 'size-7 text-sm', md: 'size-10 text-xl', lg: 'size-14 text-3xl' }[size]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-offset-2 ring-offset-card', dims, className)}
      style={{ ['--tw-ring-color' as string]: pColor(participant) }}
      aria-label={participant.name}
      role="img"
    >
      {participant.avatar}
    </span>
  )
}

export function ParticipantDot({ participant, className }: { participant: Pick<Participant, 'slot'>; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ background: pColor(participant) }} />
}
