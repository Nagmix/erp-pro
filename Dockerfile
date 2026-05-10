# ============================================================
# ERP Pro - Next.js Frontend Dockerfile
# ============================================================

FROM node:20-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install deps in this stage so .bin symlinks are valid (copying node_modules between stages can break `next` on Windows Docker).
# Use npm install (not ci) so a slightly out-of-sync lockfile still builds; refresh the lock locally when you can.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Generate Prisma client before build
RUN npx prisma generate

# Build arguments for environment variables
ARG BACKEND_HOST=http://backend:8000
ENV BACKEND_HOST=$BACKEND_HOST

# Set a dummy DATABASE_URL for Prisma during build (SQLite won't be used at build time)
ENV DATABASE_URL="file:./dev.db"

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy data directory for app config
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
