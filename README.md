# Scaffold CLI

A powerful, template-based project structure management CLI tool that helps developers create, validate, and maintain consistent project structures across teams and organizations.

## Overview

Scaffold CLI provides a comprehensive solution for managing project templates and enforcing structural consistency. Whether you're creating new projects, validating existing ones, or maintaining organizational standards, Scaffold CLI streamlines the process with intelligent templates, flexible configuration, and robust validation.

### Key Features

- **Template-based project creation** - Generate new projects from reusable templates
- **Structure validation** - Verify projects conform to expected patterns
- **Automatic fixing** - Repair structural issues with intelligent suggestions
- **Configuration cascade** - Global, workspace, and project-level settings
- **Extensible architecture** - Plugin-friendly design for custom functionality

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn package manager

### Install from npm

```bash
# Install globally
npm install -g @scaffold/cli

# Or use with npx (no installation required)
npx @scaffold/cli --help
```

### Local Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd scaffold-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

## Quick Start

```bash
# Create a new project from a template
scaffold new my-project --template react-app

# Validate an existing project structure
scaffold check my-project

# Fix structural issues
scaffold fix my-project

# List available templates
scaffold template list

# Show project information
scaffold show my-project
```

## Usage

### Core Commands

#### Create New Projects

```bash
# Create project with default template
scaffold new my-project

# Create with specific template
scaffold new my-project --template react-typescript

# Create in specific directory
scaffold new my-project --path ./projects

# Pass template variables
scaffold new my-project --variables '{"author":"John Doe","license":"MIT"}'

# Preview without creating
scaffold new my-project --dry-run
```

#### Template Management

```bash
# List available templates
scaffold template list

# Create new template from existing project
scaffold template create my-template

# Export template to file
scaffold template export my-template --output ./my-template.json

# Import template from file
scaffold template import ./downloaded-template.json

# Delete template
scaffold template delete old-template
```

#### Project Validation

```bash
# Check current directory
scaffold check

# Check specific project
scaffold check ./my-project

# Detailed validation report
scaffold check ./my-project --verbose

# Check without colors (CI-friendly)
scaffold check ./my-project --no-color
```

#### Project Repair

```bash
# Fix issues in current directory
scaffold fix

# Fix specific project
scaffold fix ./my-project

# Preview fixes without applying
scaffold fix ./my-project --dry-run

# Force fixes without confirmation
scaffold fix ./my-project --force
```

#### Project Extension

```bash
# Add template to existing project
scaffold extend my-project --template api-endpoints

# List available extensions
scaffold extend my-project --list

# Preview extension without applying
scaffold extend my-project --template logging --dry-run
```

#### Project Information

```bash
# Show project details
scaffold show my-project

# Show template information
scaffold show --template react-app

# Show configuration
scaffold show --config
```

#### Configuration Management

```bash
# Show current configuration
scaffold config show

# Set global configuration
scaffold config set templates.directory ~/.scaffold/templates

# Set workspace configuration
scaffold config set --workspace eslint.enabled true

# Set project configuration
scaffold config set --project variables.author "Team Lead"

# Reset configuration
scaffold config reset
```

#### Cleanup

```bash
# Clean temporary files
scaffold clean

# Clean with verbose output
scaffold clean --verbose
```

### Global Options

All commands support these global options:

- `--verbose` - Show detailed output and debug information
- `--dry-run` - Preview operations without making changes
- `--no-color` - Disable colored output (useful for CI/CD)
- `--help` - Show help for any command

### Command Aliases

For faster usage, several commands have short aliases:

```bash
scaffold n my-project    # alias for 'new'
scaffold t list          # alias for 'template'
scaffold c my-project    # alias for 'check'
```

## Templates

### What are Templates?

Templates are reusable project structure definitions that include:

- **Folder structure** - Directory hierarchies and naming conventions
- **File templates** - Boilerplate files with variable substitution
- **Variables** - Customizable parameters for template generation
- **Rules** - Validation rules and structural requirements

### Template Structure

Templates are defined in JSON format:

