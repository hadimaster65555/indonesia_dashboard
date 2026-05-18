import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { openDatabase } from '@/db/connection'
import { seedDatabase } from '@/db/seed'
import { runSource } from '../ingestion'
import type { FetchLike } from '../types'

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const testDbPath = path.join(process.cwd(), 'data', `test-${Date.now()}.sqlite`)
const client = openDatabase(testDbPath)

function fixture(name: string) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8')
}

function htmlFetch(body: string): FetchLike {
  return async () =>
    new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
}

describe('ingestion runner', () => {
  afterAll(() => {
    client.sqlite.close()
    for (const suffix of ['', '-wal', '-shm']) {
      const file = `${testDbPath}${suffix}`
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    }
  })

  it('stores raw snapshots, observations, run status, and skips duplicate checksums', async () => {
    seedDatabase(client)

    const now = new Date('2026-05-17T03:00:00.000Z')
    const first = await runSource('bi-jisdor', {
      client,
      now,
      fetcher: htmlFetch(fixture('bi-jisdor.html')),
    })

    expect(first.status).toBe('success')
    expect(first.rowsInserted).toBeGreaterThan(0)

    const observation = client.sqlite
      .prepare(
        `SELECT value, source_run_id AS sourceRunId
         FROM metric_observations
         WHERE metric_key = 'usd_idr_jisdor' AND period_start = '2026-05-17'`,
      )
      .get() as { value: number; sourceRunId: number }

    expect(observation.value).toBe(16310)
    expect(observation.sourceRunId).toBe(first.runId)

    const snapshotCount = client.sqlite
      .prepare(`SELECT COUNT(*) AS count FROM source_snapshots WHERE source_key = 'bi-jisdor'`)
      .get() as { count: number }

    expect(snapshotCount.count).toBe(1)

    const second = await runSource('bi-jisdor', {
      client,
      now,
      fetcher: htmlFetch(fixture('bi-jisdor.html')),
    })

    expect(second.status).toBe('skipped')
    expect(second.rowsInserted).toBe(0)
  })
})
