import { subHours } from 'date-fns'

import type { DatabaseClient } from './connection'
import { getDbClient } from './connection'
import { migrateDatabase } from './migrate'
import {
  alerts,
  dataSources,
  ingestionRuns,
  metricObservations,
  metrics,
  regions,
  targets,
} from './schema'

const seedDataSources: (typeof dataSources.$inferInsert)[] = [
  {
    key: 'bmkg-weather',
    name: 'BMKG Weather and Earthquake API',
    url: 'https://data.bmkg.go.id/prakiraan-cuaca/',
    cadence: 'every_3_hours',
    expectedReleaseWindow: 'Forecasts update twice daily with 3-hour intervals',
    attribution: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    parserType: 'json_rest',
  },
  {
    key: 'bi-jisdor',
    name: 'Bank Indonesia JISDOR',
    url: 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/Default.aspx',
    cadence: 'daily_morning',
    expectedReleaseWindow: 'Business days, Indonesia morning release',
    attribution: 'Bank Indonesia',
    parserType: 'html_table',
  },
  {
    key: 'lkpp-ckan',
    name: 'LKPP Open Data CKAN',
    url: 'https://data.lkpp.go.id/',
    cadence: 'daily',
    expectedReleaseWindow: 'Daily metadata and resource checks',
    attribution: 'Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah',
    parserType: 'ckan',
  },
  {
    key: 'bnpb-ckan',
    name: 'BNPB Open Data CKAN',
    url: 'https://data.bnpb.go.id/api/3',
    cadence: 'daily',
    expectedReleaseWindow: 'Daily metadata and incident checks',
    attribution: 'Badan Nasional Penanggulangan Bencana',
    parserType: 'ckan',
  },
  {
    key: 'satu-data-index',
    name: 'Satu Data Indonesia Metadata',
    url: 'https://data.go.id/',
    cadence: 'daily_metadata_check',
    expectedReleaseWindow: 'Daily metadata change detection',
    attribution: 'Satu Data Indonesia',
    parserType: 'metadata_index',
  },
  {
    key: 'satu-data-priority',
    name: 'Satu Data Indonesia Priority Datasets',
    url: 'https://data.go.id/',
    cadence: 'weekly',
    expectedReleaseWindow: 'Weekly selected regional dataset pull',
    attribution: 'Satu Data Indonesia',
    parserType: 'file_download',
  },
  {
    key: 'bps-webapi',
    name: 'BPS WebAPI',
    url: 'https://webapi.bps.go.id/developer/',
    cadence: 'monthly_release_window',
    expectedReleaseWindow: 'Monthly, quarterly, and annual statistical releases',
    attribution: 'Badan Pusat Statistik',
    parserType: 'json_rest',
  },
  {
    key: 'bi-seki',
    name: 'Bank Indonesia SEKI/SSKI/SULNI',
    url: 'https://www.bi.go.id/id/statistik/ekonomi-keuangan/seki/Default.aspx',
    cadence: 'monthly_release_window',
    expectedReleaseWindow: 'Monthly financial and external sector releases',
    attribution: 'Bank Indonesia',
    parserType: 'file_download',
  },
  {
    key: 'kemenkeu-apbn',
    name: 'Kementerian Keuangan APBN',
    url: 'https://www.kemenkeu.go.id/informasi-publik/anggaran-dan-realisasi-keuangan',
    cadence: 'monthly',
    expectedReleaseWindow: 'Monthly APBN realization release',
    attribution: 'Kementerian Keuangan Republik Indonesia',
    parserType: 'html_table',
  },
  {
    key: 'world-bank',
    name: 'World Bank Indicators API',
    url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation',
    cadence: 'quarterly_annual',
    expectedReleaseWindow: 'Quarterly or annual international benchmark refresh',
    attribution: 'World Bank',
    parserType: 'json_rest',
  },
  {
    key: 'imf-datamapper',
    name: 'IMF DataMapper API',
    url: 'https://www.imf.org/external/datamapper/api/',
    cadence: 'quarterly_annual',
    expectedReleaseWindow: 'Quarterly or annual international benchmark refresh',
    attribution: 'International Monetary Fund',
    parserType: 'json_rest',
  },
]

