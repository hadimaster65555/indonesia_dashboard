# Indonesia Governance Dashboard

A TanStack Start dashboard for monitoring Indonesian public governance signals from official and public institutional data sources. The app uses SQLite as its local warehouse, keeps raw source responses for auditability, and runs a separate Node worker for scheduled ingestion.

## What It Does

- Daily Brief: current alerts, source freshness, largest metric movements, ministry targets, and regional intervention priorities.
- Economy: GDP growth, inflation, unemployment, poverty, Gini, rupiah pressure, BI rate, and reserves.
- Budget: APBN revenue realization, spending realization, deficit pressure, and ministry burn rate.
- Procurement: award value, single-bid risk, delayed procurement, and supplier concentration.
- People: stunting, education completion, poverty, inequality, and youth labor indicators.
- Regions: province priority ranking with score, budget absorption, poverty, and a map-style intervention view.
- Disaster & Climate: BMKG weather warnings, earthquake signals, BNPB incidents, and affected population.
- Source Health: last run, parser type, rows inserted, freshness status, stale-source detection, and official attribution links.
- Data credibility layer: raw snapshots, checksums, scrape runs, parser status, quality flags, source URLs, and transformation notes.

## Architecture

- Frontend/full-stack: TanStack Start, TanStack Router, TanStack Query, React, TypeScript, Tailwind CSS, Recharts, TanStack Table.
- Database: SQLite with WAL mode enabled for concurrent dashboard reads and worker writes.
- ORM/schema: Drizzle ORM table definitions plus SQL migration files.
- Worker: separate Node process using `node-cron`, source-specific adapters, checksums, retries-ready run records, and idempotent upserts.
- Storage:
  - `data_sources`: source registry, cadence, parser type, URL, attribution.
  - `ingestion_runs`: run status, timestamps, rows inserted, checksum, errors.
  - `source_snapshots`: raw HTML/JSON/text payloads, content type, hash, fetch time.
  - `metrics`: metric catalog, domain, unit, geography level, source.
  - `metric_observations`: normalized time-series observations.
  - `regions`: national and province reference records.
  - `alerts`: command-center risk alerts.
  - `targets`: ministry or policy targets and progress tracking.

## Data Sources

| Source key | Source | Cadence | Adapter | Data captured | Why it matters |
|---|---|---:|---|---|---|
| `bmkg-weather` | BMKG Weather and Earthquake API, `https://data.bmkg.go.id/prakiraan-cuaca/` | Every 3 hours | JSON REST | Weather warning count, earthquake count, forecast snapshot metadata | Early warning for disaster escalation, logistics planning, and regional risk response. |
| `bi-jisdor` | Bank Indonesia JISDOR, `https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/Default.aspx` | Business-day morning | HTML table | USD/IDR reference rate | Tracks rupiah pressure, market stress, imported inflation risk, and policy communication needs. |
| `lkpp-ckan` | LKPP Open Data, `https://data.lkpp.go.id/` | Daily | CKAN | Procurement award value and package metadata | Supports procurement risk monitoring, supplier concentration checks, and delayed tender detection. |
| `bnpb-ckan` | BNPB Open Data CKAN, `https://data.bnpb.go.id/api/3` | Daily | CKAN | Disaster incident package count and incident metadata | Gives operational visibility into disaster frequency and affected regions. |
| `satu-data-index` | Satu Data Indonesia, `https://data.go.id/` | Daily metadata check | Freshness checker | Dataset metadata hash and freshness state | Detects newly published or updated government datasets across ministries and regions. |
| `satu-data-priority` | Satu Data Indonesia selected datasets, `https://data.go.id/` | Weekly | File/download parser | Priority regional indicators such as stunting and budget absorption | Feeds regional intervention ranking and social policy monitoring. |
| `bps-webapi` | BPS WebAPI, `https://webapi.bps.go.id/developer/` | Daily checks during release windows | JSON REST freshness check | Inflation, GDP, labor, poverty, Gini, regional poverty references | BPS is the official statistical source for macro, welfare, labor, and regional conditions. |
| `bi-seki` | BI SEKI/SSKI/SULNI, `https://www.bi.go.id/id/statistik/ekonomi-keuangan/seki/Default.aspx` | Monthly release window | File/download parser | BI rate and foreign reserves references | Monitors monetary stance, financial stability, external buffers, and balance-of-payments pressure. |
| `kemenkeu-apbn` | Kementerian Keuangan APBN pages, `https://www.kemenkeu.go.id/informasi-publik/anggaran-dan-realisasi-keuangan` | Monthly | HTML table | APBN revenue, spending, deficit, burn-rate indicators | Tracks fiscal execution, budget under-realization, and deficit pressure. |
| `world-bank` | World Bank Indicators API, `https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation` | Quarterly/annual | JSON REST freshness check | International benchmark metadata | Provides cross-country comparison for GDP per capita, poverty, governance, and human-capital context. |
| `imf-datamapper` | IMF DataMapper API, `https://www.imf.org/external/datamapper/api/` | Quarterly/annual | JSON REST freshness check | International macro benchmark metadata | Useful for external validation of growth, debt, fiscal, and macro outlook indicators. |

