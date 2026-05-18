import { z } from 'zod'

import { getDbClient } from '@/db/connection'
import { ensureSeededDatabase } from '@/db/seed'

const domainSchema = z.enum(['economy', 'budget', 'procurement', 'people', 'disaster'])

export type Domain = z.infer<typeof domainSchema>

export type MetricCard = {
  metricKey: string
  label: string
  domain: string
  unit: string
  latest: number
  previous: number | null
  delta: number | null
  deltaPct: number | null
  periodEnd: string
  sourceName: string
  sourceUrl: string
  qualityFlag: string
}

export type MetricPoint = {
  periodStart: string
  periodEnd: string
  value: number
  unit: string
}

export type AlertRow = {
  key: string
  severity: string
  explanation: string
  status: string
  createdAt: string
  metricLabel: string | null
  regionName: string | null
}

export type TargetRow = {
  key: string
  label: string
  ownerAgency: string
  metricKey: string
  metricLabel: string
  latestValue: number | null
  baselineValue: number
  targetValue: number
  unit: string
  deadline: string
  status: string
  progressPct: number
  variance: number | null
}

export type SourceHealthRow = {
  sourceKey: string
  name: string
  url: string
  cadence: string
  expectedReleaseWindow: string | null
  attribution: string
  parserType: string
  status: string | null
  startedAt: string | null
  finishedAt: string | null
  rowsInserted: number | null
  errorMessage: string | null
  ageHours: number | null
  freshnessStatus: 'fresh' | 'stale' | 'error' | 'missing'
}

export type RegionalPriorityRow = {
  code: string
  name: string
  latitude: number | null
  longitude: number | null
  score: number
  budgetAbsorption: number | null
  povertyRate: number | null
}

type LatestMetricRow = {
  metricKey: string
  label: string
  domain: string
  unit: string
  latest: number
  previous: number | null
  periodEnd: string
  sourceName: string
  sourceUrl: string
  qualityFlag: string
}

const freshnessHoursByCadence: Record<string, number> = {
  every_3_hours: 6,
  daily: 30,
  daily_morning: 30,
  daily_metadata_check: 30,
  weekly: 24 * 8,
  monthly: 24 * 45,
  monthly_release_window: 24 * 45,
  quarterly_annual: 24 * 130,
}

function client() {
  const dbClient = getDbClient()
  ensureSeededDatabase(dbClient)
  return dbClient
}

function toMetricCard(row: LatestMetricRow): MetricCard {
  const delta = row.previous === null ? null : row.latest - row.previous
  const deltaPct = row.previous === null || row.previous === 0 ? null : (delta! / row.previous) * 100
  return {
    ...row,
    delta,
    deltaPct,
  }
}

function getMetricCards(domain?: Domain) {
  const params: unknown[] = []
  const domainClause = domain ? 'AND m.domain = ?' : ''
  if (domain) {
    params.push(domain)
  }

  const rows = client().sqlite
    .prepare(
      `
      WITH ranked AS (
        SELECT
          mo.metric_key,
          mo.geography_code,
          mo.period_end,
          mo.value,
          mo.unit,
          mo.quality_flag,
          ROW_NUMBER() OVER (
            PARTITION BY mo.metric_key, mo.geography_code
            ORDER BY mo.period_end DESC, mo.id DESC
          ) AS rn
        FROM metric_observations mo
        WHERE mo.geography_code = 'ID'
      )
      SELECT
        latest.metric_key AS metricKey,
        m.label AS label,
        m.domain AS domain,
        latest.unit AS unit,
        latest.value AS latest,
        previous.value AS previous,
        latest.period_end AS periodEnd,
        ds.name AS sourceName,
        ds.url AS sourceUrl,
        latest.quality_flag AS qualityFlag
      FROM ranked latest
      LEFT JOIN ranked previous
        ON previous.metric_key = latest.metric_key
        AND previous.geography_code = latest.geography_code
        AND previous.rn = 2
      JOIN metrics m ON m.key = latest.metric_key
      JOIN data_sources ds ON ds.key = m.source_key
      WHERE latest.rn = 1 ${domainClause}
      ORDER BY m.domain, m.label
    `,
    )
    .all(...params) as LatestMetricRow[]

  return rows.map(toMetricCard)
}

