import { useCallback, useState } from 'react'
import { toast } from 'sonner'

/** Executa uma ação assíncrona com estado de carregamento e mensagem de erro amigável. */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>, successMessage?: string) {
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async (...args: A): Promise<boolean> => {
      setPending(true)
      try {
        await fn(...args)
        if (successMessage) toast.success(successMessage)
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.')
        return false
      } finally {
        setPending(false)
      }
    },
    [fn, successMessage],
  )
  return { run, pending }
}
