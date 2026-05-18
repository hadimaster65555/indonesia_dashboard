import { AlertList } from './AlertList'
import { MetricCard } from './MetricCard'
import { SourceHealthTable } from './SourceHealthTable'
import { TargetTracker } from './TargetTracker'
import { TrendChart } from './TrendChart'
import type { Domain, DomainData } from '@/server/dashboard'

type DomainDashboardProps = {
  title: string
  description: string
  data: DomainData
}

const domainColor: Record<Domain, string> = {
  economy: '#0f766e',
  budget: '#b45309',
  procurement: '#4f46e5',
  people: '#be123c',
  disaster: '#0369a1',
}

export function DomainDashboard({ title, description, data }: DomainDashboardProps) {
  const charts = data.cards.slice(0, 3)

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-3 border-b border-zinc-200 pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Dashboard</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{description}</p>
        </div>
        <span className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600">
          {data.cards.length} metrics
        </span>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((metric) => (
          <MetricCard key={metric.metricKey} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {charts.map((metric) => (
          <TrendChart
            key={metric.metricKey}
            title={metric.label}
            points={data.series[metric.metricKey] ?? []}
            color={domainColor[data.domain]}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <SourceHealthTable sources={data.sourceHealth} />
        </div>
        <div className="space-y-4">
          <AlertList alerts={data.alerts} />
          <TargetTracker targets={data.targets} />
        </div>
      </section>
    </div>
  )
}
