import { BookOpen, CalendarDays, ChartLine, Dices, Gift, LayoutDashboard, Mic, NotebookPen, Settings, Swords, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  mobile?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/estudos', label: 'Estudos', icon: NotebookPen, mobile: true },
  { to: '/vocabulario', label: 'Vocabulário', icon: BookOpen, mobile: true },
  { to: '/desafios', label: 'Desafios', icon: Dices },
  { to: '/speaking', label: 'Speaking Studio', icon: Mic, mobile: true },
  { to: '/battle', label: 'Sunday Battle', icon: Swords },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/recompensas', label: 'Recompensas', icon: Gift },
  { to: '/analytics', label: 'Analytics', icon: ChartLine },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]
