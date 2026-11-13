import { useEffect } from 'react'
import { PARTICIPANT_COLORS } from '@/lib/constants'
import type { Participant } from '@/types'

/** Publica as cores de identificação como variáveis CSS (--p1, --p2), ajustadas ao tema. */
export function useParticipantColors(participants: Participant[] | undefined, dark: boolean) {
  useEffect(() => {
    const root = document.documentElement
    for (const p of participants ?? []) {
      const c = PARTICIPANT_COLORS[p.color]
      root.style.setProperty(`--p${p.slot}`, dark ? c.dark : c.light)
    }
  }, [participants, dark])
}

export function pColor(p: Pick<Participant, 'slot'>): string {
  return `var(--p${p.slot})`
}
