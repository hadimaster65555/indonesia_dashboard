import { AlertTriangle } from 'lucide-react'

import type { AlertRow } from '@/server/dashboard'
import { formatDateTime } from '@/lib/format'
import { StatusPill } from './StatusPill'

type AlertListProps = {
  alerts: AlertRow[]
}

export function AlertList({ alerts }: AlertListProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h2 className="text-sm font-semibold text-zinc-950">Command Alerts</h2>
      </div>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-zinc-500">No open alerts for this view.</p>
        ) : (
          alerts.map((alert) => (
            <article key={alert.key} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill
                  status={alert.severity}
                  tone={alert.severity === 'high' || alert.severity === 'critical' ? 'high' : 'medium'}
                />
                <span className="text-xs text-zinc-500">{formatDateTime(alert.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-900">{alert.metricLabel ?? 'Source health'}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{alert.explanation}</p>
              {alert.regionName ? <p className="mt-1 text-xs text-zinc-500">{alert.regionName}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  )
}
