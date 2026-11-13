import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/misc'

export function PageHeader({ title, description, actions, icon: Icon }: { title: string; description?: string; actions?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          {Icon && <Icon className="size-6 text-muted-foreground" aria-hidden />}
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}

export function StatTile({ label, value, hint, icon: Icon, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border bg-card p-4', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </div>
      <div className="tabular text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">{children}</h2>
      {action}
    </div>
  )
}