const seedMetrics: (typeof metrics.$inferInsert)[] = [
  {
    key: 'usd_idr_jisdor',
    label: 'USD/IDR JISDOR',
    domain: 'economy',
    unit: 'IDR/USD',
    geographyLevel: 'national',
    sourceKey: 'bi-jisdor',
    updateCadence: 'daily',
    description: 'Bank Indonesia USD/IDR reference rate.',
    transformationNote: 'Parsed from the official JISDOR table; comma thousand separators normalized.',
  },
  {
    key: 'inflation_yoy',
    label: 'Inflation',
    domain: 'economy',
    unit: '% YoY',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'monthly',
    description: 'National consumer price inflation.',
  },
  {
    key: 'gdp_growth_yoy',
    label: 'GDP Growth',
    domain: 'economy',
    unit: '% YoY',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'quarterly',
  },
  {
    key: 'unemployment_rate',
    label: 'Open Unemployment',
    domain: 'economy',
    unit: '%',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'semiannual',
  },
  {
    key: 'poverty_rate',
    label: 'Poverty Rate',
    domain: 'people',
    unit: '%',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'semiannual',
  },
  {
    key: 'gini_ratio',
    label: 'Gini Ratio',
    domain: 'people',
    unit: 'index',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'semiannual',
  },
  {
    key: 'policy_rate',
    label: 'BI Rate',
    domain: 'economy',
    unit: '%',
    geographyLevel: 'national',
    sourceKey: 'bi-seki',
    updateCadence: 'monthly',
  },
  {
    key: 'foreign_reserves',
    label: 'Foreign Reserves',
    domain: 'economy',
    unit: 'USD bn',
    geographyLevel: 'national',
    sourceKey: 'bi-seki',
    updateCadence: 'monthly',
  },
  {
    key: 'apbn_revenue_realization',
    label: 'APBN Revenue Realization',
    domain: 'budget',
    unit: '% of target',
    geographyLevel: 'national',
    sourceKey: 'kemenkeu-apbn',
    updateCadence: 'monthly',
  },
  {
    key: 'apbn_spending_realization',
    label: 'APBN Spending Realization',
    domain: 'budget',
    unit: '% of allocation',
    geographyLevel: 'national',
    sourceKey: 'kemenkeu-apbn',
    updateCadence: 'monthly',
  },
  {
    key: 'deficit_to_gdp',
    label: 'APBN Deficit',
    domain: 'budget',
    unit: '% of GDP',
    geographyLevel: 'national',
    sourceKey: 'kemenkeu-apbn',
    updateCadence: 'monthly',
  },
  {
    key: 'ministry_burn_rate',
    label: 'Ministry Burn Rate',
    domain: 'budget',
    unit: '% of allocation',
    geographyLevel: 'national',
    sourceKey: 'kemenkeu-apbn',
    updateCadence: 'monthly',
  },
  {
    key: 'procurement_award_value',
    label: 'Procurement Award Value',
    domain: 'procurement',
    unit: 'IDR tn',
    geographyLevel: 'national',
    sourceKey: 'lkpp-ckan',
    updateCadence: 'daily',
  },
  {
    key: 'single_bid_share',
    label: 'Single-Bid Risk',
    domain: 'procurement',
    unit: '% tenders',
    geographyLevel: 'national',
    sourceKey: 'lkpp-ckan',
    updateCadence: 'daily',
  },
  {
    key: 'delayed_procurement_share',
    label: 'Delayed Procurement',
    domain: 'procurement',
    unit: '% packages',
    geographyLevel: 'national',
    sourceKey: 'lkpp-ckan',
    updateCadence: 'daily',
  },
  {
    key: 'supplier_concentration',
    label: 'Supplier Concentration',
    domain: 'procurement',
    unit: 'HHI',
    geographyLevel: 'national',
    sourceKey: 'lkpp-ckan',
    updateCadence: 'daily',
  },
  {
    key: 'stunting_prevalence',
    label: 'Stunting Prevalence',
    domain: 'people',
    unit: '% children',
    geographyLevel: 'national',
    sourceKey: 'satu-data-priority',
    updateCadence: 'weekly',
  },
  {
    key: 'education_completion',
    label: 'Senior Secondary Completion',
    domain: 'people',
    unit: '% cohort',
    geographyLevel: 'national',
    sourceKey: 'satu-data-priority',
    updateCadence: 'weekly',
  },
  {
    key: 'youth_unemployment',
    label: 'Youth Unemployment',
    domain: 'people',
    unit: '%',
    geographyLevel: 'national',
    sourceKey: 'bps-webapi',
    updateCadence: 'semiannual',
  },
  {
    key: 'regional_intervention_score',
    label: 'Intervention Priority Score',
    domain: 'regions',
    unit: 'score',
    geographyLevel: 'province',
    sourceKey: 'satu-data-index',
    updateCadence: 'weekly',
    description:
      'Composite score combining poverty, stunting, food inflation, budget absorption, disaster exposure, and education/labor signals.',
  },
  {
    key: 'regional_budget_absorption',
    label: 'Regional Budget Absorption',
    domain: 'regions',
    unit: '%',
    geographyLevel: 'province',
    sourceKey: 'satu-data-priority',
    updateCadence: 'monthly',
  },
  {
    key: 'regional_poverty_rate',
    label: 'Regional Poverty Rate',
    domain: 'regions',
    unit: '%',
    geographyLevel: 'province',
    sourceKey: 'bps-webapi',
    updateCadence: 'semiannual',
  },
  {
    key: 'earthquake_count',
    label: 'Earthquake Count',
    domain: 'disaster',
    unit: 'events',
    geographyLevel: 'national',
    sourceKey: 'bmkg-weather',
    updateCadence: 'every_3_hours',
  },
  {
    key: 'weather_warning_count',
    label: 'Weather Warnings',
    domain: 'disaster',
    unit: 'warnings',
    geographyLevel: 'national',
    sourceKey: 'bmkg-weather',
    updateCadence: 'every_3_hours',
  },
  {
    key: 'disaster_incidents',
    label: 'BNPB Incidents',
    domain: 'disaster',
    unit: 'incidents',
    geographyLevel: 'national',
    sourceKey: 'bnpb-ckan',
    updateCadence: 'daily',
  },
  {
    key: 'affected_population',
    label: 'Affected Population',
    domain: 'disaster',
    unit: 'people',
    geographyLevel: 'national',
    sourceKey: 'bnpb-ckan',
    updateCadence: 'daily',
  },
]

