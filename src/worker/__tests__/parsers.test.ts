import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseBmkgPayload } from '../adapters/bmkg'
import { parseObservationCsv } from '../adapters/fileDownload'
import { parseJisdorHtml, parseKemenkeuHtml } from '../adapters/htmlTable'
import { parseCkanPayload } from '../adapters/ckan'
import { parseIndonesianDate, toNumber } from '../utils'

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

function fixture(name: string) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8')
}

describe('ingestion parsers', () => {
  it('normalizes Indonesian numeric and date formats', () => {
    expect(toNumber('16.310,00')).toBe(16310)
    expect(toNumber('1,250.5')).toBe(1250.5)
    expect(toNumber('29,7%')).toBe(29.7)
    expect(parseIndonesianDate('17 Mei 2026')?.toISOString().slice(0, 10)).toBe('2026-05-17')
  })

  it('parses BI JISDOR HTML rows', () => {
    const observations = parseJisdorHtml(fixture('bi-jisdor.html'), new Date('2026-05-17T03:00:00.000Z'))
    expect(observations).toHaveLength(1)
    expect(observations[0]).toMatchObject({
      metricKey: 'usd_idr_jisdor',
      periodStart: '2026-05-17',
      value: 16310,
      unit: 'IDR/USD',
    })
  })

  it('parses Kemenkeu APBN realization rows', () => {
    const observations = parseKemenkeuHtml(
      fixture('kemenkeu-apbn.html'),
      new Date('2026-04-17T03:00:00.000Z'),
    )
    expect(observations.map((item) => item.metricKey)).toEqual([
      'apbn_revenue_realization',
      'apbn_spending_realization',
      'deficit_to_gdp',
    ])
    expect(observations[2].value).toBe(-0.8)
  })

  it('parses file/download CSV observations', () => {
    const observations = parseObservationCsv(
      fixture('satu-data-priority.csv'),
      new Date('2026-04-17T03:00:00.000Z'),
    )
    expect(observations).toHaveLength(2)
    expect(observations[0]).toMatchObject({
      metricKey: 'stunting_prevalence',
      value: 19.6,
    })
  })

  it('parses BMKG JSON summaries', () => {
    const observations = parseBmkgPayload(
      JSON.parse(fixture('bmkg-weather.json')),
      new Date('2026-05-17T03:00:00.000Z'),
    )
    expect(observations.map((item) => [item.metricKey, item.value])).toEqual([
      ['weather_warning_count', 7],
      ['earthquake_count', 3],
    ])
  })

  it('parses CKAN package search payloads', () => {
    const observations = parseCkanPayload(
      JSON.parse(fixture('bnpb-ckan.json')),
      new Date('2026-05-17T03:00:00.000Z'),
      'disaster_incidents',
      'incidents',
    )
    expect(observations[0]).toMatchObject({
      metricKey: 'disaster_incidents',
      value: 42,
    })
  })
})
