import { createFileRoute } from '@tanstack/react-router'

import { DomainDashboard } from '@/components/DomainDashboard'
import { getDomainData } from '@/server/dashboard'

export const Route = createFileRoute('/people')({
  loader: async () => await getDomainData({ data: 'people' }),
  component: PeopleRoute,
})

function PeopleRoute() {
  const data = Route.useLoaderData()
  return (
    <DomainDashboard
      title="People"
      description="Poverty, inequality, stunting, education completion, and labor market outcomes."
      data={data}
    />
  )
}
