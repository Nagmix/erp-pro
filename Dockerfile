# ============================================================
# ERP Pro - Next.js Frontend Dockerfile
# ============================================================
# هذا الملف يشغّل الواجهة الأمامية فقط (Next.js)
# ERPNext الخلفي يحتاج خدمة منفصلة على Railway
# ============================================================

FROM node:20-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy prisma schema FIRST so prisma generate can find it during npm install
COPY prisma ./prisma

# Install deps
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy the rest of the source code
COPY . .

# Generate Prisma client (guaranteed to work — schema is present)
RUN npx prisma generate

# Build arguments for environment variables
ARG BACKEND_HOST=http://backend:8000
ENV BACKEND_HOST=$BACKEND_HOST

# Set a dummy DATABASE_URL for Prisma during build
ENV DATABASE_URL="file:./dev.db"

# Build Next.js (standalone output)
RUN npx next build --webpack

# Post-build: copy static files into standalone directory (replaces bash script)
RUN if [ -d .next/static ] && [ -d .next/standalone ]; then \
      cp -r .next/static .next/standalone/.next/ && \
      echo "✓ Copied .next/static → standalone"; \
    fi && \
    if [ -d public ] && [ -d .next/standalone ]; then \
      cp -r public .next/standalone/ && \
      echo "✓ Copied public → standalone"; \
    fi && \
    if [ -f .env ] && [ -d .next/standalone ]; then \
      cp .env .next/standalone/.env && \
      echo "✓ Copied .env → standalone"; \
    fi

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
# Ensure data dir exists in builder stage (in case .dockerignore was set)
RUN mkdir -p /app/data
COPY --from=builder /app/data ./data
RUN chown -R nextjs:nodejs /app/data
# Bake a restore copy of the app-config data (used when /app/data is a persistent volume)
RUN cp -a /app/data /app/data_baked

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# SEC-05/SEC-07: لا أسرار ولا أهداف خادم مدمجة في الصورة.
# بيانات الاتصال والأسرار تُمرَّر وقت التشغيل عبر متغيرات البيئة
# (BACKEND_HOST / AUTH_JWT_SECRET / ... — راجع .env.example).
ARG BACKEND_SITE_NAME=erppro
ENV BACKEND_SITE_NAME=$BACKEND_SITE_NAME
ARG BACKEND_ADMIN_USER=Administrator
ENV BACKEND_ADMIN_USER=$BACKEND_ADMIN_USER
# SEC-07: AUTH_JWT_SECRET إلزامي وقت التشغيل (jwt-secret.ts يرفض البدء بدونه) —
# لا توليد وقت البناء: نفس الصورة لكل الحاويات + لا أسرار في طبقات الصورة.

CMD ["node", "server.js"]
