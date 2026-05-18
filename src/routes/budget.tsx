import { createFileRoute } from '@tanstack/react-router'

import { DomainDashboard } from '@/components/DomainDashboard'
import { getDomainData } from '@/server/dashboard'

export const Route = createFileRoute('/budget')({
  loader: async () => await getDomainData({ data: 'budget' }),
  component: BudgetRoute,
})

function BudgetRoute() {
  const data = Route.useLoaderData()
  return (
    <DomainDashboard
      title="Budget"
      description="APBN revenue, spending realization, deficit pressure, and ministry burn-rate accountability."
      data={data}
    />
  )
}