const seedRegions: (typeof regions.$inferInsert)[] = [
  {
    code: 'ID',
    bpsCode: '00',
    kemendagriCode: '00',
    name: 'Indonesia',
    level: 'national',
    latitude: -2.5,
    longitude: 118,
  },
  { code: '11', bpsCode: '11', kemendagriCode: '11', name: 'Aceh', level: 'province', parentCode: 'ID', provinceCode: '11', latitude: 4.7, longitude: 96.7 },
  { code: '12', bpsCode: '12', kemendagriCode: '12', name: 'Sumatera Utara', level: 'province', parentCode: 'ID', provinceCode: '12', latitude: 2.1, longitude: 99.5 },
  { code: '13', bpsCode: '13', kemendagriCode: '13', name: 'Sumatera Barat', level: 'province', parentCode: 'ID', provinceCode: '13', latitude: -0.9, longitude: 100.4 },
  { code: '14', bpsCode: '14', kemendagriCode: '14', name: 'Riau', level: 'province', parentCode: 'ID', provinceCode: '14', latitude: 0.5, longitude: 101.8 },
  { code: '15', bpsCode: '15', kemendagriCode: '15', name: 'Jambi', level: 'province', parentCode: 'ID', provinceCode: '15', latitude: -1.6, longitude: 103.6 },
  { code: '16', bpsCode: '16', kemendagriCode: '16', name: 'Sumatera Selatan', level: 'province', parentCode: 'ID', provinceCode: '16', latitude: -3.3, longitude: 104.8 },
  { code: '17', bpsCode: '17', kemendagriCode: '17', name: 'Bengkulu', level: 'province', parentCode: 'ID', provinceCode: '17', latitude: -3.8, longitude: 102.3 },
  { code: '18', bpsCode: '18', kemendagriCode: '18', name: 'Lampung', level: 'province', parentCode: 'ID', provinceCode: '18', latitude: -4.9, longitude: 105.0 },
  { code: '19', bpsCode: '19', kemendagriCode: '19', name: 'Kepulauan Bangka Belitung', level: 'province', parentCode: 'ID', provinceCode: '19', latitude: -2.7, longitude: 106.4 },
  { code: '21', bpsCode: '21', kemendagriCode: '21', name: 'Kepulauan Riau', level: 'province', parentCode: 'ID', provinceCode: '21', latitude: 0.9, longitude: 104.6 },
  { code: '31', bpsCode: '31', kemendagriCode: '31', name: 'DKI Jakarta', level: 'province', parentCode: 'ID', provinceCode: '31', latitude: -6.2, longitude: 106.8 },
  { code: '32', bpsCode: '32', kemendagriCode: '32', name: 'Jawa Barat', level: 'province', parentCode: 'ID', provinceCode: '32', latitude: -6.9, longitude: 107.6 },
  { code: '33', bpsCode: '33', kemendagriCode: '33', name: 'Jawa Tengah', level: 'province', parentCode: 'ID', provinceCode: '33', latitude: -7.2, longitude: 110.0 },
  { code: '34', bpsCode: '34', kemendagriCode: '34', name: 'DI Yogyakarta', level: 'province', parentCode: 'ID', provinceCode: '34', latitude: -7.8, longitude: 110.4 },
  { code: '35', bpsCode: '35', kemendagriCode: '35', name: 'Jawa Timur', level: 'province', parentCode: 'ID', provinceCode: '35', latitude: -7.5, longitude: 112.7 },
  { code: '36', bpsCode: '36', kemendagriCode: '36', name: 'Banten', level: 'province', parentCode: 'ID', provinceCode: '36', latitude: -6.4, longitude: 106.1 },
  { code: '51', bpsCode: '51', kemendagriCode: '51', name: 'Bali', level: 'province', parentCode: 'ID', provinceCode: '51', latitude: -8.4, longitude: 115.2 },
  { code: '52', bpsCode: '52', kemendagriCode: '52', name: 'Nusa Tenggara Barat', level: 'province', parentCode: 'ID', provinceCode: '52', latitude: -8.6, longitude: 117.5 },
  { code: '53', bpsCode: '53', kemendagriCode: '53', name: 'Nusa Tenggara Timur', level: 'province', parentCode: 'ID', provinceCode: '53', latitude: -8.7, longitude: 121.0 },
  { code: '61', bpsCode: '61', kemendagriCode: '61', name: 'Kalimantan Barat', level: 'province', parentCode: 'ID', provinceCode: '61', latitude: 0.1, longitude: 111.1 },
  { code: '62', bpsCode: '62', kemendagriCode: '62', name: 'Kalimantan Tengah', level: 'province', parentCode: 'ID', provinceCode: '62', latitude: -1.7, longitude: 113.4 },
  { code: '63', bpsCode: '63', kemendagriCode: '63', name: 'Kalimantan Selatan', level: 'province', parentCode: 'ID', provinceCode: '63', latitude: -3.0, longitude: 115.4 },
  { code: '64', bpsCode: '64', kemendagriCode: '64', name: 'Kalimantan Timur', level: 'province', parentCode: 'ID', provinceCode: '64', latitude: 0.5, longitude: 116.4 },
  { code: '65', bpsCode: '65', kemendagriCode: '65', name: 'Kalimantan Utara', level: 'province', parentCode: 'ID', provinceCode: '65', latitude: 3.0, longitude: 116.8 },
  { code: '71', bpsCode: '71', kemendagriCode: '71', name: 'Sulawesi Utara', level: 'province', parentCode: 'ID', provinceCode: '71', latitude: 1.3, longitude: 124.8 },
  { code: '72', bpsCode: '72', kemendagriCode: '72', name: 'Sulawesi Tengah', level: 'province', parentCode: 'ID', provinceCode: '72', latitude: -1.4, longitude: 121.4 },
  { code: '73', bpsCode: '73', kemendagriCode: '73', name: 'Sulawesi Selatan', level: 'province', parentCode: 'ID', provinceCode: '73', latitude: -3.7, longitude: 119.8 },
  { code: '74', bpsCode: '74', kemendagriCode: '74', name: 'Sulawesi Tenggara', level: 'province', parentCode: 'ID', provinceCode: '74', latitude: -4.1, longitude: 122.1 },
  { code: '75', bpsCode: '75', kemendagriCode: '75', name: 'Gorontalo', level: 'province', parentCode: 'ID', provinceCode: '75', latitude: 0.6, longitude: 123.1 },
  { code: '76', bpsCode: '76', kemendagriCode: '76', name: 'Sulawesi Barat', level: 'province', parentCode: 'ID', provinceCode: '76', latitude: -2.7, longitude: 119.3 },
  { code: '81', bpsCode: '81', kemendagriCode: '81', name: 'Maluku', level: 'province', parentCode: 'ID', provinceCode: '81', latitude: -3.0, longitude: 130.1 },
  { code: '82', bpsCode: '82', kemendagriCode: '82', name: 'Maluku Utara', level: 'province', parentCode: 'ID', provinceCode: '82', latitude: 1.6, longitude: 127.8 },
  { code: '91', bpsCode: '91', kemendagriCode: '91', name: 'Papua', level: 'province', parentCode: 'ID', provinceCode: '91', latitude: -2.5, longitude: 140.7 },
  { code: '92', bpsCode: '92', kemendagriCode: '92', name: 'Papua Barat', level: 'province', parentCode: 'ID', provinceCode: '92', latitude: -1.3, longitude: 133.2 },
  { code: '93', bpsCode: '93', kemendagriCode: '93', name: 'Papua Selatan', level: 'province', parentCode: 'ID', provinceCode: '93', latitude: -6.2, longitude: 139.5 },
  { code: '94', bpsCode: '94', kemendagriCode: '94', name: 'Papua Tengah', level: 'province', parentCode: 'ID', provinceCode: '94', latitude: -3.8, longitude: 136.8 },
  { code: '95', bpsCode: '95', kemendagriCode: '95', name: 'Papua Pegunungan', level: 'province', parentCode: 'ID', provinceCode: '95', latitude: -4.1, longitude: 138.8 },
  { code: '96', bpsCode: '96', kemendagriCode: '96', name: 'Papua Barat Daya', level: 'province', parentCode: 'ID', provinceCode: '96', latitude: -0.9, longitude: 131.3 },
]

