# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies separately for cache
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
RUN npx prisma generate

# Stage 2: Runner
FROM node:22-alpine
WORKDIR /app

# Install runtime utilities (prisma for migrations, tsx for server, curl for healthcheck)
RUN npm install -g prisma tsx
RUN apk add --no-cache curl

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

RUN mkdir -p /app/data

EXPOSE 3001

# Initialize DB (migrate), seed if empty, and start server
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && tsx server/index.ts"]
