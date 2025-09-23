# Scaffold CLI Testing Workflows

This document contains 60+ user workflows for testing the Scaffold CLI. These workflows represent common use cases that users would encounter in real-world scenarios, including automatic backup behavior testing.

## Prerequisites

Before testing, ensure the CLI is built and available:

```bash
npm install
npm run build
npm link  # or use ./dist/cli/index.js directly
```

## Core Workflows

### 1. Project Creation Workflows

#### 1.1 Create a new project without specifying template
```bash
scaffold new my-project
```
Expected: Prompts user to select from available templates (or fails if no templates exist)
Note: There is no "default" template - user must have templates installed first

#### 1.2 Create project with specific template
```bash
scaffold new my-app --template react-app
```
Expected: Creates project using the react-app template
Note: Template must exist first - users should run `scaffold template list` to see available templates

#### 1.3 Create project in custom directory
```bash
scaffold new my-project --path ./projects
```
Expected: Creates project in ./projects/my-project

#### 1.4 Create project with template variables
```bash
scaffold new my-project --variables '{"author":"John Doe","license":"MIT"}'
```
Expected: Creates project with variables substituted in templates

#### 1.5 Preview project creation (dry run)
```bash
scaffold new my-project --dry-run
```
Expected: Shows what would be created without making changes

#### 1.6 Create project with verbose output
```bash
scaffold new my-project --verbose
```
Expected: Adds detailed logging of creation process (file operations, template processing, etc.)

#### 1.7 Create project without colors (CI mode)
```bash
scaffold new my-project --no-color
```
Expected: Creates project with plain text output

### 2. Template Management Workflows

#### 2.1 List all available templates
```bash
scaffold template list
```
Expected: Shows all installed templates

#### 2.2 List templates with verbose details
```bash
scaffold template list --verbose
```
Expected: Shows templates with extended SHA (12 chars vs 8), full timestamps, source info
Note: Verbose mode shows how templates were fetched/installed rather than different display format

#### 2.3 Create a new template interactively
```bash
scaffold template create my-template
```
Expected: Interactive prompts for:
- Template description
- Root folder for template isolation
- Version (default: 1.0.0)
- Strict mode validation (yes/no)
- Allow extra files in projects (yes/no)

Advanced features (when fully implemented):
- Scan existing directory as baseline
- Select allowed subfolders from list
- Specify allowed file extensions per directory
- Define required vs optional files/folders

#### 2.4 Create template with dry run
```bash
scaffold template create my-template --dry-run
```
Expected: Shows template creation without saving

#### 2.5 Delete a template by name
```bash
scaffold template delete my-template
```
Expected: Prompts for confirmation and deletes template

#### 2.6 Delete template with force (no confirmation)
```bash
scaffold template delete my-template --force
```
Expected: Deletes template without confirmation

#### 2.7 Export template to file
```bash
scaffold template export my-template --output ./my-template.json
```
Expected: Exports template to JSON file

#### 2.8 Export template to default location
```bash
scaffold template export my-template
```
Expected: Exports to ./my-template-template.json

#### 2.9 Import template from file
```bash
scaffold template import ./downloaded-template.json
```
Expected: Imports and installs template from file

#### 2.10 Create template alias
```bash
scaffold template alias abc123 my-alias
```
Expected: Creates alias "my-alias" for template with SHA abc123

#### 2.11 Delete template by SHA
```bash
scaffold template delete abc123def
```
Expected: Deletes template by its SHA identifier

### 3. Project Validation Workflows

#### 3.1 Check current directory structure
```bash
scaffold check
```
Expected: Validates current directory against its template

#### 3.2 Check specific project
```bash
scaffold check ./my-project
```
Expected: Validates specified project directory

#### 3.3 Check with verbose output
```bash
scaffold check ./my-project --verbose
```
Expected: Adds detailed logging during validation (each file/folder checked, rule evaluations, etc.)

#### 3.4 Check with dry run
```bash
scaffold check ./my-project --dry-run
```
Expected: Shows what would be checked without validation

#### 3.5 Check without colors
```bash
scaffold check ./my-project --no-color
```
Expected: Plain text validation output

### 4. Project Repair Workflows

#### 4.1 Fix current directory issues
```bash
scaffold fix
```
Expected: Repairs structural issues in current directory

#### 4.2 Fix specific project (interactive mode)
```bash
scaffold fix ./my-project
```
Expected: Interactive repair process:
- Shows each issue found
- Prompts for confirmation before each fix
- Allows user to select which fixes to apply
- Provides options for different fix strategies when available

#### 4.3 Preview fixes without applying
```bash
scaffold fix ./my-project --dry-run
```
Expected: Shows what fixes would be applied

#### 4.4 Force fixes without confirmation
```bash
scaffold fix ./my-project --force
```
Expected: Applies fixes without prompting

