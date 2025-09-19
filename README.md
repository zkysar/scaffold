# Scaffold CLI

A powerful, template-based project scaffolding tool that helps you create, manage, and maintain consistent project structures across your development workflow.

## Features

- 🎯 **Template-Based Scaffolding** - Create reusable project templates with files, folders, and variables
- 🔒 **Template Isolation** - Each template lives in its own root folder, preventing conflicts
- 🔄 **Variable Substitution** - Dynamic content generation with `{{variable}}` syntax and transformations
- ✅ **Project Validation** - Ensure projects match their template structure
- 🔧 **Auto-Fix** - Automatically repair project structure issues
- 🎨 **Multiple Templates** - Apply multiple templates to a single project without conflicts
- ⚙️ **Configuration Cascade** - Global → Workspace → Project level settings
- 🐳 **Docker Support** - Full containerized development environment

## Installation

### Prerequisites

- Node.js 20+ and npm
- TypeScript 5.3+

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-org/scaffold.git
cd scaffold

# Install dependencies
npm install

# Build the CLI
npm run build

# Optional: Link globally
npm link
# Now you can use 'scaffold' instead of './dist/cli/index.js'
```

### Docker Development

```bash
# Start development container with hot-reload
docker-compose up dev

# Run tests in container
docker-compose run test

# Build in container
docker-compose run build
```

## Quick Start

### 1. Create Your First Template

```bash
scaffold template create my-template
```

You'll be prompted for:
- Template description
- Version (default: 1.0.0)
- Root folder name (for isolation)
- Folders to create
- Files with content
- Variables for dynamic content

### 2. Create a Project from Template

```bash
scaffold new my-project --template my-template
```

Or with variables:

```bash
scaffold new my-project \
  --template my-template \
  --variables '{"projectName":"my-project","description":"My awesome project"}'
```

### 3. Validate Project Structure

```bash
scaffold check my-project
```

### 4. Auto-Fix Structure Issues

```bash
scaffold fix my-project
```

## Commands

### `scaffold new <project>`
Create a new project from a template.

**Options:**
- `-t, --template <id>` - Template to use (required)
- `-p, --path <path>` - Target directory (default: current)
- `-v, --variables <json>` - Template variables as JSON
- `--dry-run` - Preview without creating files

**Example:**
```bash
scaffold new my-app --template node-express --variables '{"port":3000}'
```

### `scaffold template <action>`
Manage templates.

**Actions:**
- `create <name>` - Create a new template interactively
- `list` - List available templates
- `delete <name>` - Delete a template
- `export <name>` - Export template to JSON
- `import <file>` - Import template from JSON

**Examples:**
```bash
scaffold template list
scaffold template create react-component
scaffold template export my-template > template.json
scaffold template import shared-template.json
```

### `scaffold check [project]`
Validate project structure against applied templates.

**Options:**
- `-f, --format <format>` - Output format: table, json, summary (default: table)
- `--verbose` - Show detailed validation information

**Example:**
```bash
scaffold check ./my-project --format json
```

### `scaffold fix [project]`
Automatically fix project structure issues.

**Options:**
- `--dry-run` - Show what would be fixed without making changes
- `--verbose` - Show detailed fix information

**Example:**
```bash
scaffold fix ./my-project --dry-run
```

### `scaffold extend <project>`
Add additional templates to an existing project.

**Options:**
- `-t, --template <id>` - Template to add (required)
- `-v, --variables <json>` - Template variables

**Example:**
```bash
scaffold extend my-project --template authentication
```

### `scaffold show [item]`
Display information about templates, projects, or configuration.

**Examples:**
```bash
scaffold show                    # Show current project info
scaffold show templates           # List all templates
scaffold show template my-template # Show template details
scaffold show config              # Show configuration
```

### `scaffold config <action>`
Manage configuration settings.

**Actions:**
- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `list` - List all configuration
- `reset [--global|--workspace|--project]` - Reset to defaults

**Examples:**
```bash
scaffold config set preferences.colorOutput true
scaffold config get templateDirectory
scaffold config list --global
```

### `scaffold clean`
Clean up temporary files and cache.

**Options:**
- `--cache` - Clean cache only
- `--temp` - Clean temp files only
- `--all` - Clean everything (default)

## Template Structure

### Template Definition

Templates are stored in `~/.scaffold/templates/` with this structure:

```
my-template/
├── template.json    # Template definition
└── files/          # Optional static files
```

### template.json Example

```json
{
  "id": "my-template",
  "name": "My Template",
  "description": "A template for Node.js projects",
  "version": "1.0.0",
  "rootFolder": "app",
  "folders": [
    {
      "path": "app/src",
      "description": "Source code"
    },
    {
      "path": "app/tests",
      "description": "Test files"
    }
  ],
  "files": [
    {
      "path": "app/package.json",
      "content": "{\n  \"name\": \"{{projectName|kebabCase}}\",\n  \"version\": \"1.0.0\"\n}",
      "description": "Package configuration"
    },
    {
      "path": "app/src/index.js",
      "content": "console.log('Hello from {{projectName}}');",
      "description": "Entry point"
    }
  ],
  "variables": [
    {
      "name": "projectName",
      "description": "Project name",
      "required": true
    },
    {
      "name": "author",
      "description": "Author name",
      "default": "Anonymous"
    }
  ],
  "rules": {
    "strictMode": false,
    "allowExtraFiles": true,
    "allowExtraFolders": true,
    "conflictResolution": "prompt"
  }
}
```

## Variable Substitution

### Basic Syntax
- `{{variableName}}` - Simple substitution
- `{{nested.variable}}` - Nested object access
- `{{variable|defaultValue}}` - Default values

### Transformations
- `{{name|upper}}` - UPPERCASE
- `{{name|lower}}` - lowercase
- `{{name|camelCase}}` - camelCase
- `{{name|kebabCase}}` - kebab-case
- `{{name|snakeCase}}` - snake_case
- `{{name|pascalCase}}` - PascalCase
- `{{name|capitalize}}` - Capitalize first letter

### Special Variables
- `{{timestamp}}` - Current Unix timestamp
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{datetime}}` - Current datetime (ISO format)
- `{{uuid}}` - Random UUID
- `{{year}}` - Current year
- `{{month}}` - Current month
- `{{day}}` - Current day

