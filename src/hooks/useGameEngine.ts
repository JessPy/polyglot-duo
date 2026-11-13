import { useEffect } from 'react'
import { toast } from 'sonner'
import { onDataChange } from '@/db/events'
import { ACHIEVEMENTS } from '@/lib/gamification'
import { participantsRepo, rewardsRepo } from '@/repositories'
import { syncGameState } from '@/services/gameEngine'
import { useToday } from './useToday'

/** Mantém placar, temporadas, recompensas e conquistas sincronizados e avisa sobre desbloqueios. */
export function useGameEngine(enabled: boolean) {
  const today = useToday()
  useEffect(() => {
    if (!enabled) return
    let timer: number | undefined
    let running = false
    let pending = false

    const run = async () => {
      if (running) {
        pending = true
        return
      }
      running = true
      try {
        const { newAchievements, newUnlocks } = await syncGameState()
        if (newAchievements.length || newUnlocks.length) {
          const participants = await participantsRepo.list()
          const rewards = await rewardsRepo.list()
          const name = (id: string) => (id === 'both' ? 'Vocês dois' : (participants.find((p) => p.id === id)?.name ?? ''))
          for (const a of newAchievements) {
            const def = ACHIEVEMENTS[a.key]
            toast.success(`${def.icon} Conquista desbloqueada: ${def.title}`, { description: `${name(a.participantId)} — ${def.description}` })
          }
          for (const u of newUnlocks) {
            const r = rewards.find((x) => x.id === u.rewardId)
            if (r) toast.success(`🎁 Recompensa liberada: ${r.title}`, { description: `Para: ${name(u.winnerId)}` })
          }
        }
      } catch (err) {
        console.error('Falha ao sincronizar o estado do jogo', err)
      } finally {
        running = false
        if (pending) {
          pending = false
          void run()
        }
      }
    }

    void run()
    const off = onDataChange(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(run, 250)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [enabled, today])
}
