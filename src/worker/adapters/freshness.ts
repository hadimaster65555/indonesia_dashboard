import * as cheerio from 'cheerio'

import { fetchSnapshot } from '../utils'
import type { IngestionAdapter } from '../types'

function pageTitle(html: string) {
  const $ = cheerio.load(html)
  return $('title').first().text().replace(/\s+/g, ' ').trim() || undefined
}

export const satuDataMetadataAdapter: IngestionAdapter = {
  key: 'satu-data-index',
  cron: '15 5 * * *',
  description: 'Satu Data Indonesia metadata freshness checker.',
  async run(context) {
    const snapshot = await fetchSnapshot(context.fetch, context.source.key, context.source.url, context.now)
    return {
      snapshots: [snapshot],
      observations: [],
      metadata: {
        parser: 'freshness-checker',
        title: pageTitle(snapshot.rawBody),
      },
    }
  },
}

export function createRestFreshnessAdapter(
  key: string,
  cron: string,
  description: string,
  urlOverride?: string,
): IngestionAdapter {
  return {
    key,
    cron,
    description,
    async run(context) {
      const snapshot = await fetchSnapshot(
        context.fetch,
        context.source.key,
        urlOverride ?? context.source.url,
        context.now,
      )
      return {
        snapshots: [snapshot],
        observations: [],
        metadata: {
          parser: 'freshness-checker',
          bytes: snapshot.rawBody.length,
        },
      }
    },
  }
}
