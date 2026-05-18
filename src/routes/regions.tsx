import { createFileRoute } from '@tanstack/react-router'

import { AlertList } from '@/components/AlertList'
import { RegionalMap } from '@/components/RegionalMap'
import { TargetTracker } from '@/components/TargetTracker'
import { getRegionsData } from '@/server/dashboard'

export const Route = createFileRoute('/regions')({
  loader: async () => await getRegionsData(),
  component: RegionsRoute,
})

function RegionsRoute() {
  const data = Route.useLoaderData()
  return (
    <div className="space-y-6">
      <section className="border-b border-zinc-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Regions</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950">Intervention Ranking</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Province scorecards combine poverty, stunting, budget absorption, disaster exposure, and education or labor signals.
        </p>
      </section>
      <RegionalMap regions={data.regions} />
      <section className="grid gap-4 xl:grid-cols-2">
        <AlertList alerts={data.alerts} />
        <TargetTracker targets={data.targets} />
      </section>
    </div>
  )
}
