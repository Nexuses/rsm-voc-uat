#!/bin/sh
set -eu

max_attempts=30
attempt=1

until npm run db:migrate; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migration failed after ${max_attempts} attempts."
    exit 1
  fi

  echo "Database not ready yet (attempt ${attempt}/${max_attempts}). Retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

exec npm run start
