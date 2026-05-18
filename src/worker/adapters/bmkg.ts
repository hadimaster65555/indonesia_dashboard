import { fetchSnapshot, parseJsonBody, periodFromNow, toNumber } from '../utils'
import type { IngestionAdapter, NormalizedObservation } from '../types'

function findNumber(payload: unknown, keys: string[]): number | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  for (const [key, value] of Object.entries(payload)) {
    if (keys.includes(key)) {
      const parsed = toNumber(value)
      if (parsed !== null) {
        return parsed
      }
      if (Array.isArray(value)) {
        return value.length
      }
    }

    if (value && typeof value === 'object') {
      const nested = findNumber(value, keys)
      if (nested !== null) {
        return nested
      }
    }
  }

  return null
}

export function parseBmkgPayload(payload: unknown, now: Date): NormalizedObservation[] {
  const period = periodFromNow(now)
  const warnings = findNumber(payload, ['warningCount', 'warning_count', 'warnings', 'peringatan'])
  const earthquakes = findNumber(payload, ['earthquakeCount', 'earthquake_count', 'earthquakes', 'gempa'])
  const observations: NormalizedObservation[] = []

  if (warnings !== null) {
    observations.push({
      metricKey: 'weather_warning_count',
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value: warnings,
      unit: 'warnings',
      qualityFlag: 'official',
    })
  }

  if (earthquakes !== null) {
    observations.push({
      metricKey: 'earthquake_count',
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value: earthquakes,
      unit: 'events',
      qualityFlag: 'official',
    })
  }

  return observations
}

export const bmkgWeatherAdapter: IngestionAdapter = {
  key: 'bmkg-weather',
  cron: '0 */3 * * *',
  description: 'BMKG weather warnings and earthquake summary.',
  async run(context) {
    const snapshot = await fetchSnapshot(context.fetch, context.source.key, context.source.url, context.now)
    const payload = parseJsonBody(snapshot.rawBody)

    return {
      snapshots: [snapshot],
      observations: parseBmkgPayload(payload, context.now),
      metadata: {
        parser: 'bmkg-weather',
        rateLimit: '60 requests/minute/IP',
      },
    }
  },
}
