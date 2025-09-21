# Demo Templates

This directory contains demonstration templates and a pre-configured workspace for the Scaffold CLI.

## Directory Structure

```
demo-templates/
├── resources/          # Source template definitions
│   ├── react-typescript/
│   ├── nodejs-api/
│   └── python-fastapi/
└── workspace/          # Pre-configured scaffold workspace
    └── .scaffold/
        ├── config.json
        └── templates/  # Local template library
```

## Resources

The `resources/` directory contains the source definitions for three production-ready templates:

### React TypeScript Template
- Modern React 18 application
- TypeScript configuration
- Testing setup with Jest
- Component-based architecture

### Node.js API Template
- Express.js REST API
- TypeScript support
- Docker containerization
- Middleware and routing

### Python FastAPI Template
- FastAPI microservice
- Async support
- Pydantic models
- Docker configuration

## Workspace

The `workspace/` directory is a pre-configured Scaffold environment with all demo templates installed in the local library. This simulates a real development environment where templates are managed locally.

### Usage

```bash
cd demo-templates/workspace

# List available templates
scaffold template list

# Create a new project from template
scaffold new my-app --template react-typescript

# Validate template structure
scaffold template validate react-typescript
```

## Testing

The templates are validated by comprehensive unit tests that check:
- Template JSON structure
- File and folder definitions
- Variable substitution
- Naming conventions
- Rule compliance

Run tests with:
```bash
npm test -- tests/unit/templates/demo-templates.test.ts
```