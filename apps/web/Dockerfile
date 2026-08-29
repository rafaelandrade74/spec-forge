# Build context must be the monorepo root: docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @spec-forge/web...

COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/web apps/web

WORKDIR /app/apps/web

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
