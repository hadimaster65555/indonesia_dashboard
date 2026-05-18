import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react'

import { cn } from '@/lib/format'

type StatusPillProps = {
  status: string
  tone?: 'fresh' | 'stale' | 'error' | 'missing' | 'high' | 'medium' | 'low' | 'neutral'
}

const toneClass: Record<NonNullable<StatusPillProps['tone']>, string> = {
  fresh: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  stale: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  missing: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  high: 'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-sky-200 bg-sky-50 text-sky-800',
  neutral: 'border-zinc-200 bg-white text-zinc-700',
}

function Icon({ tone }: { tone: NonNullable<StatusPillProps['tone']> }) {
  if (tone === 'fresh') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (tone === 'error' || tone === 'high') return <XCircle className="h-3.5 w-3.5" />
  if (tone === 'stale' || tone === 'medium') return <AlertTriangle className="h-3.5 w-3.5" />
  return <Clock3 className="h-3.5 w-3.5" />
}

export function StatusPill({ status, tone = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        toneClass[tone],
      )}
    >
      <Icon tone={tone} />
      {status}
    </span>
  )
}
