# Scaffold CLI Quickstart Guide

## Installation

```bash
# Install globally via npm
npm install -g scaffold-cli

# Or use npx without installation
npx scaffold-cli <command>
```

## Quick Test Scenarios

### Scenario 1: Create Your First Project
```bash
# Create a new web project
scaffold new my-web-app

# You'll be prompted to:
# 1. Select templates (use spacebar to select multiple)
# 2. Provide project variables (project name, author, etc.)
# 3. Confirm the structure to be created

# Expected output:
# ✓ Template 'web-development' loaded
# ✓ Project structure created at ./my-web-app
# ✓ 15 directories created
# ✓ 8 files generated
# Project created successfully!
```

### Scenario 2: Create a Custom Template
```bash
# Create a template from existing project
cd my-existing-project
scaffold template create my-template

# Interactive prompts:
# 1. Template name: my-template
# 2. Description: My custom project template
# 3. Select folders to include
# 4. Select files to include
# 5. Define variables (PROJECT_NAME, AUTHOR, etc.)

# Verify template was created
scaffold template list
# Expected: my-template should appear in the list
```

### Scenario 3: Validate Project Structure
```bash
# Check if project matches its templates
cd my-web-app
scaffold check

# Expected output:
# Checking project against templates...
# ✓ Template: web-development v1.0.0
#   ✓ All required directories present
#   ✓ All required files present
#   ✓ No extra files in strict directories
# Project structure is valid!

# With verbose output
scaffold check --verbose
# Shows detailed file-by-file validation
```

### Scenario 4: Sync Project with Template Updates
```bash
# Update project when template changes
cd my-web-app
scaffold sync --dry-run

# Expected output:
# Analyzing differences...
# Would add:
#   + src/utils/helpers.js (new in template v1.1.0)
# Would modify:
#   ~ package.json (template updated)
# Would remove:
#   - old-config.json (removed from template)
# Run without --dry-run to apply changes

# Apply the changes
scaffold sync
# Prompts for confirmation before making changes
```

### Scenario 5: Extend Project with Additional Templates
```bash
# Add API template to existing web project
cd my-web-app
scaffold extend . --add-template api-backend

# Expected output:
# Loading template 'api-backend'...
# Checking for conflicts...
# No conflicts found!
# Adding template structure:
#   + api/
#   + api/controllers/
#   + api/models/
#   + api/routes/
#   + api/index.js
# Project extended successfully!
```

## Integration Test Suite

### Test 1: Full Project Lifecycle
```bash
#!/bin/bash
# test-project-lifecycle.sh

set -e  # Exit on error

echo "Test 1: Creating new project..."
scaffold new test-project --template web-development --strict
cd test-project

echo "Test 2: Validating initial structure..."
scaffold check || exit 1

echo "Test 3: Adding second template..."
scaffold extend . --add-template database
scaffold check || exit 1

echo "Test 4: Creating project-specific config..."
scaffold config --set author="Test Author"
scaffold config --list | grep "Test Author" || exit 1

echo "Test 5: Simulating structure drift..."
rm -rf src/components
mkdir src/extra-folder
echo "test" > src/unexpected-file.txt

echo "Test 6: Detecting structure issues..."
scaffold check --verbose | grep "errors" || exit 1

echo "Test 7: Repairing structure..."
scaffold sync --force
scaffold check || exit 1

echo "Test 8: Cleaning up..."
cd ..
rm -rf test-project

echo "✓ All tests passed!"
```

### Test 2: Template Management
```bash
#!/bin/bash
# test-template-management.sh

set -e

echo "Test 1: Creating custom template..."
mkdir temp-project
cd temp-project
mkdir -p src/components src/services
echo "# Project" > README.md
echo "{}" > package.json

scaffold template create test-template <<EOF
Test Template
src
components
services
README.md
package.json
PROJECT_NAME
AUTHOR
EOF

echo "Test 2: Listing templates..."
scaffold template list | grep "test-template" || exit 1

echo "Test 3: Showing template details..."
scaffold template show test-template --json | grep '"name":"test-template"' || exit 1

echo "Test 4: Using custom template..."
cd ..
scaffold new from-custom --template test-template
[ -d "from-custom/src/components" ] || exit 1

echo "Test 5: Updating template..."
scaffold template update test-template <<EOF
y
src/utils
EOF

echo "Test 6: Deleting template..."
scaffold template delete test-template --force

echo "Test 7: Cleanup..."
rm -rf temp-project from-custom

echo "✓ All template tests passed!"
```

### Test 3: Configuration Cascade
```bash
#!/bin/bash
# test-configuration.sh

set -e

echo "Test 1: Setting global config..."
scaffold config --global --set strictModeDefault=true
scaffold config --global --list | grep "strictModeDefault.*true" || exit 1

echo "Test 2: Creating project with inherited config..."
scaffold new config-test
cd config-test
scaffold config --list | grep "strictModeDefault.*true" || exit 1

echo "Test 3: Overriding with local config..."
scaffold config --local --set strictModeDefault=false
scaffold config --list | grep "strictModeDefault.*false" || exit 1

echo "Test 4: Workspace config..."
cd ..
echo '{"preferences":{"verboseOutput":true}}' > .scaffold/config.json
cd config-test
scaffold config --list | grep "verboseOutput.*true" || exit 1

echo "Test 5: Cleanup..."
cd ..
rm -rf config-test .scaffold
scaffold config --global --set strictModeDefault=false

echo "✓ All configuration tests passed!"
```

## Validation Checklist

### Basic Functionality
- [ ] `scaffold new` creates project with correct structure
- [ ] `scaffold template list` shows available templates
- [ ] `scaffold check` validates structure correctly
- [ ] `scaffold sync` repairs structure issues
- [ ] `scaffold extend` adds templates without conflicts

### Error Handling
- [ ] Meaningful error when project already exists
- [ ] Graceful handling of missing templates
- [ ] Clear conflict resolution prompts
- [ ] Rollback on sync failure
- [ ] Permission error messages

### Performance
- [ ] Project creation < 1 second for standard template
- [ ] Structure validation < 500ms for 1000 files
- [ ] Template listing instantaneous
- [ ] Sync dry-run < 1 second

### User Experience
- [ ] Interactive prompts are clear and helpful
- [ ] Colors work in terminal (not garbled)
- [ ] Help text available for all commands
- [ ] Progress indicators for long operations
- [ ] Confirmation prompts for destructive actions

## Common Issues and Solutions

### Issue: "Template not found"
**Solution**: Run `scaffold template list` to see available templates. Ensure template is installed in the correct location (~/.scaffold/templates/).

### Issue: "Permission denied" errors
**Solution**: Check directory permissions. Use `sudo` for global installation, or install locally with `npm install scaffold-cli`.

### Issue: Conflicts during sync
**Solution**: Use `scaffold sync --dry-run` first to preview changes. Backup important files before syncing. Use `--backup` flag for automatic backups.

### Issue: Slow performance
**Solution**: Clear cache with `scaffold clean --cache`. Check for large exclude patterns in templates. Ensure antivirus isn't scanning scaffold operations.

## Next Steps

1. **Explore Templates**: Browse official templates at github.com/scaffold-cli/templates
2. **Share Templates**: Publish your templates for team use
3. **Customize Config**: Set your preferences with `scaffold config`
4. **Integrate with CI/CD**: Use scaffold in your build pipeline
5. **Create Team Standards**: Define organization-wide templates