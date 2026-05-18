#!/bin/sh
set -eu

: "${DATABASE_URL:=/app/data/indonesia_dashboard.sqlite}"
export DATABASE_URL

npm run db:migrate
npm run db:seed

case "${1:-app}" in
  app)
    exec npm run start -- --host 0.0.0.0
    ;;
  worker)
    exec npm run worker
    ;;
  ingest-all)
    exec npm run ingest:all
    ;;
  *)
    exec "$@"
    ;;
esac