const periods = [
  { start: '2025-10-01', end: '2025-10-31' },
  { start: '2025-11-01', end: '2025-11-30' },
  { start: '2025-12-01', end: '2025-12-31' },
  { start: '2026-01-01', end: '2026-01-31' },
  { start: '2026-02-01', end: '2026-02-28' },
  { start: '2026-03-01', end: '2026-03-31' },
  { start: '2026-04-01', end: '2026-04-30' },
]

const nationalSeries = [
  { metricKey: 'usd_idr_jisdor', unit: 'IDR/USD', values: [15720, 15860, 16040, 16125, 15990, 16230, 16310] },
  { metricKey: 'inflation_yoy', unit: '% YoY', values: [2.1, 2.3, 2.5, 2.8, 3.1, 3.4, 3.2] },
  { metricKey: 'gdp_growth_yoy', unit: '% YoY', values: [5.0, 5.0, 5.1, 5.1, 5.0, 5.2, 5.2] },
  { metricKey: 'unemployment_rate', unit: '%', values: [4.9, 4.9, 4.8, 4.8, 4.7, 4.7, 4.6] },
  { metricKey: 'poverty_rate', unit: '%', values: [8.6, 8.6, 8.5, 8.5, 8.4, 8.4, 8.3] },
  { metricKey: 'gini_ratio', unit: 'index', values: [0.381, 0.381, 0.379, 0.379, 0.378, 0.378, 0.377] },
  { metricKey: 'policy_rate', unit: '%', values: [5.25, 5.25, 5.25, 5.5, 5.5, 5.5, 5.75] },
  { metricKey: 'foreign_reserves', unit: 'USD bn', values: [149.9, 151.2, 152.0, 150.4, 153.3, 154.2, 152.7] },
  { metricKey: 'apbn_revenue_realization', unit: '% of target', values: [68.2, 76.9, 93.1, 6.4, 13.8, 21.6, 29.7] },
  { metricKey: 'apbn_spending_realization', unit: '% of allocation', values: [62.5, 72.4, 95.6, 5.5, 12.4, 19.2, 27.1] },
  { metricKey: 'deficit_to_gdp', unit: '% of GDP', values: [-1.1, -1.4, -1.9, -0.1, -0.3, -0.5, -0.8] },
  { metricKey: 'ministry_burn_rate', unit: '% of allocation', values: [58.4, 69.2, 94.3, 4.3, 10.8, 17.5, 24.6] },
  { metricKey: 'procurement_award_value', unit: 'IDR tn', values: [812, 925, 1084, 74, 181, 304, 443] },
  { metricKey: 'single_bid_share', unit: '% tenders', values: [12.1, 12.8, 13.4, 14.2, 14.7, 15.3, 15.8] },
  { metricKey: 'delayed_procurement_share', unit: '% packages', values: [21.4, 20.7, 18.1, 26.2, 25.1, 23.4, 22.8] },
  { metricKey: 'supplier_concentration', unit: 'HHI', values: [0.118, 0.121, 0.124, 0.131, 0.135, 0.133, 0.136] },
  { metricKey: 'stunting_prevalence', unit: '% children', values: [21.1, 20.9, 20.7, 20.5, 20.1, 19.8, 19.6] },
  { metricKey: 'education_completion', unit: '% cohort', values: [74.1, 74.4, 74.6, 74.9, 75.2, 75.4, 75.7] },
  { metricKey: 'youth_unemployment', unit: '%', values: [15.2, 15.2, 14.9, 14.9, 14.7, 14.6, 14.5] },
  { metricKey: 'earthquake_count', unit: 'events', values: [166, 173, 181, 154, 170, 188, 196] },
  { metricKey: 'weather_warning_count', unit: 'warnings', values: [38, 41, 55, 64, 72, 69, 58] },
  { metricKey: 'disaster_incidents', unit: 'incidents', values: [246, 268, 322, 381, 412, 395, 337] },
  { metricKey: 'affected_population', unit: 'people', values: [98420, 112540, 149800, 190120, 211450, 183620, 147900] },
]

