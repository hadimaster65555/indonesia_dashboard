import { eq, sql } from 'drizzle-orm'

import type { DatabaseClient } from '@/db/connection'
import { getDbClient } from '@/db/connection'
import { ensureSeededDatabase } from '@/db/seed'
import { dataSources, metricObservations, sourceSnapshots } from '@/db/schema'

import { getAdapter } from './registry'
import type { FetchLike, IngestionSummary, NormalizedObservation, SnapshotPayload } from './types'
import { sha256 } from './utils'

type RunOptions = {
  client?: DatabaseClient
  fetcher?: FetchLike
  now?: Date
}

function insertRun(client: DatabaseClient, sourceKey: string, now: Date) {
  const result = client.sqlite
    .prepare(
      `INSERT INTO ingestion_runs (source_key, started_at, status, rows_inserted)
       VALUES (?, ?, 'running', 0)`,
    )
    .run(sourceKey, now.toISOString())

  return Number(result.lastInsertRowid)
}

function finishRun(
  client: DatabaseClient,
  runId: number,
  status: string,
  rowsInserted: number,
  checksum?: string,
  errorMessage?: string,
  metadata?: Record<string, unknown>,
) {
  client.sqlite
    .prepare(
      `UPDATE ingestion_runs
       SET finished_at = ?, status = ?, rows_inserted = ?, checksum = ?, error_message = ?, metadata_json = ?
       WHERE id = ?`,
    )
    .run(
      new Date().toISOString(),
      status,
      rowsInserted,
      checksum ?? null,
      errorMessage ?? null,
      metadata ? JSON.stringify(metadata) : null,
      runId,
    )
}

function latestChecksum(client: DatabaseClient, sourceKey: string) {
  const row = client.sqlite
    .prepare(
      `SELECT checksum
       FROM ingestion_runs
       WHERE source_key = ? AND status = 'success' AND checksum IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
    )
    .get(sourceKey) as { checksum?: string } | undefined

  return row?.checksum
}

function insertSnapshots(client: DatabaseClient, runId: number, snapshots: SnapshotPayload[]) {
  if (snapshots.length === 0) {
    return 0
  }

  let changes = 0
  const insertSnapshot = client.sqlite.prepare(
    `INSERT OR IGNORE INTO source_snapshots
       (source_key, fetched_at, period, url, content_type, raw_body, hash, source_run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const transaction = client.sqlite.transaction(() => {
    for (const snapshot of snapshots) {
      const result = insertSnapshot.run(
        snapshot.sourceKey,
        snapshot.fetchedAt,
        snapshot.period ?? null,
        snapshot.url,
        snapshot.contentType,
        snapshot.rawBody,
        snapshot.hash,
        runId,
      )
      changes += result.changes
    }
  })
  transaction()

  return changes
}

function upsertObservations(
  client: DatabaseClient,
  runId: number,
  observations: NormalizedObservation[],
) {
  if (observations.length === 0) {
    return 0
  }

  let changes = 0
  const insertObservation = client.sqlite.prepare(
    `INSERT INTO metric_observations
       (metric_key, geography_code, period_start, period_end, value, unit, source_run_id, quality_flag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(metric_key, geography_code, period_start, period_end, unit)
     DO UPDATE SET
       value = excluded.value,
       source_run_id = excluded.source_run_id,
       quality_flag = excluded.quality_flag`,
  )

  const transaction = client.sqlite.transaction(() => {
    for (const observation of observations) {
      const result = insertObservation.run(
        observation.metricKey,
        observation.geographyCode,
        observation.periodStart,
        observation.periodEnd,
        observation.value,
        observation.unit,
        runId,
        observation.qualityFlag ?? 'official',
      )
      changes += result.changes
    }
  })
  transaction()

  return changes
}

function checksumFor(snapshots: SnapshotPayload[], observations: NormalizedObservation[]) {
  return sha256(
    JSON.stringify({
      snapshots: snapshots.map((snapshot) => snapshot.hash).sort(),
      observations,
    }),
  )
}

export async function runSource(sourceKey: string, options: RunOptions = {}): Promise<IngestionSummary> {
  const client = options.client ?? getDbClient()
  ensureSeededDatabase(client)

  const source = client.db
    .select()
    .from(dataSources)
    .where(eq(dataSources.key, sourceKey))
    .get()

  if (!source) {
    throw new Error(`Unknown data source: ${sourceKey}`)
  }
  if (!source.enabled) {
    throw new Error(`Data source is disabled: ${sourceKey}`)
  }

  const adapter = getAdapter(sourceKey)
  if (!adapter) {
    throw new Error(`No ingestion adapter registered for ${sourceKey}`)
  }

  const now = options.now ?? new Date()
  const runId = insertRun(client, sourceKey, now)

  try {
    const result = await adapter.run({
      source,
      now,
      fetch: options.fetcher ?? fetch,
    })
    const checksum = checksumFor(result.snapshots, result.observations)

    if (latestChecksum(client, sourceKey) === checksum) {
      finishRun(client, runId, 'skipped', 0, checksum, undefined, {
        ...result.metadata,
        reason: 'duplicate_checksum',
      })
      return { sourceKey, runId, status: 'skipped', rowsInserted: 0, checksum }
    }

    insertSnapshots(client, runId, result.snapshots)
    const rowsInserted = upsertObservations(client, runId, result.observations)
    finishRun(client, runId, 'success', rowsInserted, checksum, undefined, result.metadata)

    return { sourceKey, runId, status: 'success', rowsInserted, checksum }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finishRun(client, runId, 'failed', 0, undefined, message)
    return { sourceKey, runId, status: 'failed', rowsInserted: 0, errorMessage: message }
  }
}

export async function runAllSources(options: RunOptions = {}) {
  const client = options.client ?? getDbClient()
  ensureSeededDatabase(client)

  const enabledSources = client.db
    .select({ key: dataSources.key })
    .from(dataSources)
    .where(eq(dataSources.enabled, true))
    .orderBy(dataSources.key)
    .all()

  const summaries: IngestionSummary[] = []
  for (const source of enabledSources) {
    summaries.push(await runSource(source.key, { ...options, client }))
  }
  return summaries
}

export function clearSourceDataForTest(client: DatabaseClient) {
  client.db.delete(metricObservations).where(sql`quality_flag = 'official'`).run()
  client.db.delete(sourceSnapshots).run()
}
