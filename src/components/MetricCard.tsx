import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import type { MetricCard as MetricCardData } from '@/server/dashboard'
import { cn, formatDate, formatDelta, formatValue } from '@/lib/format'

type MetricCardProps = {
  metric: MetricCardData
}

export function MetricCard({ metric }: MetricCardProps) {
  const movementTone =
    metric.delta === null ? 'neutral' : metric.delta > 0 ? 'up' : metric.delta < 0 ? 'down' : 'flat'
  const Icon = movementTone === 'up' ? ArrowUpRight : movementTone === 'down' ? ArrowDownRight : Minus

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{metric.domain}</p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">{metric.label}</h3>
        </div>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full',
            movementTone === 'up' && 'bg-amber-50 text-amber-700',
            movementTone === 'down' && 'bg-emerald-50 text-emerald-700',
            movementTone === 'flat' && 'bg-zinc-100 text-zinc-600',
            movementTone === 'neutral' && 'bg-sky-50 text-sky-700',
          )}
          title="Latest movement"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-semibold text-zinc-950">{formatValue(metric.latest, metric.unit)}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {formatDelta(metric.delta, metric.unit)} since previous period
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        <span>{formatDate(metric.periodEnd)}</span>
        <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-700">
          {metric.sourceName}
        </a>
      </div>
    </article>
  )
}
