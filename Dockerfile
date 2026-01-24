# Use Node.js LTS as base image
FROM docker.io/library/node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
# Override cache directory for container
ENV PUBLIC_CACHE_DIR=/tmp/.cache

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create cache directory and set permissions (the static PUBLIC_CACHE_DIR is /tmp/.cache)
RUN mkdir -p /tmp/.cache && chown -R nodejs:nodejs /tmp/.cache

# Ensure build directory is owned by nodejs (already copied as root)
RUN chown -R nodejs:nodejs /app/build

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "build"]
