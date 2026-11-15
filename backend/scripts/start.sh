#!/bin/sh
# Production start for the backend image.
# RUN_MIGRATIONS=true applies pending migrations first (for hosts without a separate
# release step, such as Render's free plan). Elsewhere run `make migrate` explicitly.
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  alembic upgrade head
fi

exec gunicorn app.main:app \
  -k uvicorn_worker.UvicornWorker \
  -b "0.0.0.0:${PORT:-8000}" \
  --access-logfile -
