# Docker Compose Commands for Scaffold CLI

This document outlines the available Docker Compose commands for the scaffold CLI tool development environment.

## Available Services

- **dev**: Development environment with hot-reload
- **test**: Testing environment for running Jest tests
- **prod**: Production environment
- **lint**: ESLint checking
- **typecheck**: TypeScript type checking
- **build**: Build the TypeScript project

## Common Commands

### Development
```bash
# Start development environment with hot-reload
docker compose up dev

# Run a command in development environment
docker compose run --rm dev npm run build
docker compose run --rm dev npm run lint
docker compose run --rm dev npm run typecheck
```

### Testing
```bash
# Run test suite once
docker compose run --rm test

# Run tests in watch mode
docker compose run --rm test npm run test:watch

# Run tests with coverage
docker compose run --rm test npm run test:coverage
```

### Code Quality
```bash
# Run ESLint
docker compose run --rm dev npm run lint

# Run TypeScript type checking
docker compose run --rm dev npm run typecheck

# Build the project
docker compose run --rm dev npm run build
```

### Production
```bash
# Build and run production container
docker compose up prod --build
```

### Cleanup
```bash
# Stop all services
docker compose down

# Remove all containers and volumes
docker compose down -v

# Remove all images
docker compose down --rmi all
```

## Features

- **Hot-reload**: Development service automatically reloads on file changes
- **Volume mounting**: Source code is mounted for live editing
- **Node modules persistence**: Container node_modules are preserved for performance
- **Security**: Non-root user execution in containers
- **Networking**: Services can communicate through shared network
- **Environment isolation**: Each service has appropriate NODE_ENV settings