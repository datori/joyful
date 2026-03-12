# Standalone joyful-server: single container, no external dependencies
# Uses PGlite (embedded Postgres), local filesystem storage, no Redis

# Stage 1: install dependencies
FROM node:20 AS deps

RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json yarn.lock ./
COPY scripts ./scripts

RUN mkdir -p packages/joyful-app packages/joyful-server packages/joyful-cli packages/joyful-agent packages/joyful-wire

COPY packages/joyful-app/package.json packages/joyful-app/
COPY packages/joyful-server/package.json packages/joyful-server/
COPY packages/joyful-cli/package.json packages/joyful-cli/
COPY packages/joyful-agent/package.json packages/joyful-agent/
COPY packages/joyful-wire/package.json packages/joyful-wire/

# Workspace postinstall requirements
COPY packages/joyful-app/patches packages/joyful-app/patches
COPY packages/joyful-server/prisma packages/joyful-server/prisma
COPY packages/joyful-cli/scripts packages/joyful-cli/scripts
COPY packages/joyful-cli/tools packages/joyful-cli/tools

RUN SKIP_JOYFUL_WIRE_BUILD=1 yarn install --frozen-lockfile --ignore-engines

# Stage 2: copy source and type-check
FROM deps AS builder

COPY packages/joyful-wire ./packages/joyful-wire
COPY packages/joyful-server ./packages/joyful-server

RUN yarn workspace joyful-wire build
RUN yarn workspace joyful-server build

# Stage 3: runtime
FROM node:20-slim AS runner

WORKDIR /repo

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PGLITE_DIR=/data/pglite

COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/packages/joyful-wire /repo/packages/joyful-wire
COPY --from=builder /repo/packages/joyful-server /repo/packages/joyful-server

VOLUME /data
EXPOSE 3005

CMD ["sh", "-c", "node_modules/.bin/tsx packages/joyful-server/sources/standalone.ts migrate && exec node_modules/.bin/tsx packages/joyful-server/sources/standalone.ts serve"]
