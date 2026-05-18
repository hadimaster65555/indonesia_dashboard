import * as cheerio from 'cheerio'

import { fetchSnapshot, monthBounds, periodFromNow, toDateOnly, toNumber } from '../utils'
import type { IngestionAdapter, NormalizedObservation } from '../types'

function tableRows(html: string) {
  const $ = cheerio.load(html)
  return $('tr')
    .toArray()
    .map((row) =>
      $(row)
        .find('th,td')
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    )
    .filter((row) => row.length > 1)
}

export function parseJisdorHtml(html: string, now: Date): NormalizedObservation[] {
  const datePattern = /\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{4}-\d{2}-\d{2}/i

  for (const row of tableRows(html)) {
    const numeric = row
      .filter((cell) => !datePattern.test(cell))
      .map(toNumber)
      .find((value): value is number => value !== null && value > 1000)
    if (numeric === undefined) {
      continue
    }

    const dateText = row.find((cell) => datePattern.test(cell))
    const periodStart = dateText ? toDateOnly(dateText) : toDateOnly(now)

    return [
      {
        metricKey: 'usd_idr_jisdor',
        geographyCode: 'ID',
        periodStart,
        periodEnd: periodStart,
        value: numeric,
        unit: 'IDR/USD',
        qualityFlag: 'official',
      },
    ]
  }

  return []
}

export function parseKemenkeuHtml(html: string, now: Date): NormalizedObservation[] {
  const period = periodFromNow(now)
  const observations: NormalizedObservation[] = []

  for (const row of tableRows(html)) {
    const rowText = row.join(' ').toLowerCase()
    const value = [...row].reverse().map(toNumber).find((item) => item !== null)
    if (value === undefined) {
      continue
    }

    if (rowText.includes('pendapatan') || rowText.includes('revenue')) {
      observations.push({
        metricKey: 'apbn_revenue_realization',
        geographyCode: 'ID',
        periodStart: period.start,
        periodEnd: period.end,
        value,
        unit: '% of target',
        qualityFlag: 'official',
      })
    } else if (rowText.includes('belanja') || rowText.includes('spending')) {
      observations.push({
        metricKey: 'apbn_spending_realization',
        geographyCode: 'ID',
        periodStart: period.start,
        periodEnd: period.end,
        value,
        unit: '% of allocation',
        qualityFlag: 'official',
      })
    } else if (rowText.includes('defisit') || rowText.includes('deficit')) {
      observations.push({
        metricKey: 'deficit_to_gdp',
        geographyCode: 'ID',
        periodStart: period.start,
        periodEnd: period.end,
        value,
        unit: '% of GDP',
        qualityFlag: 'official',
      })
    }
  }

  return observations
}

export function parseBpsHtmlFallback(html: string, now: Date): NormalizedObservation[] {
  const $ = cheerio.load(html)
  const text = $.text()
  const inflationMatch = text.match(/inflasi[^0-9-]*([0-9,.]+)/i)
  const povertyMatch = text.match(/kemiskinan[^0-9-]*([0-9,.]+)/i)
  const period = monthBounds(now)

  const observations: NormalizedObservation[] = []

  if (inflationMatch) {
    observations.push({
      metricKey: 'inflation_yoy',
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value: toNumber(inflationMatch[1]) ?? 0,
      unit: '% YoY',
      qualityFlag: 'needs_review',
    })
  }

  if (povertyMatch) {
    observations.push({
      metricKey: 'poverty_rate',
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value: toNumber(povertyMatch[1]) ?? 0,
      unit: '%',
      qualityFlag: 'needs_review',
    })
  }

  return observations
}

export const biJisdorAdapter: IngestionAdapter = {
  key: 'bi-jisdor',
  cron: '30 9 * * 1-5',
  description: 'Bank Indonesia JISDOR table scraper.',
  async run(context) {
    const snapshot = await fetchSnapshot(context.fetch, context.source.key, context.source.url, context.now)
    return {
      snapshots: [snapshot],
      observations: parseJisdorHtml(snapshot.rawBody, context.now),
      metadata: { parser: 'html-table:jisdor' },
    }
  },
}

export const kemenkeuApbnAdapter: IngestionAdapter = {
  key: 'kemenkeu-apbn',
  cron: '0 7 * * *',
  description: 'Kemenkeu APBN realization page scraper.',
  async run(context) {
    const snapshot = await fetchSnapshot(context.fetch, context.source.key, context.source.url, context.now)
    return {
      snapshots: [snapshot],
      observations: parseKemenkeuHtml(snapshot.rawBody, context.now),
      metadata: { parser: 'html-table:apbn' },
    }
  },
}
