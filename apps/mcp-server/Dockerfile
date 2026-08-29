# Build context must be the monorepo root: docker build -f apps/mcp-server/Dockerfile .
FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
COPY apps/mcp-server/package.json apps/mcp-server/package.json

RUN pnpm install --frozen-lockfile --filter @spec-forge/mcp-server...

COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/mcp-server apps/mcp-server

RUN chmod +x apps/mcp-server/docker-entrypoint.sh

WORKDIR /app/apps/mcp-server

ENV NODE_ENV=production
EXPOSE 8787

# Default CMD starts the server directly — no migration here. Migrations run once via a
# dedicated "migrate" service in docker-compose.prod.yml (overriding this image's entrypoint to
# ./docker-entrypoint.sh instead), which every other service waits on with
# `condition: service_completed_successfully`. Running migrations from each app container's own
# entrypoint independently would race on a fresh database — mcp-server and web start in parallel
# once postgres is healthy, and drizzle's migrate() has no built-in locking against two
# concurrent runs trying to create the same tables.
CMD ["pnpm", "exec", "tsx", "src/http.ts"]
