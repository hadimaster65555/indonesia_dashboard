import crypto from 'node:crypto'

import type { FetchLike, SnapshotPayload } from './types'

const indonesianMonths: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function toDateOnly(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const parsed = parseIndonesianDate(value) ?? new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }
  return parsed.toISOString().slice(0, 10)
}

export function monthBounds(date: Date | string) {
  const source = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(source.getTime())) {
    throw new Error(`Invalid month date: ${date}`)
  }
  const start = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1))
  const end = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function parseIndonesianDate(value: string) {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
  if (!match) {
    return null
  }

  const [, day, monthName, year] = match
  const month = indonesianMonths[monthName]
  if (!month) {
    return null
  }

  return new Date(`${year}-${month}-${day.padStart(2, '0')}T00:00:00.000Z`)
}

export function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/(?!^)-/g, '')
    .trim()

  if (!cleaned) {
    return null
  }

  let normalized = cleaned
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const decimals = cleaned.length - lastComma - 1
    normalized = decimals > 0 && decimals <= 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '')
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchSnapshot(
  fetcher: FetchLike,
  sourceKey: string,
  url: string,
  now: Date,
  init?: RequestInit,
): Promise<SnapshotPayload> {
  const response = await fetcher(url, {
    headers: {
      accept: 'application/json,text/html,text/csv,text/plain;q=0.9,*/*;q=0.8',
      'user-agent': 'indonesia-governance-dashboard/0.1',
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`)
  }

  const rawBody = await response.text()
  return {
    sourceKey,
    fetchedAt: now.toISOString(),
    url,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    rawBody,
    hash: sha256(rawBody),
  }
}

export function parseJsonBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown
  } catch (error) {
    throw new Error(`Response was not valid JSON: ${(error as Error).message}`)
  }
}

export function periodFromNow(now: Date) {
  return monthBounds(now)
}
