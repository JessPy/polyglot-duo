import type * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Moldura padrão de gráficos: título, legenda (sempre presente para 2+ séries) e área responsiva. */
export function ChartCard({ title, description, legend, children, className, action }: { title: string; description?: string; legend?: { label: string; color: string }[]; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {legend && legend.length > 1 && (
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-3 rounded-sm" style={{ background: l.color }} />
                {l.label}
              </li>
            ))}
          </ul>
        )}
        <div className="h-56 w-full">{children}</div>
      </CardContent>
    </Card>
  )
}

export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const gridProps = { stroke: 'var(--chart-grid)', strokeDasharray: '0', vertical: false } as const

interface TooltipPayload {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

/** Tooltip com tokens de texto (a cor fica só no marcador). */
export function ChartTooltip({ active, payload, label, unit = '', labelFormatter }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; unit?: string; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{labelFormatter ? labelFormatter(String(label)) : label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular font-medium text-foreground">{typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}
