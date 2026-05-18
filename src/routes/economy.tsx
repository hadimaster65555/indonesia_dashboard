import { createFileRoute } from '@tanstack/react-router'

import { DomainDashboard } from '@/components/DomainDashboard'
import { getDomainData } from '@/server/dashboard'

export const Route = createFileRoute('/economy')({
  loader: async () => await getDomainData({ data: 'economy' }),
  component: EconomyRoute,
})

function EconomyRoute() {
  const data = Route.useLoaderData()
  return (
    <DomainDashboard
      title="Economy"
      description="GDP, inflation, labor, rupiah pressure, policy rate, reserves, and external benchmark freshness."
      data={data}
    />
  )
}
