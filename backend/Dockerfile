# Multi-stage Build Dockerfile for NestJS Backend API

# --- BUILD STAGE ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy application code
COPY . .

# Generate Prisma Client and build TypeScript source
RUN npx prisma generate
RUN npm run build

# --- PRODUCTION RUNTIME STAGE ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built bundles and required files
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]