function getSeries(metricKey: string, geographyCode = 'ID') {
  return client().sqlite
    .prepare(
      `
      SELECT period_start AS periodStart, period_end AS periodEnd, value, unit
      FROM metric_observations
      WHERE metric_key = ? AND geography_code = ?
      ORDER BY period_end ASC, id ASC
      LIMIT 24
    `,
    )
    .all(metricKey, geographyCode) as MetricPoint[]
}

function getAlerts() {
  return client().sqlite
    .prepare(
      `
      SELECT
        a.key,
        a.severity,
        a.explanation,
        a.status,
        a.created_at AS createdAt,
        m.label AS metricLabel,
        r.name AS regionName
      FROM alerts a
      LEFT JOIN metrics m ON m.key = a.metric_key
      LEFT JOIN regions r ON r.code = a.geography_code
      WHERE a.status = 'open'
      ORDER BY
        CASE a.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        a.created_at DESC
    `,
    )
    .all() as AlertRow[]
}

function getTargets() {
  const rows = client().sqlite
    .prepare(
      `
      WITH latest AS (
        SELECT
          mo.metric_key,
          mo.geography_code,
          mo.value,
          ROW_NUMBER() OVER (
            PARTITION BY mo.metric_key, mo.geography_code
            ORDER BY mo.period_end DESC, mo.id DESC
          ) AS rn
        FROM metric_observations mo
      )
      SELECT
        t.key,
        t.label,
        t.owner_agency AS ownerAgency,
        t.metric_key AS metricKey,
        m.label AS metricLabel,
        latest.value AS latestValue,
        t.baseline_value AS baselineValue,
        t.target_value AS targetValue,
        t.unit,
        t.deadline,
        t.status
      FROM targets t
      JOIN metrics m ON m.key = t.metric_key
      LEFT JOIN latest
        ON latest.metric_key = t.metric_key
        AND latest.geography_code = COALESCE(t.geography_code, 'ID')
        AND latest.rn = 1
      ORDER BY t.deadline ASC, t.owner_agency ASC
    `,
    )
    .all() as Omit<TargetRow, 'progressPct' | 'variance'>[]

  return rows.map((row) => {
    const latest = row.latestValue
    const distance = row.targetValue - row.baselineValue
    const progress =
      latest === null || distance === 0
        ? 0
        : ((latest - row.baselineValue) / distance) * 100

    return {
      ...row,
      progressPct: Math.max(0, Math.min(120, progress)),
      variance: latest === null ? null : latest - row.targetValue,
    }
  })
}

function getSourceHealth() {
  const now = Date.now()
  const rows = client().sqlite
    .prepare(
      `
      WITH latest_run AS (
        SELECT
          ir.*,
          ROW_NUMBER() OVER (
            PARTITION BY ir.source_key
            ORDER BY ir.started_at DESC, ir.id DESC
          ) AS rn
        FROM ingestion_runs ir
      )
      SELECT
        ds.key AS sourceKey,
        ds.name,
        ds.url,
        ds.cadence,
        ds.expected_release_window AS expectedReleaseWindow,
        ds.attribution,
        ds.parser_type AS parserType,
        latest_run.status,
        latest_run.started_at AS startedAt,
        latest_run.finished_at AS finishedAt,
        latest_run.rows_inserted AS rowsInserted,
        latest_run.error_message AS errorMessage
      FROM data_sources ds
      LEFT JOIN latest_run
        ON latest_run.source_key = ds.key
        AND latest_run.rn = 1
      ORDER BY ds.cadence, ds.key
    `,
    )
    .all() as Omit<SourceHealthRow, 'ageHours' | 'freshnessStatus'>[]

  return rows.map((row): SourceHealthRow => {
    const finishedAt = row.finishedAt ? new Date(row.finishedAt).getTime() : null
    const ageHours = finishedAt ? (now - finishedAt) / 3_600_000 : null
    const threshold = freshnessHoursByCadence[row.cadence] ?? 48
    const freshnessStatus =
      row.status === null
        ? 'missing'
        : row.status === 'failed'
          ? 'error'
          : ageHours !== null && ageHours > threshold
            ? 'stale'
            : 'fresh'

    return {
      ...row,
      ageHours,
      freshnessStatus,
    }
  })
}

