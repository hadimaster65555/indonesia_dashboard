import { fetchSnapshot, parseJsonBody, periodFromNow, toNumber } from '../utils'
import type { AdapterContext, IngestionAdapter, NormalizedObservation } from '../types'

type CkanOptions = {
  key: string
  cron: string
  description: string
  metricKey: string
  unit: string
  endpointPath?: string
  valueFromPayload?: (payload: unknown) => number | null
}

function ckanEndpoint(context: AdapterContext, endpointPath = '/api/3/action/package_search?rows=25') {
  const base = context.source.url.replace(/\/api\/3\/?$/, '').replace(/\/$/, '')
  return `${base}${endpointPath}`
}

function recordsFromPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const result = 'result' in payload ? (payload as { result?: unknown }).result : payload
  if (!result || typeof result !== 'object') {
    return []
  }
  const maybeRecords = result as { records?: unknown; results?: unknown; packages?: unknown }
  for (const value of [maybeRecords.records, maybeRecords.results, maybeRecords.packages]) {
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

function defaultCkanValue(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const result = 'result' in payload ? (payload as { result?: unknown }).result : payload
  if (result && typeof result === 'object' && 'count' in result) {
    return toNumber((result as { count?: unknown }).count)
  }

  return recordsFromPayload(payload).length
}

function sumRecordFields(payload: unknown, fields: string[], divisor = 1) {
  const total = recordsFromPayload(payload).reduce<number>((sum, record) => {
    if (!record || typeof record !== 'object') {
      return sum
    }

    for (const field of fields) {
      const value = toNumber((record as Record<string, unknown>)[field])
      if (value !== null) {
        return sum + value
      }
    }

    return sum
  }, 0)

  return total > 0 ? total / divisor : null
}

export function parseCkanPayload(
  payload: unknown,
  now: Date,
  metricKey: string,
  unit: string,
  valueFromPayload: (payload: unknown) => number | null = defaultCkanValue,
): NormalizedObservation[] {
  const value = valueFromPayload(payload)
  if (value === null) {
    return []
  }

  const period = periodFromNow(now)
  return [
    {
      metricKey,
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value,
      unit,
      qualityFlag: 'official',
    },
  ]
}

export function createCkanAdapter(options: CkanOptions): IngestionAdapter {
  return {
    key: options.key,
    cron: options.cron,
    description: options.description,
    async run(context) {
      const snapshot = await fetchSnapshot(
        context.fetch,
        context.source.key,
        ckanEndpoint(context, options.endpointPath),
        context.now,
      )
      const payload = parseJsonBody(snapshot.rawBody)
      return {
        snapshots: [snapshot],
        observations: parseCkanPayload(
          payload,
          context.now,
          options.metricKey,
          options.unit,
          options.valueFromPayload,
        ),
        metadata: {
          parser: 'ckan',
          resultCount: defaultCkanValue(payload),
        },
      }
    },
  }
}

export const lkppCkanAdapter = createCkanAdapter({
  key: 'lkpp-ckan',
  cron: '15 6 * * *',
  description: 'LKPP CKAN procurement package metadata and value summary.',
  metricKey: 'procurement_award_value',
  unit: 'IDR tn',
  valueFromPayload: (payload) =>
    sumRecordFields(payload, ['award_value', 'nilai_kontrak', 'nilai_pagu', 'pagu'], 1_000_000_000_000) ??
    defaultCkanValue(payload),
})

export const bnpbCkanAdapter = createCkanAdapter({
  key: 'bnpb-ckan',
  cron: '45 6 * * *',
  description: 'BNPB CKAN disaster incident package count.',
  metricKey: 'disaster_incidents',
  unit: 'incidents',
})
