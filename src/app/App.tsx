import { useLiveQuery } from 'dexie-react-hooks'
import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { useParticipants } from '@/hooks/useData'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useParticipantColors } from '@/hooks/useParticipantColors'
import { useApplyTheme } from '@/hooks/useTheme'
import { META_KEYS, metaRepo } from '@/repositories'
import { router } from './router'

export function App() {
  const dark = useApplyTheme()
  const onboarded = useLiveQuery(() => metaRepo.get<string>(META_KEYS.onboarded).then((v) => v ?? null), [], 'loading' as const)
  const participants = useParticipants()
  const ready = onboarded !== 'loading' && participants !== undefined
  const configured = ready && Boolean(onboarded) && participants.length >= 2

  useParticipantColors(participants, dark)
  useGameEngine(configured)

  return (
    <MotionConfig reducedMotion="user">
      {!ready ? (
        <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      ) : configured ? (
        <RouterProvider router={router} />
      ) : (
        <OnboardingPage />
      )}
      <Toaster theme={dark ? 'dark' : 'light'} position="top-center" richColors closeButton />
    </MotionConfig>
  )
}
