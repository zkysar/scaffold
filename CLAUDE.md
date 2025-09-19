# Scaffold CLI Development Guidelines

Auto-generated from feature plans. Last updated: 2025-09-18

## Active Technologies
- Node.js 20+ with TypeScript 5.3+ (001-scaffold-cli-tool)
- Commander.js for CLI framework
- Jest for testing framework
- fs-extra for file operations

## Project Structure
```
src/
├── models/        # Data models and interfaces
├── services/      # Business logic
├── cli/          # CLI command handlers
└── lib/          # Utility functions

tests/
├── contract/     # Contract validation tests
├── integration/  # End-to-end tests
└── unit/        # Unit tests

docker/
├── development/  # Development container config
├── testing/      # Test container config
└── production/   # Production container config

specs/001-scaffold-cli-tool/
├── spec.md       # Feature specification
├── plan.md       # Implementation plan
├── research.md   # Technical research
├── data-model.md # Data structures
├── quickstart.md # Usage guide
└── contracts/    # Command contracts
```

## Key Commands
```bash
# Development (Containerized)
docker-compose up dev              # Start development container with hot-reload
docker-compose run test           # Run test suite in container
docker-compose run test:watch     # Run tests in watch mode
docker-compose run lint           # Run ESLint in container
docker-compose run typecheck      # Run TypeScript compiler checks
docker-compose build              # Build all containers

# Local Development (if needed)
npm install              # Install dependencies locally
npm run build           # Compile TypeScript
npm test               # Run test suite
npm run test:watch     # Run tests in watch mode
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript compiler checks

# CLI Commands (after build)
scaffold new <project>              # Create new project
scaffold template <action>          # Manage templates
scaffold check [project]           # Validate structure (read-only)
scaffold fix [project]             # Fix structure issues
scaffold extend <project>          # Add templates
scaffold clean                     # Cleanup temp files
```

## Code Style
- TypeScript: Use strict mode, explicit types for public APIs
- File naming: kebab-case for files, PascalCase for classes
- Async/await over callbacks
- Functional programming where appropriate
- Early returns for error conditions
- Comprehensive error messages with recovery suggestions

## Testing Requirements
- All tests run in Docker containers for consistency
- Unit tests for all services and models (containerized)
- Integration tests for CLI commands (containerized)
- Mock file system for unit tests (mock-fs)
- Container volumes for integration test isolation
- Minimum 80% code coverage
- Test error conditions and edge cases
- Docker Compose orchestration for test suites

## Recent Feature Implementations

- **001-scaffold-cli-tool**: Core CLI implementation with template management, project creation/validation/fix, configuration cascade

## Data Models
### Core Entities
- **Template**: Reusable project structure definitions
- **ProjectManifest**: Tracks scaffold-managed projects
- **Configuration**: Cascading settings (global > workspace > project)
- **ValidationReport**: Structure validation results

### Key Interfaces
```typescript
interface Template {
  name: string;
  version: string;
  folders: FolderDefinition[];
  files: FileDefinition[];
  variables: TemplateVariable[];
  rules: TemplateRules;
}

interface ProjectManifest {
  version: string;
  projectName: string;
  templates: AppliedTemplate[];
  variables: Record<string, string>;
  history: HistoryEntry[];
}
```

## Architecture Patterns
- **Command Pattern**: Each CLI command as separate module
- **Service Layer**: Business logic separated from CLI
- **Repository Pattern**: Abstract file system operations
- **Factory Pattern**: Template and project creation
- **Observer Pattern**: Progress reporting

## Error Handling
- User-friendly error messages
- Consistent exit codes (0=success, 1+=error)
- Verbose mode for debugging (--verbose flag)
- Suggestions for error recovery
- Rollback capability for destructive operations

## Performance Targets
- Sub-second response for all operations
- Lazy loading of dependencies
- Parallel file operations where possible
- In-memory caching of templates during session
- Incremental fix (only changed files)

<!-- MANUAL ADDITIONS START -->
<!-- Add any project-specific notes or overrides here -->
<!-- MANUAL ADDITIONS END -->