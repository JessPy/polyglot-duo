import { lazy, Suspense, type ComponentType } from 'react'
import { createHashRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState } from '@/components/shared/Page'

function page(loader: () => Promise<{ default: ComponentType }>) {
  const C = lazy(loader)
  return (
    <Suspense fallback={<LoadingState />}>
      <C />
    </Suspense>
  )
}

/** Hash router: funciona em qualquer hospedagem estática sem configuração de rewrite. */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: page(() => import('@/features/dashboard/DashboardPage')) },
      { path: 'estudos', element: page(() => import('@/features/study/StudyPage')) },
      { path: 'vocabulario', element: page(() => import('@/features/vocabulary/VocabularyPage')) },
      { path: 'desafios', element: page(() => import('@/features/challenges/ChallengesPage')) },
      { path: 'speaking', element: page(() => import('@/features/speaking/SpeakingPage')) },
      { path: 'battle', element: page(() => import('@/features/battle/BattlePage')) },
      { path: 'calendario', element: page(() => import('@/features/calendar/CalendarPage')) },
      { path: 'recompensas', element: page(() => import('@/features/rewards/RewardsPage')) },
      { path: 'analytics', element: page(() => import('@/features/analytics/AnalyticsPage')) },
      { path: 'configuracoes', element: page(() => import('@/features/settings/SettingsPage')) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
