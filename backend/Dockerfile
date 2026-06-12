FROM node:20-slim
WORKDIR /app

# Install OpenSSL (required by Prisma engine on Debian/slim)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Force NODE_ENV=development so npm ci installs ALL deps including devDependencies
RUN NODE_ENV=development npm ci

# Copy full source
COPY . .

# Generate Prisma client (targets linux-openssl-3.0.x for Debian)
RUN NODE_ENV=development npx prisma generate

# Build NestJS → produces dist/
RUN NODE_ENV=development npm run build

# Verify dist/main.js was actually created — fails loudly if not
RUN test -f dist/main.js && echo "✅ dist/main.js exists" || (echo "❌ dist/main.js MISSING — build failed" && exit 1)

# Copy assets for PDF generation
RUN mkdir -p assets && cp -R src/assets/* assets/ 2>/dev/null || true

# Remove dev dependencies for smaller runtime image
RUN npm prune --omit=dev

# Runtime environment
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main"]
