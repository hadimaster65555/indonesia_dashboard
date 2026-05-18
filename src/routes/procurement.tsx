import { createFileRoute } from '@tanstack/react-router'

import { DomainDashboard } from '@/components/DomainDashboard'
import { getDomainData } from '@/server/dashboard'

export const Route = createFileRoute('/procurement')({
  loader: async () => await getDomainData({ data: 'procurement' }),
  component: ProcurementRoute,
})

function ProcurementRoute() {
  const data = Route.useLoaderData()
  return (
    <DomainDashboard
      title="Procurement"
      description="Tender volume, award value, single-bid risk, delayed packages, and supplier concentration."
      data={data}
    />
  )
}
