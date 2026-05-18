import { runAllSources } from './ingestion'

const summaries = await runAllSources()
console.log(JSON.stringify(summaries, null, 2))
