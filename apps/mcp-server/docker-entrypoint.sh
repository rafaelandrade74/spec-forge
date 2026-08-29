#!/bin/sh
# Used only by the "migrate" service in docker-compose.prod.yml (overrides this image's default
# entrypoint/CMD). Runs once, then exits — every other service waits on it via
# `condition: service_completed_successfully` before starting.
set -e

echo "[spec-forge] running database migrations..."
cd /app/packages/db && pnpm migrate