#### 4.5 Fix with verbose output
```bash
scaffold fix ./my-project --verbose
```
Expected: Adds detailed logging of fix operations (what's being repaired, file operations, etc.)

### 5. Project Extension Workflows

#### 5.1 Extend project with new template
```bash
scaffold extend my-project --template api-endpoints
```
Expected: Adds api-endpoints template to existing project

#### 5.2 List available extensions
```bash
scaffold extend my-project --list
```
Expected: Shows templates that can be added

#### 5.3 Preview extension
```bash
scaffold extend my-project --template logging --dry-run
```
Expected: Shows what would be added without changes

#### 5.4 Force extension without confirmation
```bash
scaffold extend my-project --template auth --force
```
Expected: Adds template without prompting

### 6. Project Information Workflows

#### 6.1 Show project details
```bash
scaffold show my-project
```
Expected: Displays project manifest and structure

#### 6.2 Show template information
```bash
scaffold show --template react-app
```
Expected: Shows template details

#### 6.3 Show configuration
```bash
scaffold show --config
```
Expected: Displays current configuration cascade

#### 6.4 Show with verbose output
```bash
scaffold show my-project --verbose
```
Expected: Adds detailed logging while gathering project information

### 7. Configuration Management Workflows

#### 7.1 List all configuration
```bash
scaffold config list
```
Expected: Shows all configuration settings

#### 7.2 Get specific config value
```bash
scaffold config get templates.directory
```
Expected: Shows value of templates.directory

#### 7.3 Set global configuration
```bash
scaffold config set templates.directory ~/.scaffold/templates --global
```
Expected: Sets global config value

#### 7.4 Set workspace configuration
```bash
scaffold config set eslint.enabled true --workspace
```
Expected: Sets workspace-level config

#### 7.5 Set project configuration
```bash
scaffold config set variables.author "Team Lead" --project
```
Expected: Sets project-level config

#### 7.6 Reset configuration
```bash
scaffold config reset
```
Expected: Resets configuration to defaults

#### 7.7 Reset specific config key
```bash
scaffold config reset templates.directory
```
Expected: Resets specific configuration key

### 8. Cleanup Workflows

#### 8.1 Clean temporary files
```bash
scaffold clean
```
Expected: Removes temporary files and caches

#### 8.2 Clean with dry run
```bash
scaffold clean --dry-run
```
Expected: Shows what would be cleaned

#### 8.3 Clean with verbose output
```bash
scaffold clean --verbose
```
Expected: Adds detailed logging of cleanup operations (what's being removed, locations checked, etc.)

### 9. Automatic Backup and Recovery Testing

#### 9.1 Verify automatic backup on destructive operations
```bash
# Create project and break it
scaffold new test-project --template my-template
rm -rf test-project/src
scaffold fix test-project
# Check ~/.scaffold/backups/ for automatic backup
ls -la ~/.scaffold/backups/
```
Expected: Automatic backup created before fix modifies files

#### 9.2 Test backup on file modifications
```bash
# Modify project files
echo "new content" > test-project/README.md
scaffold fix test-project
ls -la ~/.scaffold/backups/
```
Expected: Previous version backed up automatically before changes

#### 9.3 Test 25GB warning threshold
```bash
# Manual test: Add large files to ~/.scaffold/backups to simulate 25GB usage
dd if=/dev/zero of=~/.scaffold/backups/large-file bs=1G count=25
scaffold fix test-project
```
Expected: Warning message that backup cache is approaching limit (25GB)

#### 9.4 Test 50GB auto-cleanup
```bash
# Manual test: Add files to exceed 50GB in ~/.scaffold/backups
dd if=/dev/zero of=~/.scaffold/backups/large-file bs=1G count=50
scaffold fix test-project
```
Expected: Automatic cleanup of oldest backups to stay under 50GB limit

#### 9.5 Verify backup cache rotation
```bash
# Run multiple destructive operations
for i in {1..10}; do
  echo "change $i" >> test-project/file.txt
  scaffold fix test-project
done
ls -la ~/.scaffold/backups/
```
Expected: Only recent backups kept, older ones rotated out

#### 9.6 Test configurable backup limits
```bash
# Set custom max size in config
scaffold config set backup.maxSize "10GB"
scaffold config set backup.warnSize "5GB"
# Then test with operations
scaffold fix test-project
```
Expected: Respects configured thresholds for warning and cleanup

#### 9.7 Verify backup metadata
```bash
# Check backup metadata files
ls -la ~/.scaffold/backups/*/metadata.json
cat ~/.scaffold/backups/*/metadata.json | head
```
Expected: Each backup has metadata with timestamp, operation, files backed up

#### 9.8 Test backup restoration (manual)
```bash
# Break project
rm -rf test-project/src
# Manually restore from backup
cp -r ~/.scaffold/backups/latest/* test-project/
scaffold check test-project
```
Expected: Project restored to working state from backup

#### 9.9 Monitor backup space during operations
```bash
# Check space before and after operations
du -sh ~/.scaffold/backups
scaffold fix test-project
du -sh ~/.scaffold/backups
```
Expected: Space usage tracked and managed automatically

#### 9.10 Test backup cleanup on clean command
```bash
scaffold clean
ls -la ~/.scaffold/backups/
```
Expected: Old/unnecessary backups removed during cleanup

### 10. Shell Completion Workflows

#### 10.1 Install shell completion (auto-detect)
```bash
scaffold completion install
```
Expected: Installs completion for detected shell

#### 10.2 Install for specific shell
```bash
scaffold completion install --shell zsh
```
Expected: Installs zsh completion

#### 10.3 Check completion status
```bash
scaffold completion status
```
Expected: Shows installation status for all shells

#### 10.4 Output completion script
```bash
scaffold completion script --shell bash
```
Expected: Outputs bash completion script

#### 10.5 Uninstall completion
```bash
scaffold completion uninstall
```
Expected: Removes completion for detected shell

#### 10.6 Uninstall specific shell completion
```bash
scaffold completion uninstall --shell fish
```
Expected: Removes fish completion

### 11. Help and Version Workflows

#### 11.1 Show main help
```bash
scaffold --help
```
Expected: Shows all available commands

#### 11.2 Show command-specific help
```bash
scaffold template --help
```
Expected: Shows template command help

#### 11.3 Show version
```bash
scaffold --version
```
Expected: Shows CLI version

#### 11.4 Show subcommand help
```bash
scaffold completion install --help
```
Expected: Shows help for completion install

### 12. Complex Workflows

#### 12.1 Create project and immediately validate
```bash
scaffold new test-project --template react-app
scaffold check test-project
```
Expected: Creates project and validates structure

#### 12.2 Create, modify, and fix project
```bash
scaffold new test-project
rm -rf test-project/src
scaffold fix test-project
```
Expected: Creates project, removes folder, then repairs

#### 12.3 Template export and import cycle
```bash
scaffold template export my-template --output temp.json
scaffold template delete my-template --force
scaffold template import temp.json
```
Expected: Exports, deletes, and re-imports template

## Testing Notes

### Error Scenarios to Test

1. **Invalid template name**: Try creating project with non-existent template
2. **Missing permissions**: Test in read-only directories
3. **Conflicting files**: Create project where directory already exists
4. **Corrupted manifest**: Manually edit .scaffold/manifest.json and run check
5. **Network issues**: Test template import with invalid URLs
6. **Invalid JSON**: Pass malformed JSON to --variables flag
7. **Missing dependencies**: Test with incomplete template definitions

### Edge Cases

1. **Very long project names**: Create project with 255+ character name
2. **Special characters**: Use unicode and special chars in project names
3. **Nested projects**: Create scaffold project inside another scaffold project (Note: Currently not supported)
4. **Simultaneous operations**: Run multiple scaffold commands in parallel
5. **Large templates**: Test with templates containing 1000+ files
6. **Template structure limitations**: Verify that deep folder nesting is prohibited (templates must have flat structure)
7. **Backup space limits**: Manually create large files in ~/.scaffold/backups to test 25GB warning and 50GB auto-cleanup
8. **Concurrent backups**: Run multiple fix operations simultaneously to test automatic backup collision handling

### Performance Testing

1. **Large project validation**: Check projects with 10,000+ files
2. **Multiple template application**: Extend project with 10+ templates
3. **Batch operations**: Create 100 projects in sequence
4. **Template library scaling**: Install 100+ templates and list them

## Validation Checklist

For each workflow, verify:

- [ ] Command executes without errors
- [ ] Output messages are clear and helpful
- [ ] Exit codes are correct (0 for success, non-zero for failure)
- [ ] Files/directories are created/modified as expected
- [ ] Dry-run mode shows accurate preview
- [ ] Verbose mode provides useful debugging information
- [ ] Error messages include recovery suggestions
- [ ] Command respects global options (--no-color, --verbose)
- [ ] Help text is accurate and complete
- [ ] Shell completion suggests appropriate values

## Automation Tips

Create a test script to run through all workflows:

```bash
#!/bin/bash
# test-all-workflows.sh

# Set up test environment
mkdir -p test-workspace
cd test-workspace

# Run each workflow and capture results
echo "Testing project creation..."
scaffold new test1 || echo "FAILED: Basic project creation"
scaffold new test2 --template react-app || echo "FAILED: Template project creation"
# ... continue for all workflows

# Clean up
cd ..
rm -rf test-workspace
```

## Reporting Issues

When reporting issues, include:

1. Command that failed
2. Error message received
3. Expected behavior
4. CLI version (`scaffold --version`)
5. Node.js version (`node --version`)
6. Operating system
7. Relevant configuration files
8. Steps to reproduce