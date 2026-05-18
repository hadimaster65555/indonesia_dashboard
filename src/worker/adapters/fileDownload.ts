import { fetchSnapshot, periodFromNow, toNumber } from '../utils'
import type { IngestionAdapter, NormalizedObservation } from '../types'

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

export function parseObservationCsv(csv: string, now: Date): NormalizedObservation[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const period = periodFromNow(now)

  return lines.slice(1).flatMap((line) => {
    const cells = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
    const value = toNumber(row.value)
    if (!row.metric_key || value === null) {
      return []
    }

    return [
      {
        metricKey: row.metric_key,
        geographyCode: row.geography_code || 'ID',
        periodStart: row.period_start || period.start,
        periodEnd: row.period_end || period.end,
        value,
        unit: row.unit || 'value',
        qualityFlag: row.quality_flag || 'official',
      },
    ]
  })
}

export function createFileDownloadAdapter(
  key: string,
  cron: string,
  description: string,
  fallbackMetric: { metricKey: string; unit: string },
): IngestionAdapter {
  return {
    key,
    cron,
    description,
    async run(context) {
      const snapshot = await fetchSnapshot(context.fetch, context.source.key, context.source.url, context.now)
      const observations = parseObservationCsv(snapshot.rawBody, context.now)
      const period = periodFromNow(context.now)

      return {
        snapshots: [snapshot],
        observations:
          observations.length > 0
            ? observations
            : [
                {
                  metricKey: fallbackMetric.metricKey,
                  geographyCode: 'ID',
                  periodStart: period.start,
                  periodEnd: period.end,
                  value: 0,
                  unit: fallbackMetric.unit,
                  qualityFlag: 'metadata_only',
                },
              ],
        metadata: { parser: 'file-download' },
      }
    },
  }
}

export const satuDataPriorityAdapter = createFileDownloadAdapter(
  'satu-data-priority',
  '0 8 * * 1',
  'Weekly Satu Data priority CSV/download parser.',
  { metricKey: 'stunting_prevalence', unit: '% children' },
)

export const biSekiAdapter = createFileDownloadAdapter(
  'bi-seki',
  '30 7 * * *',
  'Bank Indonesia SEKI/SSKI/SULNI download parser.',
  { metricKey: 'foreign_reserves', unit: 'USD bn' },
)
