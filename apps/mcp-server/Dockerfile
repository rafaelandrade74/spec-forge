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

WORKDIR /app/apps/mcp-server

ENV NODE_ENV=production
EXPOSE 8787

CMD ["pnpm", "exec", "tsx", "src/http.ts"]
