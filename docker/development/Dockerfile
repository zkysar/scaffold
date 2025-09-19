FROM node:20-alpine

# Install development tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    vim \
    && npm install -g nodemon

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S scaffold -u 1001 -G nodejs

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Change ownership of node_modules
RUN chown -R scaffold:nodejs /app

# Switch to non-root user
USER scaffold

# Copy entrypoint script
COPY docker/development/entrypoint.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/entrypoint.sh
USER scaffold

# Expose port for potential web interfaces
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command for development with hot-reload
CMD ["npm", "run", "dev"]