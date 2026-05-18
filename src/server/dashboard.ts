import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import type { Domain } from './dashboard-data'

export type {
  AlertRow,
  Domain,
  DomainData,
  MetricCard,
  MetricPoint,
  RegionalPriorityRow,
  SourceHealthRow,
  TargetRow,
} from './dashboard-data'

const domainSchema = z.enum(['economy', 'budget', 'procurement', 'people', 'disaster'])

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadDashboardData } = await import('./dashboard-data')
  return loadDashboardData()
})

export const getDomainData = createServerFn({ method: 'GET' })
  .inputValidator((domain: Domain) => domainSchema.parse(domain))
  .handler(async ({ data }) => {
    const { loadDomainData } = await import('./dashboard-data')
    return loadDomainData(data)
  })

export const getRegionsData = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadRegionsData } = await import('./dashboard-data')
  return loadRegionsData()
})

export const getSourceHealthData = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadSourceHealthData } = await import('./dashboard-data')
  return loadSourceHealthData()
})
