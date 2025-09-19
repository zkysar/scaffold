FROM node:20-alpine

# Install testing tools and utilities
RUN apk add --no-cache \
    git \
    bash \
    curl

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S scaffold -u 1001 -G nodejs

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code and test files
COPY . .

# Build the project
RUN npm run build

# Change ownership of all files
RUN chown -R scaffold:nodejs /app

# Switch to non-root user
USER scaffold

# Default command runs test suite
CMD ["npm", "test"]