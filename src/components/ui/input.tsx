import type * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base md:text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 aria-invalid:border-destructive'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(base, 'h-10 py-2 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium', className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'min-h-20 py-2', className)} {...props} />
}

/** Select nativo estilizado: melhor experiência no celular e acessível por padrão. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(base, 'h-10 appearance-none py-2 pr-9', className)} {...props}>
        {children}
      </select>
      <svg aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium leading-none', className)} {...props} />
}

interface FieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
