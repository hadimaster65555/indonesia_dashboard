import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { DatabaseClient } from './connection'
import { getDbClient } from './connection'

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

export function migrateDatabase(client: DatabaseClient = getDbClient()) {
  client.sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const hasMigration = client.sqlite.prepare('SELECT 1 FROM __migrations WHERE name = ?')
  const markMigration = client.sqlite.prepare('INSERT INTO __migrations (name) VALUES (?)')

  for (const file of files) {
    if (hasMigration.get(file)) {
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const apply = client.sqlite.transaction(() => {
      client.sqlite.exec(sql)
      markMigration.run(file)
    })
    apply()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
  console.log('Database migrations applied.')
}
