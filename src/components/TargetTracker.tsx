import { Goal } from 'lucide-react'

import type { TargetRow } from '@/server/dashboard'
import { cn, formatDate, formatValue } from '@/lib/format'
import { StatusPill } from './StatusPill'

type TargetTrackerProps = {
  targets: TargetRow[]
}

function toneFor(status: string) {
  if (status === 'off_track') return 'high'
  if (status === 'watch') return 'medium'
  return 'fresh'
}

export function TargetTracker({ targets }: TargetTrackerProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Goal className="h-5 w-5 text-teal-700" />
        <h2 className="text-sm font-semibold text-zinc-950">Ministry Accountability</h2>
      </div>
      <div className="space-y-4">
        {targets.length === 0 ? (
          <p className="text-sm text-zinc-500">No targets mapped to this view.</p>
        ) : (
          targets.map((target) => (
            <article key={target.key} className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{target.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{target.ownerAgency}</p>
                </div>
                <StatusPill status={target.status.replace('_', ' ')} tone={toneFor(target.status)} />
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-100">
                <div
                  className={cn(
                    'h-2 rounded-full',
                    target.status === 'off_track' ? 'bg-red-500' : target.status === 'watch' ? 'bg-amber-500' : 'bg-teal-600',
                  )}
                  style={{ width: `${Math.min(100, target.progressPct)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-zinc-500">
                <div>
                  <p>Latest</p>
                  <p className="mt-1 font-semibold text-zinc-900">{formatValue(target.latestValue, target.unit)}</p>
                </div>
                <div>
                  <p>Target</p>
                  <p className="mt-1 font-semibold text-zinc-900">{formatValue(target.targetValue, target.unit)}</p>
                </div>
                <div>
                  <p>Deadline</p>
                  <p className="mt-1 font-semibold text-zinc-900">{formatDate(target.deadline)}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