function getRegionalPriority() {
  return client().sqlite
    .prepare(
      `
      WITH ranked AS (
        SELECT
          mo.metric_key,
          mo.geography_code,
          mo.value,
          ROW_NUMBER() OVER (
            PARTITION BY mo.metric_key, mo.geography_code
            ORDER BY mo.period_end DESC, mo.id DESC
          ) AS rn
        FROM metric_observations mo
        WHERE mo.metric_key IN (
          'regional_intervention_score',
          'regional_budget_absorption',
          'regional_poverty_rate'
        )
      )
      SELECT
        r.code,
        r.name,
        r.latitude,
        r.longitude,
        score.value AS score,
        budget.value AS budgetAbsorption,
        poverty.value AS povertyRate
      FROM regions r
      JOIN ranked score
        ON score.geography_code = r.code
        AND score.metric_key = 'regional_intervention_score'
        AND score.rn = 1
      LEFT JOIN ranked budget
        ON budget.geography_code = r.code
        AND budget.metric_key = 'regional_budget_absorption'
        AND budget.rn = 1
      LEFT JOIN ranked poverty
        ON poverty.geography_code = r.code
        AND poverty.metric_key = 'regional_poverty_rate'
        AND poverty.rn = 1
      WHERE r.level = 'province'
      ORDER BY score.value DESC, r.name ASC
    `,
    )
    .all() as RegionalPriorityRow[]
}

function getSeriesForCards(cards: MetricCard[], limit = 6) {
  return Object.fromEntries(
    cards.slice(0, limit).map((card) => [card.metricKey, getSeries(card.metricKey)]),
  )
}

export function loadDashboardData() {
  const cards = getMetricCards()
  const sourceHealth = getSourceHealth()
  const healthCounts = sourceHealth.reduce(
    (counts, row) => ({
      ...counts,
      [row.freshnessStatus]: counts[row.freshnessStatus] + 1,
    }),
    { fresh: 0, stale: 0, error: 0, missing: 0 },
  )

  const keyMetricOrder = [
    'usd_idr_jisdor',
    'inflation_yoy',
    'apbn_spending_realization',
    'single_bid_share',
    'weather_warning_count',
  ]

  const keyCards = keyMetricOrder
    .map((key) => cards.find((card) => card.metricKey === key))
    .filter((card): card is MetricCard => Boolean(card))

  const movements = [...cards]
    .filter((card) => card.delta !== null)
    .sort((left, right) => Math.abs(right.deltaPct ?? right.delta ?? 0) - Math.abs(left.deltaPct ?? left.delta ?? 0))
    .slice(0, 8)

  return {
    generatedAt: new Date().toISOString(),
    keyCards,
    movements,
    alerts: getAlerts(),
    targets: getTargets(),
    sourceHealth: sourceHealth.slice(0, 6),
    healthCounts,
    regionalPriority: getRegionalPriority().slice(0, 8),
    series: getSeriesForCards(keyCards, 5),
  }
}

export function loadDomainData(domain: Domain) {
  const cards = getMetricCards(domain)
  const sourceKeys = new Set(cards.map((card) => card.sourceName))
  return {
    domain,
    cards,
    series: getSeriesForCards(cards),
    alerts: getAlerts().filter((alert) =>
      cards.some((card) => card.label === alert.metricLabel),
    ),
    targets: getTargets().filter((target) =>
      cards.some((card) => card.metricKey === target.metricKey),
    ),
    sourceHealth: getSourceHealth().filter((source) => sourceKeys.has(source.name)),
  }
}

export type DomainData = ReturnType<typeof loadDomainData>

export function loadRegionsData() {
  return {
    regions: getRegionalPriority(),
    targets: getTargets(),
    alerts: getAlerts().filter((alert) => alert.regionName && alert.regionName !== 'Indonesia'),
  }
}

export function loadSourceHealthData() {
  return {
    sources: getSourceHealth(),
    alerts: getAlerts(),
  }
}
