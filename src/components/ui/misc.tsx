import { Slider as SliderPrimitive, Switch as SwitchPrimitive, Tabs as TabsPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, variant = 'default', ...props }: React.ComponentProps<'span'> & { variant?: 'default' | 'outline' | 'brand' | 'success' | 'warning' }) {
  const styles = {
    default: 'bg-secondary text-secondary-foreground',
    outline: 'border text-muted-foreground',
    brand: 'bg-accent text-accent-foreground',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/12 text-warning',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', styles[variant], className)} {...props} />
}

export function Progress({ value, className, color }: { value: number; className?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />
}

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('scrollbar-none inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-4 outline-none', className)} {...props} />
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn('relative flex w-full touch-none items-center select-none py-2', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-brand" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-5 rounded-full border-2 border-brand bg-card shadow transition focus-visible:outline-2 focus-visible:outline-ring" aria-label={props['aria-label']} />
    </SliderPrimitive.Root>
  )
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn('peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-input transition-colors data-[state=checked]:bg-brand', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  )
}

/** Grupo de botões segmentados (para filtros de período etc.). */
export function Segmented<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('scrollbar-none inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all',
            value === o.value && 'bg-card text-foreground shadow-sm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
