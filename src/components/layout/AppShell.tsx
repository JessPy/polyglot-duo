import { Ellipsis, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { useActiveParticipant, useParticipants } from '@/hooks/useData'
import { LANGUAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUiStore, type ThemePreference } from '@/store/ui'
import { NAV_ITEMS } from './nav'

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground" aria-hidden>
        P²
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">Polyglot Duo</p>
        <p className="text-[11px] text-muted-foreground">Español × English</p>
      </div>
    </div>
  )
}

const themeOrder: ThemePreference[] = ['system', 'light', 'dark']
const themeMeta = { system: { icon: Monitor, label: 'Tema do sistema' }, light: { icon: Sun, label: 'Tema claro' }, dark: { icon: Moon, label: 'Tema escuro' } }

function ThemeToggle() {
  const { theme, setTheme } = useUiStore()
  const { icon: Icon, label } = themeMeta[theme]
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`${label} (clique para alternar)`} title={label} onClick={() => setTheme(themeOrder[(themeOrder.indexOf(theme) + 1) % 3])}>
      <Icon />
    </Button>
  )
}

/** Alternância entre perfis: define o participante padrão nos formulários e páginas individuais. */
function ProfileSwitcher({ compact }: { compact?: boolean }) {
  const participants = useParticipants()
  const active = useActiveParticipant(participants)
  const setActive = useUiStore((s) => s.setActiveParticipant)
  if (!participants?.length) return null
  return (
    <div className={cn('flex gap-1 rounded-lg bg-muted p-1', !compact && 'w-full')} role="radiogroup" aria-label="Perfil ativo">
      {participants.map((p) => (
        <button
          key={p.id}
          role="radio"
          aria-checked={active?.id === p.id}
          onClick={() => setActive(p.id)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-all',
            active?.id === p.id && 'bg-card text-foreground shadow-sm',
          )}
        >
          <span aria-hidden>{p.avatar}</span>
          <span className={cn('truncate', compact && 'max-sm:hidden')}>{p.name}</span>
          <span aria-hidden className="text-[10px]">{LANGUAGES[p.language].flag}</span>
        </button>
      ))}
    </div>
  )
}

function SidebarLink({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isActive && 'bg-muted text-foreground',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </NavLink>
  )
}

export function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const participants = useParticipants()
  const active = useActiveParticipant(participants)
  const mobileItems = NAV_ITEMS.filter((i) => i.mobile)
  const moreActive = !mobileItems.some((i) => (i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)))

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card/60 p-4 backdrop-blur lg:flex">
        <Logo />
        <div className="mt-5">
          <ProfileSwitcher />
        </div>
        <nav className="mt-5 flex flex-1 flex-col gap-0.5" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">Dados salvos neste navegador</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Cabeçalho (mobile/tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          {active && <ParticipantAvatar participant={active} size="sm" />}
          <span className="font-semibold tracking-tight">Polyglot Duo</span>
        </div>
        <div className="flex items-center gap-1">
          <ProfileSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <main id="conteudo" className="px-4 pt-5 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 backdrop-blur lg:hidden" aria-label="Navegação rápida">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {mobileItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground', isActive && 'text-foreground')}
            >
              <Icon className="size-5" aria-hidden />
              <span className="max-w-full truncate px-1">{label.replace(' Studio', '')}</span>
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground', moreActive && 'text-foreground')}>
            <Ellipsis className="size-5" aria-hidden />
            Mais
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogTitle>Todas as páginas</DialogTitle>
          <DialogDescription className="sr-only">Navegue para qualquer página do app</DialogDescription>
          <div className="grid grid-cols-3 gap-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors hover:bg-muted', isActive && 'border-foreground/30 bg-muted')
                }
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
