import type { ColumnDef } from '@tanstack/react-table'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Clock3 } from 'lucide-react'

import { AlertList } from '@/components/AlertList'
import { DataTable } from '@/components/DataTable'
import { MetricCard } from '@/components/MetricCard'
import { RegionalMap } from '@/components/RegionalMap'
import { SourceHealthTable } from '@/components/SourceHealthTable'
import { StatusPill } from '@/components/StatusPill'
import { TargetTracker } from '@/components/TargetTracker'
import { TrendChart } from '@/components/TrendChart'
import type { MetricCard as MetricCardData } from '@/server/dashboard'
import { getDashboardData } from '@/server/dashboard'
import { formatDateTime, formatDelta, formatValue } from '@/lib/format'

export const Route = createFileRoute('/')({
  loader: async () => await getDashboardData(),
  component: DailyBrief,
})

const movementColumns: ColumnDef<MetricCardData>[] = [
  {
    accessorKey: 'label',
    header: 'Metric',
    cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.label}</span>,
  },
  {
    accessorKey: 'latest',
    header: 'Latest',
    cell: ({ row }) => formatValue(row.original.latest, row.original.unit),
  },
  {
    accessorKey: 'delta',
    header: 'Move',
    cell: ({ row }) => formatDelta(row.original.delta, row.original.unit),
  },
  {
    accessorKey: 'sourceName',
    header: 'Source',
    cell: ({ row }) => row.original.sourceName,
  },
]

function DailyBrief() {
  const data = Route.useLoaderData()
  const firstChart = data.keyCards[0]
  const secondChart = data.keyCards[1]

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Daily Brief</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">National Signals and Required Attention</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Current alerts, source freshness, top metric movements, regional intervention ranking, and
            target accountability from the local SQLite warehouse.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
            <Clock3 className="h-4 w-4 text-teal-700" />
            Generated {formatDateTime(data.generatedAt)}
          </span>
          <StatusPill status={`${data.healthCounts.fresh} fresh`} tone="fresh" />
          <StatusPill status={`${data.healthCounts.stale} stale`} tone="stale" />
          <StatusPill status={`${data.healthCounts.error} errors`} tone="error" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.keyCards.map((metric) => (
          <MetricCard key={metric.metricKey} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4 lg:grid-cols-2">
          {firstChart ? (
            <TrendChart title={firstChart.label} points={data.series[firstChart.metricKey] ?? []} color="#0f766e" />
          ) : null}
          {secondChart ? (
            <TrendChart title={secondChart.label} points={data.series[secondChart.metricKey] ?? []} color="#b45309" />
          ) : null}
        </div>
        <AlertList alerts={data.alerts} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-950">What Changed Since Previous Period</h2>
            <Link to="/source-health" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700">
              Source health
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable data={data.movements} columns={movementColumns} emptyLabel="No movements available" />
        </div>
        <TargetTracker targets={data.targets} />
      </section>

      <RegionalMap regions={data.regionalPriority} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-950">Freshness Watchlist</h2>
          <Link to="/source-health" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700">
            All sources
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <SourceHealthTable sources={data.sourceHealth} />
      </section>
    </div>
  )
}
