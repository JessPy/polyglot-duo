import { ChevronLeft, ChevronRight } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { addDays, formatMonth, fromDateKey, startOfWeek, toDateKey, todayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateKey } from '@/types'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export function shiftMonth(month: DateKey, delta: number): DateKey {
  const d = fromDateKey(month)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export function firstOfMonth(key: DateKey = todayKey()): DateKey {
  return key.slice(0, 8) + '01'
}

/** Grade mensal (segunda a domingo) com navegação entre meses. */
export function MonthGrid({
  month,
  onMonthChange,
  selected,
  onSelect,
  renderDay,
}: {
  month: DateKey
  onMonthChange: (m: DateKey) => void
  selected?: DateKey
  onSelect?: (d: DateKey) => void
  renderDay: (d: DateKey) => React.ReactNode
}) {
  const start = startOfWeek(month)
  const monthPrefix = month.slice(0, 7)
  const today = todayKey()
  const days: DateKey[] = []
  for (let d = start; days.length < 42; d = addDays(d, 1)) days.push(d)
  const rows = days[35].slice(0, 7) === monthPrefix ? 6 : 5

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{formatMonth(month)}</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Mês anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(firstOfMonth())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Próximo mês" onClick={() => onMonthChange(shiftMonth(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground uppercase">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.slice(0, rows * 7).map((d) => {
          const inMonth = d.slice(0, 7) === monthPrefix
          return (
            <button
              key={d}
              onClick={() => onSelect?.(d)}
              aria-pressed={selected === d}
              aria-label={d}
              className={cn(
                'flex min-h-14 flex-col items-stretch gap-1 rounded-lg border border-transparent p-1 text-left transition hover:bg-muted sm:min-h-20 sm:p-1.5',
                !inMonth && 'opacity-35',
                selected === d && 'border-foreground/40 bg-muted',
              )}
            >
              <span className={cn('tabular flex size-6 items-center justify-center rounded-full text-xs', d === today && 'bg-primary font-semibold text-primary-foreground')}>{Number(d.slice(8))}</span>
              {renderDay(d)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
