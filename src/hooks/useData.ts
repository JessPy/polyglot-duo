import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { buildParticipantStats, type DataBundle, type ParticipantStats } from '@/lib/stats'
import { participantsRepo } from '@/repositories'
import { loadDataBundle } from '@/services/dataBundle'
import { useUiStore } from '@/store/ui'
import type { Participant } from '@/types'
import { useToday } from './useToday'

/** Hooks de leitura reativa: re-renderizam quando o IndexedDB muda. */

export function useParticipants(): Participant[] | undefined {
  return useLiveQuery(() => participantsRepo.list(), [])
}

export function useDataBundle(): DataBundle | undefined {
  return useLiveQuery(() => loadDataBundle(), [])
}

export function useActiveParticipant(participants: Participant[] | undefined): Participant | undefined {
  const activeId = useUiStore((s) => s.activeParticipantId)
  return participants?.find((p) => p.id === activeId) ?? participants?.[0]
}

export function useAllStats(bundle: DataBundle | undefined): Record<string, ParticipantStats> | undefined {
  const today = useToday()
  return useMemo(() => {
    if (!bundle) return undefined
    return Object.fromEntries(bundle.participants.map((p) => [p.id, buildParticipantStats(bundle, p.id, today)]))
  }, [bundle, today])
}

