CREATE TABLE IF NOT EXISTS data_sources (
  key TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  cadence TEXT NOT NULL,
  expected_release_window TEXT,
  attribution TEXT NOT NULL,
  parser_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS data_sources_enabled_idx ON data_sources(enabled);
CREATE INDEX IF NOT EXISTS data_sources_cadence_idx ON data_sources(cadence);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL REFERENCES data_sources(key) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  error_message TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS ingestion_runs_source_started_idx ON ingestion_runs(source_key, started_at);
CREATE INDEX IF NOT EXISTS ingestion_runs_status_idx ON ingestion_runs(status);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL REFERENCES data_sources(key) ON DELETE CASCADE,
  fetched_at TEXT NOT NULL,
  period TEXT,
  url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  raw_body TEXT NOT NULL,
  hash TEXT NOT NULL,
  source_run_id INTEGER REFERENCES ingestion_runs(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS source_snapshots_hash_idx ON source_snapshots(source_key, hash);
CREATE INDEX IF NOT EXISTS source_snapshots_source_fetched_idx ON source_snapshots(source_key, fetched_at);

CREATE TABLE IF NOT EXISTS metrics (
  key TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  domain TEXT NOT NULL,
  unit TEXT NOT NULL,
  geography_level TEXT NOT NULL,
  source_key TEXT NOT NULL REFERENCES data_sources(key) ON DELETE RESTRICT,
  update_cadence TEXT NOT NULL,
  description TEXT,
  transformation_note TEXT
);

CREATE INDEX IF NOT EXISTS metrics_domain_idx ON metrics(domain);
CREATE INDEX IF NOT EXISTS metrics_source_idx ON metrics(source_key);

CREATE TABLE IF NOT EXISTS regions (
  code TEXT PRIMARY KEY NOT NULL,
  bps_code TEXT NOT NULL,
  kemendagri_code TEXT,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code TEXT,
  province_code TEXT,
  regency_code TEXT,
  latitude REAL,
  longitude REAL
);

CREATE INDEX IF NOT EXISTS regions_level_idx ON regions(level);
CREATE INDEX IF NOT EXISTS regions_parent_idx ON regions(parent_code);

CREATE TABLE IF NOT EXISTS metric_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT NOT NULL REFERENCES metrics(key) ON DELETE CASCADE,
  geography_code TEXT NOT NULL REFERENCES regions(code) ON DELETE RESTRICT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  source_run_id INTEGER REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  quality_flag TEXT NOT NULL DEFAULT 'official',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS metric_observations_natural_idx
  ON metric_observations(metric_key, geography_code, period_start, period_end, unit);
CREATE INDEX IF NOT EXISTS metric_observations_metric_period_idx ON metric_observations(metric_key, period_start);
CREATE INDEX IF NOT EXISTS metric_observations_geo_idx ON metric_observations(geography_code);

CREATE TABLE IF NOT EXISTS alerts (
  key TEXT PRIMARY KEY NOT NULL,
  severity TEXT NOT NULL,
  metric_key TEXT REFERENCES metrics(key) ON DELETE SET NULL,
  geography_code TEXT REFERENCES regions(code) ON DELETE SET NULL,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts(status);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts(severity);

CREATE TABLE IF NOT EXISTS targets (
  key TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  owner_agency TEXT NOT NULL,
  metric_key TEXT NOT NULL REFERENCES metrics(key) ON DELETE CASCADE,
  geography_code TEXT REFERENCES regions(code) ON DELETE SET NULL,
  baseline_value REAL NOT NULL,
  target_value REAL NOT NULL,
  unit TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track'
);

CREATE INDEX IF NOT EXISTS targets_metric_idx ON targets(metric_key);
CREATE INDEX IF NOT EXISTS targets_owner_idx ON targets(owner_agency);