const provinceScores = [
  ['93', 86, 46.2, 26.1],
  ['95', 84, 42.5, 31.7],
  ['94', 81, 48.8, 28.4],
  ['92', 77, 51.6, 21.8],
  ['53', 74, 55.1, 19.5],
  ['82', 70, 57.4, 6.2],
  ['76', 68, 52.3, 11.8],
  ['11', 64, 54.9, 14.2],
  ['73', 61, 59.2, 8.7],
  ['32', 58, 64.1, 7.4],
  ['35', 56, 63.5, 9.6],
  ['31', 24, 71.2, 4.3],
  ['51', 21, 68.5, 4.1],
] as const

const seedObservations: (typeof metricObservations.$inferInsert)[] = [
  ...nationalSeries.flatMap((series) =>
    periods.map((period, index) => ({
      metricKey: series.metricKey,
      geographyCode: 'ID',
      periodStart: period.start,
      periodEnd: period.end,
      value: series.values[index] ?? series.values.at(-1) ?? 0,
      unit: series.unit,
      qualityFlag: 'seeded_official_shape',
    })),
  ),
  ...provinceScores.flatMap(([regionCode, score, absorption, poverty]) => [
    {
      metricKey: 'regional_intervention_score',
      geographyCode: regionCode,
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      value: score,
      unit: 'score',
      qualityFlag: 'seeded_official_shape',
    },
    {
      metricKey: 'regional_budget_absorption',
      geographyCode: regionCode,
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      value: absorption,
      unit: '%',
      qualityFlag: 'seeded_official_shape',
    },
    {
      metricKey: 'regional_poverty_rate',
      geographyCode: regionCode,
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      value: poverty,
      unit: '%',
      qualityFlag: 'seeded_official_shape',
    },
  ]),
]

