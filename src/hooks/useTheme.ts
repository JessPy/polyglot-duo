import { useEffect, useState } from 'react'
import { useUiStore } from '@/store/ui'

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Aplica o tema no <html> e devolve se o modo escuro está ativo. */
export function useApplyTheme(): boolean {
  const theme = useUiStore((s) => s.theme)
  const [sysDark, setSysDark] = useState(systemDark)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => setSysDark(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  const dark = theme === 'dark' || (theme === 'system' && sysDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0d10' : '#fafaf9')
  }, [dark])
  return dark
}

export function useIsDark(): boolean {
  const theme = useUiStore((s) => s.theme)
  if (theme === 'system') return systemDark()
  return theme === 'dark'
}
