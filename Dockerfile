# Stage 1: Build
# check-ignore=critical_high_vulnerabilities
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies separately for cache
COPY package*.json ./
RUN npm ci

# Copy source, generate Prisma client, then build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
# check-ignore=critical_high_vulnerabilities
FROM node:22-alpine
WORKDIR /app

# Install runtime utilities (prisma for migrations, tsx for server)
# Note: Alpine includes wget natively, no need for curl
RUN npm install -g prisma tsx

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and necessary source files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
# Default database location inside the container volume
ENV DATABASE_URL="file:/app/data/dev.db"

RUN mkdir -p /app/data /app/uploads/landmarks

EXPOSE 3001

# Startup: migrate only when needed (see docker-entrypoint.sh for why), seed if empty, start server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