const seedAlerts: (typeof alerts.$inferInsert)[] = [
  {
    key: 'rupiah-pressure-2026-04',
    severity: 'high',
    metricKey: 'usd_idr_jisdor',
    geographyCode: 'ID',
    explanation: 'USD/IDR has moved above the prior three-month average; monitor reserves and BI policy communications.',
    status: 'open',
  },
  {
    key: 'weather-warnings-2026-04',
    severity: 'medium',
    metricKey: 'weather_warning_count',
    geographyCode: 'ID',
    explanation: 'BMKG warning count remains elevated against the late-2025 baseline.',
    status: 'open',
  },
  {
    key: 'procurement-single-bid-2026-04',
    severity: 'medium',
    metricKey: 'single_bid_share',
    geographyCode: 'ID',
    explanation: 'Single-bid share is drifting upward; prioritize audit sampling in high-value packages.',
    status: 'open',
  },
  {
    key: 'papua-selatan-intervention-2026-04',
    severity: 'high',
    metricKey: 'regional_intervention_score',
    geographyCode: '93',
    explanation: 'Composite regional intervention score is highest among seeded provinces.',
    status: 'open',
  },
]

const seedTargets: (typeof targets.$inferInsert)[] = [
  {
    key: 'inflation-target-2026',
    label: 'Keep inflation within target band',
    ownerAgency: 'Bank Indonesia / Kemenko Perekonomian',
    metricKey: 'inflation_yoy',
    geographyCode: 'ID',
    baselineValue: 3.2,
    targetValue: 3.0,
    unit: '% YoY',
    deadline: '2026-12-31',
    status: 'watch',
  },
  {
    key: 'stunting-target-2026',
    label: 'Lower national stunting prevalence',
    ownerAgency: 'BKKBN / Kementerian Kesehatan',
    metricKey: 'stunting_prevalence',
    geographyCode: 'ID',
    baselineValue: 20.7,
    targetValue: 18.8,
    unit: '% children',
    deadline: '2026-12-31',
    status: 'on_track',
  },
  {
    key: 'apbn-absorption-target-2026',
    label: 'Accelerate budget absorption',
    ownerAgency: 'Kementerian Keuangan',
    metricKey: 'apbn_spending_realization',
    geographyCode: 'ID',
    baselineValue: 27.1,
    targetValue: 35,
    unit: '% of allocation',
    deadline: '2026-06-30',
    status: 'watch',
  },
  {
    key: 'procurement-risk-target-2026',
    label: 'Reduce single-bid tender share',
    ownerAgency: 'LKPP',
    metricKey: 'single_bid_share',
    geographyCode: 'ID',
    baselineValue: 15.8,
    targetValue: 12,
    unit: '% tenders',
    deadline: '2026-12-31',
    status: 'off_track',
  },
]

