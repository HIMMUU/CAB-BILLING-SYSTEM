# Use lightweight Node 22 alpine image
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PING_TARGET_URL=https://cab-billing-system.onrender.com/health
ENV PING_INTERVAL_MS=30000

CMD ["node", "dist/pinger.js"]
