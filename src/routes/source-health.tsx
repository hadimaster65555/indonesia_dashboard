import { createFileRoute } from '@tanstack/react-router'

import { AlertList } from '@/components/AlertList'
import { SourceHealthTable } from '@/components/SourceHealthTable'
import { getSourceHealthData } from '@/server/dashboard'

export const Route = createFileRoute('/source-health')({
  loader: async () => await getSourceHealthData(),
  component: SourceHealthRoute,
})

function SourceHealthRoute() {
  const data = Route.useLoaderData()
  return (
    <div className="space-y-6">
      <section className="border-b border-zinc-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Source Health</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950">Ingestion Runs and Freshness SLA</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Last run status, parser type, rows inserted, stale-source detection, duplicate checksums, and official attribution links.
        </p>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SourceHealthTable sources={data.sources} />
        <AlertList alerts={data.alerts} />
      </section>
    </div>
  )
}
