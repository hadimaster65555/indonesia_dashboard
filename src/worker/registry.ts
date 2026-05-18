import { bmkgWeatherAdapter } from './adapters/bmkg'
import { biJisdorAdapter, kemenkeuApbnAdapter } from './adapters/htmlTable'
import { bnpbCkanAdapter, lkppCkanAdapter } from './adapters/ckan'
import { biSekiAdapter, satuDataPriorityAdapter } from './adapters/fileDownload'
import { createRestFreshnessAdapter, satuDataMetadataAdapter } from './adapters/freshness'
import type { IngestionAdapter } from './types'

export const adapters: Record<string, IngestionAdapter> = {
  [bmkgWeatherAdapter.key]: bmkgWeatherAdapter,
  [biJisdorAdapter.key]: biJisdorAdapter,
  [lkppCkanAdapter.key]: lkppCkanAdapter,
  [bnpbCkanAdapter.key]: bnpbCkanAdapter,
  [satuDataMetadataAdapter.key]: satuDataMetadataAdapter,
  [satuDataPriorityAdapter.key]: satuDataPriorityAdapter,
  [biSekiAdapter.key]: biSekiAdapter,
  [kemenkeuApbnAdapter.key]: kemenkeuApbnAdapter,
  'bps-webapi': createRestFreshnessAdapter(
    'bps-webapi',
    '10 6 * * *',
    'BPS WebAPI release-window freshness check.',
  ),
  'world-bank': createRestFreshnessAdapter(
    'world-bank',
    '0 9 * * 1',
    'World Bank indicators benchmark freshness check.',
    'https://api.worldbank.org/v2/country/IDN/indicator/NY.GDP.PCAP.CD?format=json&per_page=5',
  ),
  'imf-datamapper': createRestFreshnessAdapter(
    'imf-datamapper',
    '30 9 * * 1',
    'IMF DataMapper benchmark freshness check.',
    'https://www.imf.org/external/datamapper/api/NGDP_RPCH/IDN',
  ),
}

export function getAdapter(sourceKey: string) {
  return adapters[sourceKey]
}
