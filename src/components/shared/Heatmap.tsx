import { useEffect, useRef } from 'react'
import { addDays, formatLong, startOfWeek, todayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateKey } from '@/types'

/**
 * Heatmap de consistência no estilo GitHub. Uma cor (a do participante),
 * intensidade proporcional aos minutos estudados no dia.
 */
export function Heatmap({ minutesByDay, color, weeks = 26, label, end = todayKey() }: { minutesByDay: Map<DateKey, number>; color: string; weeks?: number; label: string; end?: DateKey }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Em telas estreitas, mostra primeiro as semanas mais recentes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [weeks, end])
  const lastWeekStart = startOfWeek(end)
  const first = addDays(lastWeekStart, -7 * (weeks - 1))
  const columns: DateKey[][] = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)))
  const level = (m: number) => (m <= 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4)
  const opacity = [0, 0.3, 0.5, 0.75, 1]

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="sr-only">{label}</figcaption>
      <div ref={scrollRef} className="scrollbar-none flex gap-[3px] overflow-x-auto pb-1" role="grid" aria-label={label}>
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]" role="row">
            {col.map((d) => {
              const m = minutesByDay.get(d) ?? 0
              const future = d > end
              return (
                <div
                  key={d}
                  role="gridcell"
                  title={future ? undefined : `${formatLong(d)}: ${Math.round(m)} min`}
                  aria-label={future ? undefined : `${formatLong(d)}: ${Math.round(m)} minutos`}
                  className={cn('size-3 rounded-[3px] bg-muted', future && 'opacity-30')}
                  style={level(m) ? { background: `color-mix(in oklab, ${color} ${opacity[level(m)] * 100}%, var(--muted))` } : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        Menos
        {opacity.map((o, i) => (
          <span key={i} className="size-3 rounded-[3px] bg-muted" style={i ? { background: `color-mix(in oklab, ${color} ${o * 100}%, var(--muted))` } : undefined} />
        ))}
        Mais
      </div>
    </figure>
  )
}
