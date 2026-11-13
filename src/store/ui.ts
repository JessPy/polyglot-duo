import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemePreference
  activeParticipantId: string | null
  setTheme: (t: ThemePreference) => void
  setActiveParticipant: (id: string) => void
}

/** Preferências simples ficam no localStorage; todos os dados do app ficam no IndexedDB. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      activeParticipantId: null,
      setTheme: (theme) => set({ theme }),
      setActiveParticipant: (activeParticipantId) => set({ activeParticipantId }),
    }),
    { name: 'polyglot-duo:prefs' },
  ),
)