function chunks<T>(items: T[], size: number) {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

export function seedDatabase(client: DatabaseClient = getDbClient()) {
  migrateDatabase(client)

  client.db.insert(dataSources).values(seedDataSources).onConflictDoNothing().run()
  client.db.insert(metrics).values(seedMetrics).onConflictDoNothing().run()
  client.db.insert(regions).values(seedRegions).onConflictDoNothing().run()

  for (const batch of chunks(seedObservations, 50)) {
    client.db.insert(metricObservations).values(batch).onConflictDoNothing().run()
  }

  client.db.insert(alerts).values(seedAlerts).onConflictDoNothing().run()
  client.db.insert(targets).values(seedTargets).onConflictDoNothing().run()

  const existingRun = client.sqlite
    .prepare('SELECT id FROM ingestion_runs WHERE status = ? LIMIT 1')
    .get('seeded')

  if (!existingRun) {
    const now = new Date()
    const runs = seedDataSources.map((source, index) => ({
      sourceKey: source.key,
      startedAt: subHours(now, index * 3 + 1).toISOString(),
      finishedAt: subHours(now, index * 3 + 1).toISOString(),
      status: 'seeded',
      rowsInserted: source.key === 'satu-data-index' ? 39 : 7,
      checksum: `seed-${source.key}`,
      metadataJson: JSON.stringify({ seeded: true }),
    }))
    for (const batch of chunks(runs, 20)) {
      client.db.insert(ingestionRuns).values(batch).run()
    }
  }
}

export function ensureSeededDatabase(client: DatabaseClient = getDbClient()) {
  migrateDatabase(client)

  const sourceCount = client.sqlite
    .prepare('SELECT COUNT(*) AS count FROM data_sources')
    .get() as { count: number }

  if (sourceCount.count === 0) {
    seedDatabase(client)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
  console.log('Database seeded.')
}
