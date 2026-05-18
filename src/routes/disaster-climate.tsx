import { createFileRoute } from '@tanstack/react-router'

import { DomainDashboard } from '@/components/DomainDashboard'
import { getDomainData } from '@/server/dashboard'

export const Route = createFileRoute('/disaster-climate')({
  loader: async () => await getDomainData({ data: 'disaster' }),
  component: DisasterClimateRoute,
})

function DisasterClimateRoute() {
  const data = Route.useLoaderData()
  return (
    <DomainDashboard
      title="Disaster & Climate"
      description="BMKG weather warnings, earthquake signals, BNPB incidents, and affected-population tracking."
      data={data}
    />
  )
}