## Metric Catalog

| Domain | Metric key | Label | Unit | Geography | Source | Importance |
|---|---|---|---|---|---|---|
| Economy | `usd_idr_jisdor` | USD/IDR JISDOR | IDR/USD | National | BI JISDOR | Rupiah pressure and imported inflation risk. |
| Economy | `inflation_yoy` | Inflation | `% YoY` | National | BPS WebAPI | Household purchasing power and macro stability. |
| Economy | `gdp_growth_yoy` | GDP Growth | `% YoY` | National | BPS WebAPI | Growth momentum and policy performance. |
| Economy | `unemployment_rate` | Open Unemployment | `%` | National | BPS WebAPI | Labor-market stress and job creation. |
| Economy | `poverty_rate` | Poverty Rate | `%` | National | BPS WebAPI | Welfare outcomes and intervention need. |
| Economy | `gini_ratio` | Gini Ratio | Index | National | BPS WebAPI | Inequality and distributional pressure. |
| Economy | `policy_rate` | BI Rate | `%` | National | BI SEKI | Monetary policy stance. |
| Economy | `foreign_reserves` | Foreign Reserves | USD bn | National | BI SEKI | External resilience and currency defense capacity. |
| Budget | `apbn_revenue_realization` | APBN Revenue Realization | `% of target` | National | Kemenkeu | Revenue collection and fiscal space. |
| Budget | `apbn_spending_realization` | APBN Spending Realization | `% of allocation` | National | Kemenkeu | Budget execution and service delivery. |
| Budget | `deficit_to_gdp` | APBN Deficit | `% of GDP` | National | Kemenkeu | Fiscal sustainability and financing pressure. |
| Budget | `ministry_burn_rate` | Ministry Burn Rate | `% of allocation` | National | Kemenkeu | Ministry accountability and absorption risk. |
| Procurement | `procurement_award_value` | Procurement Award Value | IDR tn | National | LKPP | Contracting pace and economic execution. |
| Procurement | `single_bid_share` | Single-Bid Risk | `% tenders` | National | LKPP | Competition risk and procurement anomaly screening. |
| Procurement | `delayed_procurement_share` | Delayed Procurement | `% packages` | National | LKPP | Project delay and budget execution risk. |
| Procurement | `supplier_concentration` | Supplier Concentration | HHI | National | LKPP | Market concentration and capture risk. |
| People | `stunting_prevalence` | Stunting Prevalence | `% children` | National | Satu Data | Human-capital and health priority. |
| People | `education_completion` | Senior Secondary Completion | `% cohort` | National | Satu Data | Education outcomes and workforce readiness. |
| People | `youth_unemployment` | Youth Unemployment | `%` | National | BPS WebAPI | Youth labor stress and social risk. |
| Regions | `regional_intervention_score` | Intervention Priority Score | Score | Province | Satu Data | Combined ranking for poverty, stunting, food inflation, budget absorption, disaster exposure, education, and labor signals. |
| Regions | `regional_budget_absorption` | Regional Budget Absorption | `%` | Province | Satu Data | Identifies regions needing fiscal execution support. |
| Regions | `regional_poverty_rate` | Regional Poverty Rate | `%` | Province | BPS WebAPI | Regional welfare targeting. |
| Disaster | `earthquake_count` | Earthquake Count | Events | National | BMKG | Disaster monitoring and response readiness. |
| Disaster | `weather_warning_count` | Weather Warnings | Warnings | National | BMKG | Weather-related risk escalation. |
| Disaster | `disaster_incidents` | BNPB Incidents | Incidents | National | BNPB | Disaster frequency and response load. |
| Disaster | `affected_population` | Affected Population | People | National | BNPB | Human impact and relief prioritization. |

