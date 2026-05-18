import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  Banknote,
  BarChart3,
  CloudLightning,
  DatabaseZap,
  HandCoins,
  HeartPulse,
  Map,
  ShieldAlert,
} from 'lucide-react'

import { cn } from '@/lib/format'

type AppShellProps = {
  children: ReactNode
}

const navItems = [
  { to: '/', label: 'Daily Brief', icon: ShieldAlert },
  { to: '/economy', label: 'Economy', icon: BarChart3 },
  { to: '/budget', label: 'Budget', icon: Banknote },
  { to: '/procurement', label: 'Procurement', icon: HandCoins },
  { to: '/people', label: 'People', icon: HeartPulse },
  { to: '/regions', label: 'Regions', icon: Map },
  { to: '/disaster-climate', label: 'Disaster & Climate', icon: CloudLightning },
  { to: '/source-health', label: 'Source Health', icon: DatabaseZap },
] as const

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-white/95 px-4 py-5 lg:block">
        <div className="mb-7 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-950">Indonesia</p>
            <p className="text-xs text-zinc-500">Governance Dashboard</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              activeProps={{
                className: 'bg-teal-50 text-teal-900',
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Official-source v1</p>
              <h1 className="text-lg font-semibold text-zinc-950">Presidential Governance Console</h1>
            </div>
            <div className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 sm:flex">
              <DatabaseZap className="h-4 w-4 text-teal-700" />
              SQLite WAL
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-4 py-2 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-zinc-600"
                activeProps={{ className: 'bg-teal-50 text-teal-900' }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8')}>{children}</main>
      </div>
    </div>
  )
}
