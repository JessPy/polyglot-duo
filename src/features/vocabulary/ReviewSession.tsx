import { CheckCircle2, Eye, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { REVIEW_RATINGS } from '@/lib/constants'
import { todayKey } from '@/lib/dates'
import { scheduleReview } from '@/lib/srs'
import { vocabularyRepo } from '@/repositories'
import type { ReviewRating, VocabularyItem } from '@/types'

const intervalLabel = (days: number) => (days === 0 ? 'hoje' : days === 1 ? '1 dia' : days < 30 ? `${days} dias` : `${Math.round(days / 30)} mês(es)`)

/** Sessão de revisão: "Errei" devolve a carta para o fim da fila da sessão. */
export function ReviewSession({ due }: { due: VocabularyItem[] }) {
  const [queue, setQueue] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ done: 0, correct: 0 })
  const [started, setStarted] = useState(false)
  const review = useAction((id: string, r: ReviewRating) => vocabularyRepo.review(id, r))

  // Começa a sessão com as cartas pendentes no momento.
  useEffect(() => {
    if (!started) setQueue(due.map((d) => d.id))
  }, [due, started])

  const byId = useMemo(() => new Map(due.map((d) => [d.id, d])), [due])
  const [cache, setCache] = useState(new Map<string, VocabularyItem>())
  useEffect(() => {
    setCache((prev) => {
      const next = new Map(prev)
      for (const d of due) next.set(d.id, d)
      return next
    })
  }, [due])
  const current = queue[0] ? (byId.get(queue[0]) ?? cache.get(queue[0])) : undefined

  const answer = useCallback(
    async (rating: ReviewRating) => {
      if (!current || review.pending) return
      setStarted(true)
      const ok = await review.run(current.id, rating)
      if (!ok) return
      setStats((s) => ({ done: s.done + 1, correct: s.correct + (rating !== 'again' ? 1 : 0) }))
      setRevealed(false)
      setQueue((q) => (rating === 'again' ? [...q.slice(1), q[0]] : q.slice(1)))
    },
    [current, review],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed) {
        const r = (Object.keys(REVIEW_RATINGS) as ReviewRating[]).find((k) => REVIEW_RATINGS[k].key === e.key)
        if (r) void answer(r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, answer])

  if (!current) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <p className="text-lg font-semibold">{stats.done ? 'Revisão concluída!' : 'Nenhuma revisão pendente'}</p>
        <p className="text-sm text-muted-foreground">
          {stats.done ? `${stats.done} respostas · ${Math.round((stats.correct / stats.done) * 100)}% de acertos` : 'Cadastre palavras ou volte quando houver cartas para revisar.'}
        </p>
        {stats.done > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              setStats({ done: 0, correct: 0 })
              setStarted(false)
            }}
          >
            <RotateCcw /> Reiniciar contagem
          </Button>
        )}
      </Card>
    )
  }

  const total = stats.done + queue.length
  const today = todayKey()
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Progress value={(stats.done / Math.max(1, total)) * 100} color="var(--brand)" />
        <span className="tabular shrink-0">{queue.length} restantes</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={current.id + stats.done} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
          <Card className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            {current.category && <span className="text-xs text-muted-foreground uppercase">{current.category}</span>}
            <p className="text-3xl font-semibold tracking-tight">{current.term}</p>
            {revealed ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                <p className="text-xl text-muted-foreground">{current.translation}</p>
                {current.example && <p className="text-sm text-muted-foreground italic">“{current.example}”</p>}
              </motion.div>
            ) : (
              <Button variant="outline" onClick={() => setRevealed(true)}>
                <Eye /> Mostrar resposta <kbd className="ml-1 rounded bg-muted px-1 text-[10px]">espaço</kbd>
              </Button>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
      {revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(REVIEW_RATINGS) as ReviewRating[]).map((r) => {
            const next = scheduleReview(current, r, today)
            return (
              <Button key={r} variant={r === 'again' ? 'destructive' : r === 'good' ? 'default' : 'outline'} className="h-auto flex-col gap-0.5 py-2.5" disabled={review.pending} onClick={() => answer(r)}>
                <span>{REVIEW_RATINGS[r].label}</span>
                <span className="text-[11px] font-normal opacity-75">
                  {intervalLabel(next.intervalDays)} · tecla {REVIEW_RATINGS[r].key}
                </span>
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