Seed data is representative demo data shaped like official observations. Live ingestion stores official raw responses in `source_snapshots` and normalized values in `metric_observations`.

## Local Development

```bash
source ~/.nvm/nvm.sh && nvm use node
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://127.0.0.1:3000/`.

The SQLite database defaults to `data/indonesia_dashboard.sqlite`. Override it with:

```bash
DATABASE_URL=/absolute/path/to/indonesia_dashboard.sqlite npm run dev
```

## Ingestion

Run the long-lived scheduler:

```bash
npm run worker
```

Run all enabled sources once:

```bash
npm run ingest:all
```

Run one source:

```bash
npm run ingest:source -- bmkg-weather
npm run ingest:source -- bi-jisdor
npm run ingest:source -- lkpp-ckan
```

The ingestion runner:

- creates an `ingestion_runs` row for every attempt;
- stores raw responses in `source_snapshots`;
- hashes payloads and normalized observations;
- skips duplicate checksums;
- upserts observations by metric, geography, period, and unit;
- records parser errors without deleting existing data.

## Docker Deployment

This repo includes a production-oriented Dockerfile and compose file. The app and worker share the same SQLite volume.

Build and run both dashboard and worker:

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:3000/
```

View logs:

```bash
docker compose logs -f dashboard
docker compose logs -f worker
```

Run one-off ingestion inside Docker:

```bash
docker compose run --rm dashboard ingest-all
docker compose run --rm dashboard npm run ingest:source -- bi-jisdor
```

Stop services:

```bash
docker compose down
```

Stop services and delete the SQLite volume:

```bash
docker compose down -v
```

### Docker Environment

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `/app/data/indonesia_dashboard.sqlite` | SQLite file path inside the container. |
| `NODE_ENV` | `production` | Runtime mode. |
| `PORT` | `3000` | Container HTTP port. |
| `HOST` | `0.0.0.0` | Bind address for container networking. |

The entrypoint runs `db:migrate` and `db:seed` before starting the app or worker. Seed inserts are idempotent, so restarting containers does not duplicate baseline rows.

## Scripts

- `dev`: starts the TanStack Start dev server.
- `build`: builds the client and server bundles.
- `start`: runs `vite preview` for the built app.
- `worker`: starts the cron ingestion worker.
- `db:migrate`: applies SQL migrations and enables WAL mode.
- `db:seed`: inserts baseline sources, metrics, regions, observations, targets, and alerts.
- `ingest:source -- <source-key>`: runs one source adapter.
- `ingest:all`: runs every enabled source once.
- `typecheck`: runs TypeScript without emitting files.
- `test`: unit/integration tests for parsers and SQLite ingestion writes.
- `test:e2e`: Playwright browser checks. Run `npx playwright install` once if browsers are not installed.

## Verification

```bash
npm run typecheck
npm run test
npm run build
```

Optional browser checks:

```bash
npx playwright install
npm run test:e2e
```

## Operational Notes

- SQLite WAL is enabled in `src/db/connection.ts` for concurrent app reads and worker writes.
- BMKG weather data should respect the published API limits. The worker is intentionally scheduled every three hours.
- Monthly and quarterly sources can be checked daily but should only be considered updated when a new official release appears.
- Raw snapshots are retained for auditability; plan retention or archival if the database grows.
- Sensitive or patient-level health data is out of scope for this v1 dashboard.
