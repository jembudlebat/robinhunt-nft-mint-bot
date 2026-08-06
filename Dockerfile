# Multi-stage build for production optimization
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install build dependencies & sqlite native tools
RUN apk add --no-co-cache python3 make g++

# Install dependencies
RUN npm ci

# Copy source files & build TypeScript
COPY src ./src
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install sqlite runtime dependencies
RUN apk add --no-co-cache sqlite

# Copy built application and package files
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create persistent data volume directory
RUN mkdir -p /app/data

VOLUME ["/app/data"]

# Run as non-root user for security
USER node

CMD ["node", "dist/index.js"]
