import { useEffect, useState } from 'react'
import { todayKey } from '@/lib/dates'

/** Data local de hoje, atualizada automaticamente na virada do dia. */
export function useToday(): string {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const check = () => setToday((prev) => (prev === todayKey() ? prev : todayKey()))
    const id = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}