## Template Isolation

Each template defines a `rootFolder` that contains all its files and folders. This prevents conflicts when applying multiple templates to the same project:

```
my-project/
├── .scaffold/          # Scaffold metadata
│   └── manifest.json
├── backend/           # From 'backend-api' template
│   ├── src/
│   └── package.json
├── frontend/          # From 'react-app' template
│   ├── src/
│   └── package.json
└── shared/            # From 'shared-types' template
    └── types.ts
```

## Configuration

Scaffold uses a three-level configuration cascade:

1. **Global** (`~/.scaffold/config.json`) - User-wide settings
2. **Workspace** (`./.scaffold/config.json`) - Project workspace settings
3. **Project** (`project/.scaffold/config.json`) - Project-specific settings

### Configuration Options

```json
{
  "preferences": {
    "colorOutput": true,
    "verboseByDefault": false,
    "editor": "code"
  },
  "templates": {
    "searchPaths": ["~/.scaffold/templates"],
    "defaultTemplate": "base",
    "autoUpdate": false
  },
  "validation": {
    "strictMode": false,
    "ignorePatterns": ["node_modules", ".git", "dist"]
  }
}
```

### Environment Variables

Override configuration with environment variables:

```bash
export SCAFFOLD_PREFERENCES_COLOR_OUTPUT=false
export SCAFFOLD_TEMPLATES_DEFAULT_TEMPLATE=my-template
```

## Development

### Project Structure

```
scaffold/
├── src/
│   ├── cli/           # CLI commands
│   ├── services/      # Business logic
│   ├── models/        # Data models
│   └── lib/           # Utilities
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── contract/      # Contract tests
├── docker/            # Docker configurations
└── specs/             # Feature specifications
```

### Available Scripts

```bash
npm run build         # Compile TypeScript
npm run dev          # Watch mode development
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Run ESLint
npm run typecheck    # Check TypeScript types
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit
npm test -- tests/integration

# Run with coverage
npm run test:coverage
```

### Docker Commands

```bash
# Development with hot-reload
docker-compose up dev

# Run tests
docker-compose run test

# Run specific npm command
docker-compose run dev npm run lint

# Build production image
docker-compose build prod
```

## Troubleshooting

### Common Issues

**Template not found:**
```bash
scaffold template list  # Check available templates
```

**Variable substitution not working:**
- Ensure variables are passed as valid JSON
- Check template.json for required variables

**Permission errors:**
```bash
# Check scaffold directory permissions
ls -la ~/.scaffold

# Reset permissions if needed
chmod -R 755 ~/.scaffold
```

**Validation failures:**
```bash
# Run check with verbose output
scaffold check --verbose

# Auto-fix issues
scaffold fix
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: [github.com/your-org/scaffold/issues](https://github.com/your-org/scaffold/issues)
- Documentation: [scaffold-cli.dev/docs](https://scaffold-cli.dev/docs)
- Discord: [discord.gg/scaffold](https://discord.gg/scaffold)