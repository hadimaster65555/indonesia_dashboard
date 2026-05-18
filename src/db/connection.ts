import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'

export type DatabaseClient = {
  sqlite: Database.Database
  db: ReturnType<typeof drizzle<typeof schema>>
}

let singleton: DatabaseClient | null = null

export function getDatabasePath() {
  const configured = process.env.DATABASE_URL ?? 'data/indonesia_dashboard.sqlite'
  return configured.startsWith('file:') ? configured.slice('file:'.length) : configured
}

export function openDatabase(dbPath = getDatabasePath()): DatabaseClient {
  const resolvedPath = path.resolve(dbPath)
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

  const sqlite = new Database(resolvedPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  }
}

export function getDbClient() {
  singleton ??= openDatabase()
  return singleton
}

export function closeDbClient() {
  singleton?.sqlite.close()
  singleton = null
}
