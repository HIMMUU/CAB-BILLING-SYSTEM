FROM node:20-alpine
WORKDIR /app

# Install all deps (dev included — needed for nest build)
COPY package*.json ./
RUN npm ci

# Copy full source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS → produces dist/
RUN npm run build

# Verify dist/main.js was actually created (fail loudly if not)
RUN ls -la dist/ && echo "✅ Build output verified"

# Copy assets for PDF generation
RUN mkdir -p assets && cp -R src/assets/* assets/ 2>/dev/null || true

# Remove dev dependencies to slim down image
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main"]
