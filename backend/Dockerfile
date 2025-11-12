# Backend Production Dockerfile
FROM node:18-bullseye AS base

# Install system dependencies including ClamAV for virus scanning
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    clamav \
    clamav-daemon \
    clamav-freshclam \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Initialize ClamAV virus definitions (run as root before switching user)
RUN freshclam --quiet || true

# Security: Run as non-root user
USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["npm", "run", "start"]