# Use Debian so better-sqlite3 native module works (Alpine/musl has fcntl64 symbol issues).
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# DB migrate only (no Next.js build). Use same deps so better-sqlite3 matches runtime.
FROM deps AS migrate-db
WORKDIR /app
COPY lib/db ./lib/db
ENV DATABASE_PATH=/data/pi-chat.sqlite
CMD ["pnpm", "exec", "tsx", "lib/db/migrate.ts"]

# One-off seed: mount pichatdata at /data, set DATABASE_PATH=/data/pi-chat.sqlite and TEST_EMAIL/TEST_PASSWORD
FROM deps AS seed
WORKDIR /app
COPY tests/seed-test-user.ts ./
RUN pnpm add -D tsx dotenv bcrypt-ts
ENV DATABASE_PATH=/data/pi-chat.sqlite
CMD ["pnpm", "exec", "tsx", "seed-test-user.ts"]
