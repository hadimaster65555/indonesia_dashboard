import cron from 'node-cron'

import { getDbClient } from '@/db/connection'
import { ensureSeededDatabase } from '@/db/seed'
import { dataSources } from '@/db/schema'

import { getAdapter } from './registry'
import { runSource } from './ingestion'

const client = getDbClient()
ensureSeededDatabase(client)

const sources = client.db.select().from(dataSources).all()

for (const source of sources) {
  if (!source.enabled) {
    continue
  }

  const adapter = getAdapter(source.key)
  if (!adapter) {
    console.warn(`No adapter registered for ${source.key}; skipping schedule.`)
    continue
  }

  cron.schedule(
    adapter.cron,
    async () => {
      const summary = await runSource(source.key, { client })
      console.log(`[${new Date().toISOString()}] ${source.key}: ${summary.status} (${summary.rowsInserted})`)
    },
    { timezone: 'Asia/Jakarta' },
  )
  console.log(`Scheduled ${source.key} with "${adapter.cron}" - ${adapter.description}`)
}

console.log('Ingestion worker running. Press Ctrl+C to stop.')
