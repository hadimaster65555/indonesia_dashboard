import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const dataSources = sqliteTable(
  'data_sources',
  {
    key: text('key').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    method: text('method').notNull().default('GET'),
    cadence: text('cadence').notNull(),
    expectedReleaseWindow: text('expected_release_window'),
    attribution: text('attribution').notNull(),
    parserType: text('parser_type').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('data_sources_enabled_idx').on(table.enabled),
    index('data_sources_cadence_idx').on(table.cadence),
  ],
)

export const ingestionRuns = sqliteTable(
  'ingestion_runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceKey: text('source_key')
      .notNull()
      .references(() => dataSources.key, { onDelete: 'cascade' }),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    status: text('status').notNull(),
    rowsInserted: integer('rows_inserted').notNull().default(0),
    checksum: text('checksum'),
    errorMessage: text('error_message'),
    metadataJson: text('metadata_json'),
  },
  (table) => [
    index('ingestion_runs_source_started_idx').on(table.sourceKey, table.startedAt),
    index('ingestion_runs_status_idx').on(table.status),
  ],
)

export const sourceSnapshots = sqliteTable(
  'source_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceKey: text('source_key')
      .notNull()
      .references(() => dataSources.key, { onDelete: 'cascade' }),
    fetchedAt: text('fetched_at').notNull(),
    period: text('period'),
    url: text('url').notNull(),
    contentType: text('content_type').notNull(),
    rawBody: text('raw_body').notNull(),
    hash: text('hash').notNull(),
    sourceRunId: integer('source_run_id').references(() => ingestionRuns.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    uniqueIndex('source_snapshots_hash_idx').on(table.sourceKey, table.hash),
    index('source_snapshots_source_fetched_idx').on(table.sourceKey, table.fetchedAt),
  ],
)

export const metrics = sqliteTable(
  'metrics',
  {
    key: text('key').primaryKey(),
    label: text('label').notNull(),
    domain: text('domain').notNull(),
    unit: text('unit').notNull(),
    geographyLevel: text('geography_level').notNull(),
    sourceKey: text('source_key')
      .notNull()
      .references(() => dataSources.key, { onDelete: 'restrict' }),
    updateCadence: text('update_cadence').notNull(),
    description: text('description'),
    transformationNote: text('transformation_note'),
  },
  (table) => [
    index('metrics_domain_idx').on(table.domain),
    index('metrics_source_idx').on(table.sourceKey),
  ],
)

export const regions = sqliteTable(
  'regions',
  {
    code: text('code').primaryKey(),
    bpsCode: text('bps_code').notNull(),
    kemendagriCode: text('kemendagri_code'),
    name: text('name').notNull(),
    level: text('level').notNull(),
    parentCode: text('parent_code'),
    provinceCode: text('province_code'),
    regencyCode: text('regency_code'),
    latitude: real('latitude'),
    longitude: real('longitude'),
  },
  (table) => [
    index('regions_level_idx').on(table.level),
    index('regions_parent_idx').on(table.parentCode),
  ],
)

export const metricObservations = sqliteTable(
  'metric_observations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    metricKey: text('metric_key')
      .notNull()
      .references(() => metrics.key, { onDelete: 'cascade' }),
    geographyCode: text('geography_code')
      .notNull()
      .references(() => regions.code, { onDelete: 'restrict' }),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    value: real('value').notNull(),
    unit: text('unit').notNull(),
    sourceRunId: integer('source_run_id').references(() => ingestionRuns.id, {
      onDelete: 'set null',
    }),
    qualityFlag: text('quality_flag').notNull().default('official'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('metric_observations_natural_idx').on(
      table.metricKey,
      table.geographyCode,
      table.periodStart,
      table.periodEnd,
      table.unit,
    ),
    index('metric_observations_metric_period_idx').on(table.metricKey, table.periodStart),
    index('metric_observations_geo_idx').on(table.geographyCode),
  ],
)

export const alerts = sqliteTable(
  'alerts',
  {
    key: text('key').primaryKey(),
    severity: text('severity').notNull(),
    metricKey: text('metric_key').references(() => metrics.key, { onDelete: 'set null' }),
    geographyCode: text('geography_code').references(() => regions.code, {
      onDelete: 'set null',
    }),
    explanation: text('explanation').notNull(),
    status: text('status').notNull().default('open'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('alerts_status_idx').on(table.status),
    index('alerts_severity_idx').on(table.severity),
  ],
)

export const targets = sqliteTable(
  'targets',
  {
    key: text('key').primaryKey(),
    label: text('label').notNull(),
    ownerAgency: text('owner_agency').notNull(),
    metricKey: text('metric_key')
      .notNull()
      .references(() => metrics.key, { onDelete: 'cascade' }),
    geographyCode: text('geography_code').references(() => regions.code, {
      onDelete: 'set null',
    }),
    baselineValue: real('baseline_value').notNull(),
    targetValue: real('target_value').notNull(),
    unit: text('unit').notNull(),
    deadline: text('deadline').notNull(),
    status: text('status').notNull().default('on_track'),
  },
  (table) => [
    index('targets_metric_idx').on(table.metricKey),
    index('targets_owner_idx').on(table.ownerAgency),
  ],
)

export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  runs: many(ingestionRuns),
  snapshots: many(sourceSnapshots),
  metrics: many(metrics),
}))

export const metricsRelations = relations(metrics, ({ many, one }) => ({
  source: one(dataSources, {
    fields: [metrics.sourceKey],
    references: [dataSources.key],
  }),
  observations: many(metricObservations),
  alerts: many(alerts),
  targets: many(targets),
}))

export const metricObservationsRelations = relations(metricObservations, ({ one }) => ({
  metric: one(metrics, {
    fields: [metricObservations.metricKey],
    references: [metrics.key],
  }),
  region: one(regions, {
    fields: [metricObservations.geographyCode],
    references: [regions.code],
  }),
  run: one(ingestionRuns, {
    fields: [metricObservations.sourceRunId],
    references: [ingestionRuns.id],
  }),
}))

export const ingestionRunsRelations = relations(ingestionRuns, ({ one, many }) => ({
  source: one(dataSources, {
    fields: [ingestionRuns.sourceKey],
    references: [dataSources.key],
  }),
  snapshots: many(sourceSnapshots),
  observations: many(metricObservations),
}))

export const regionsRelations = relations(regions, ({ many }) => ({
  observations: many(metricObservations),
  alerts: many(alerts),
  targets: many(targets),
}))

export type DataSource = typeof dataSources.$inferSelect
export type NewDataSource = typeof dataSources.$inferInsert
export type IngestionRun = typeof ingestionRuns.$inferSelect
export type Metric = typeof metrics.$inferSelect
export type MetricObservation = typeof metricObservations.$inferSelect
export type Region = typeof regions.$inferSelect
export type Alert = typeof alerts.$inferSelect
export type Target = typeof targets.$inferSelect