```json
{
  "name": "react-typescript",
  "version": "1.0.0",
  "description": "React application with TypeScript",
  "folders": [
    {
      "path": "src",
      "required": true
    },
    {
      "path": "src/components",
      "required": true
    },
    {
      "path": "public",
      "required": true
    }
  ],
  "files": [
    {
      "path": "package.json",
      "template": "package.json.hbs",
      "required": true
    },
    {
      "path": "src/index.tsx",
      "template": "index.tsx.hbs",
      "required": true
    }
  ],
  "variables": [
    {
      "name": "projectName",
      "type": "string",
      "required": true,
      "description": "Name of the project"
    },
    {
      "name": "author",
      "type": "string",
      "default": "Anonymous",
      "description": "Project author"
    }
  ],
  "rules": {
    "enforceFileNaming": "kebab-case",
    "requireReadme": true,
    "maxDepth": 5
  }
}
```

### Creating Custom Templates

1. **Start with an existing project**:
   ```bash
   scaffold template create my-template
   ```

2. **Define the template structure** by editing the generated JSON file

3. **Add template files** with variable placeholders using Handlebars syntax:
   ```handlebars
   {
     "name": "{{projectName}}",
     "author": "{{author}}",
     "version": "1.0.0"
   }
   ```

4. **Test your template**:
   ```bash
   scaffold new test-project --template my-template
   ```

### Sharing Templates

Templates can be shared through:

- **Export/Import**: Use `scaffold template export` and `scaffold template import`
- **Git repositories**: Store templates in version control
- **NPM packages**: Publish templates as npm packages
- **Template registries**: Use organizational template repositories

## Configuration

Scaffold CLI uses a cascading configuration system with three levels:

### Configuration Hierarchy

1. **Global** (`~/.scaffold/config.json`) - System-wide defaults
2. **Workspace** (`./scaffold.config.json`) - Project workspace settings
3. **Project** (`./scaffold-project.json`) - Individual project overrides

Higher-level configurations override lower-level ones.

### Configuration Options

```json
{
  "templates": {
    "directory": "~/.scaffold/templates",
    "registry": "https://templates.scaffold.dev",
    "autoUpdate": true
  },
  "validation": {
    "enforceRules": true,
    "exitOnError": true,
    "ignorePatterns": ["node_modules", ".git"]
  },
  "output": {
    "colorEnabled": true,
    "verboseDefault": false,
    "progressBars": true
  },
}
```

### Configuration Examples

```bash
# Set global template directory
scaffold config set templates.directory ~/my-templates

# Enable workspace-level validation
scaffold config set --workspace validation.enforceRules true

# Set project-specific variables
scaffold config set --project variables.license MIT

# View effective configuration
scaffold config show --merged
```

## Development

### Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd scaffold-cli

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test
```

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Development mode with watch
npm test               # Run test suite
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript compiler checks
npm run clean          # Clean build artifacts
```

### Project Structure

```
src/
├── models/           # Data models and interfaces
├── services/         # Business logic services
├── cli/             # CLI command handlers
│   ├── commands/    # Individual command implementations
└── lib/             # Utility functions

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── contract/        # Contract validation tests

```

### Testing

The project uses Jest for testing with comprehensive coverage requirements:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- src/services/template.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

### Code Style

The project follows strict TypeScript and ESLint rules:

- **TypeScript**: Strict mode enabled, explicit types for public APIs
- **File naming**: kebab-case for files, PascalCase for classes
- **Code style**: Prettier formatting, ESLint rules enforced
- **Architecture**: Service layer pattern, dependency injection
- **Error handling**: Comprehensive error messages with recovery suggestions

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the code style guidelines
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

### Code Quality Requirements

- **Test coverage**: Minimum 80% code coverage required
- **Type safety**: All code must be properly typed (no `any` types)
- **Documentation**: Public APIs must be documented
- **Error handling**: All error conditions must be tested
- **Performance**: Sub-second response times for all operations

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
npm run dev
npm test

# Lint and type check
npm run lint
npm run typecheck

# Build to verify
npm run build

# Commit changes
git commit -m "feat: add new template validation rule"

# Push and create PR
git push origin feature/my-feature
```

### Reporting Issues

When reporting issues, please include:

- Scaffold CLI version (`scaffold --version`)
- Node.js version (`node --version`)
- Operating system and version
- Complete error messages
- Steps to reproduce the issue
- Expected vs actual behavior

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Support

- **Documentation**: [Project Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Discord**: [Community Discord](link-to-discord)

---

**Scaffold CLI** - Streamlining project structure management for development teams worldwide.