#!/bin/sh
set -e

echo "[spec-forge] running database migrations..."
(cd /app/packages/db && pnpm migrate)

echo "[spec-forge] starting MCP server..."
exec pnpm exec tsx src/http.ts
