#!/bin/bash
set -e

# Function to handle graceful shutdown
cleanup() {
    echo "Shutting down development server..."
    kill -TERM "$child" 2>/dev/null || true
    wait "$child"
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Install/update dependencies if package.json changed
if [ -f package.json ] && [ -f package-lock.json ]; then
    if [ package.json -nt node_modules/.package-lock.json ] 2>/dev/null; then
        echo "Package.json has changed, updating dependencies..."
        npm ci --include=dev
        touch node_modules/.package-lock.json
    fi
fi

# Execute the command
exec "$@" &
child=$!

# Wait for the process
wait "$child"