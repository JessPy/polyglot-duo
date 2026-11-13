import { X } from 'lucide-react'
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const overlay = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
const content =
  'fixed z-50 flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto border bg-card p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
  'bottom-0 left-0 rounded-t-2xl data-[state=open]:slide-in-from-bottom-8 ' +
  'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95'

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content className={cn(content, 'pb-[max(1.25rem,env(safe-area-inset-bottom))]', className)} {...props}>
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => unknown
  children?: React.ReactNode
  confirmDisabled?: boolean
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', destructive, onConfirm, children, confirmDisabled }: ConfirmDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className={cn(content, 'pb-[max(1.25rem,env(safe-area-inset-bottom))]')}>
          <div className="flex flex-col gap-1">
            <AlertPrimitive.Title className="text-lg font-semibold">{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description className="text-sm text-muted-foreground">{description}</AlertPrimitive.Description>
          </div>
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              disabled={confirmDisabled}
              onClick={async () => {
                await onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  )
}
