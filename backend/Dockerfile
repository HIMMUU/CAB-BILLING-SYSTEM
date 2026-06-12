FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Force NODE_ENV=development so npm ci installs ALL deps including devDependencies
# (Railway sets NODE_ENV=production in build env which skips devDeps — we override it here)
RUN NODE_ENV=development npm ci

# Copy full source
COPY . .

# Generate Prisma client
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
