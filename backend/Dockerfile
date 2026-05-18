# ============================================================
# backend/Dockerfile — Multi-stage production build
# Stage 1: deps  → install all dependencies
# Stage 2: build → compile TypeScript
# Stage 3: prod  → minimal runtime image
# ============================================================

# ─── STAGE 1: Dependencies ────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-constants/package.json ./packages/shared-constants/
COPY backend/package.json ./backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ─── STAGE 2: Build ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy source
COPY packages/ ./packages/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Generate Prisma client
RUN pnpm --filter backend exec prisma generate

# Compile TypeScript
RUN pnpm --filter backend build

# ─── STAGE 3: Production runtime ─────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 taxiflow

# Install pnpm for production deps
RUN npm install -g pnpm@9

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./

# Install production dependencies only
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory
RUN mkdir -p logs && chown -R taxiflow:nodejs logs

# Run as non-root user — security
USER taxiflow

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run migrations then start server
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/app.js"]
