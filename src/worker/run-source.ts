import { runSource } from './ingestion'

const sourceKey = process.argv[2]

if (!sourceKey) {
  console.error('Usage: npm run ingest:source -- <source-key>')
  process.exit(1)
}

const summary = await runSource(sourceKey)
console.log(JSON.stringify(summary, null, 2))
