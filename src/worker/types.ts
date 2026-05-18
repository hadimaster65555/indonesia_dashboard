import type { DataSource } from '@/db/schema'

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export type NormalizedObservation = {
  metricKey: string
  geographyCode: string
  periodStart: string
  periodEnd: string
  value: number
  unit: string
  qualityFlag?: string
}

export type SnapshotPayload = {
  sourceKey: string
  fetchedAt: string
  period?: string
  url: string
  contentType: string
  rawBody: string
  hash: string
}

export type AdapterResult = {
  snapshots: SnapshotPayload[]
  observations: NormalizedObservation[]
  metadata?: Record<string, unknown>
}

export type AdapterContext = {
  source: DataSource
  now: Date
  fetch: FetchLike
}

export type IngestionAdapter = {
  key: string
  cron: string
  description: string
  run: (context: AdapterContext) => Promise<AdapterResult>
}

export type IngestionSummary = {
  sourceKey: string
  runId: number
  status: 'success' | 'failed' | 'skipped'
  rowsInserted: number
  checksum?: string
  errorMessage?: string
}
