FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client (required before build)
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# Copy static assets (logos etc.)
RUN mkdir -p /app/assets && cp -R src/assets /app/dist/assets 2>/dev/null || true

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy prisma schema (needed for PrismaClient at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install production-only npm deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy assets
COPY --from=builder /app/src/assets ./assets

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main"]
