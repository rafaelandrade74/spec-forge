# Build context must be the monorepo root: docker build -f apps/cli/Dockerfile -t spec-forge-cli .
FROM node:22-bookworm-slim AS build

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/cli/package.json apps/cli/package.json

RUN pnpm install --frozen-lockfile --filter @spec-forge/cli...

COPY integrations/claude-skills integrations/claude-skills
COPY apps/cli apps/cli

RUN pnpm --filter @spec-forge/cli build

# apps/cli has zero runtime dependencies (only node:fs/path/os/readline/url), so the final image
# needs nothing beyond the compiled output — no node_modules, no package manager.
FROM node:22-alpine AS runtime

WORKDIR /app
COPY --from=build /app/apps/cli/dist ./dist
COPY --from=build /app/apps/cli/templates ./templates

ENTRYPOINT ["node", "/app/dist/index.js"]
CMD ["init"]
