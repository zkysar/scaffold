# Test Burndown Workflow Guide

## Overview
The burndown system allows you to progressively fix failing tests while maintaining a working pre-commit hook. This guide explains how to use the burndown tools to manage and fix tests.

## Quick Reference

### Check Current Status
```bash
npm run burndown:status
```
Shows how many tests are passing vs blocked.

### Find Fixed Tests
```bash
npm run burndown:scan
```
Automatically checks ALL blocked tests to find which ones now pass.

### Remove a Fixed Test
```bash
npm run burndown:remove tests/unit/services/template-service.test.ts
```
Removes a test from the blocklist if it passes.

## Detailed Workflows

### 1. Daily Workflow: Find and Remove Fixed Tests

**Step 1:** Scan for fixed tests
```bash
npm run burndown:scan
```

This will output something like:
```
🔍 Scanning all blocked tests...

[1/35] Testing tests/unit/services/template-service.test.ts... ✅ PASSES
[2/35] Testing tests/unit/services/configuration.service.test.ts... ❌ FAILS
...

📊 Scan Results:
──────────────────────────────────────────────────
✅ Now passing: 3 files
❌ Still failing: 32 files

✨ Files ready to remove from blocklist:
  1. tests/unit/services/template-service.test.ts
  2. tests/unit/services/file-system.service.test.ts
  3. tests/unit/cli/commands/template.test.ts
```

**Step 2:** Remove each passing test
```bash
npm run burndown:remove tests/unit/services/template-service.test.ts
npm run burndown:remove tests/unit/services/file-system.service.test.ts
npm run burndown:remove tests/unit/cli/commands/template.test.ts
```

**Step 3:** Check progress
```bash
npm run burndown:status
```

### 2. After Fixing a Specific Test

If you just fixed a specific test file:

**Step 1:** Check if it passes
```bash
npm run burndown:check tests/unit/services/template-service.test.ts
```

**Step 2:** If it passes, remove it
```bash
npm run burndown:remove tests/unit/services/template-service.test.ts
```

### 3. Bulk Fix Workflow

When you've fixed multiple related tests (e.g., all ProjectService import errors):

**Step 1:** Run scan to find all fixed tests
```bash
npm run burndown:scan
```

**Step 2:** Remove all passing tests at once
```bash
# The scan output will list all passing tests
# Copy and run the remove commands for each one
npm run burndown:remove tests/unit/cli/commands/new.test.ts
npm run burndown:remove tests/unit/cli/commands/fix.test.ts
```

### 4. Verify Pre-commit Still Works

After removing tests from the blocklist:

```bash
# Test that pre-commit will pass
npm run burndown:test  # Runs only non-blocked tests
npm run burndown:lint  # Runs ESLint with burndown config
```

## Command Reference

| Command | Description | Use When |
|---------|-------------|----------|
| `burndown:status` | Show current progress | Want to see overall status |
| `burndown:list` | List all blocked test files | Want to see what's still failing |
| `burndown:scan` | Check ALL blocked tests | Looking for any fixed tests |
| `burndown:check <file>` | Check one specific test | Just fixed a specific test |
| `burndown:remove <file>` | Remove test from blocklist | Test is confirmed passing |
| `burndown:test` | Run non-blocked tests | Testing pre-commit behavior |
| `burndown:lint` | Run ESLint with burndown | Testing linting behavior |

## Tips

### Quick One-Liner to Remove a Fixed Test
If you know a test is fixed:
```bash
npm run burndown:remove tests/unit/services/template-service.test.ts
```
The remove command automatically verifies the test passes before removing it.

### Find Tests by Category
Look for patterns in the blocklist:
```bash
npm run burndown:list | grep "unit/services"  # All service unit tests
npm run burndown:list | grep "contract"       # All contract tests
npm run burndown:list | grep "integration"    # All integration tests
```

### Progressive Fixing Strategy
1. Start with TypeScript compilation errors (easiest to fix)
2. Then fix import errors (usually just updating imports)
3. Move to unit tests (isolated, easier to debug)
4. Then contract tests (may need architectural updates)
5. Finally integration tests (most complex)

## File Locations

- **Blocklist**: `burndown-blocklist.json` - Edit manually if needed
- **Stats**: Check the `statistics` section in the blocklist file
- **Jest Config**: `jest.config.burndown.js` - Uses the blocklist
- **ESLint Config**: `.eslintrc.burndown.js` - Uses the blocklist
- **Management Script**: `scripts/burndown.js` - The CLI tool

## When Tests Are All Fixed

Once all tests pass:
1. Delete burndown files:
   ```bash
   rm burndown-blocklist.json
   rm jest.config.burndown.js
   rm .eslintrc.burndown.js
   rm .lintstagedrc.burndown.js
   rm scripts/burndown.js
   rm docs/burndown-workflow.md
   ```

2. Restore original pre-commit hook:
   ```bash
   # Edit .husky/pre-commit to use original configs
   npx lint-staged
   npm test -- --maxWorkers=2
   ```

3. Remove burndown scripts from package.json

## Troubleshooting

### "Test still fails" when trying to remove
The test isn't actually passing. Check the error:
```bash
npm test -- tests/unit/services/template-service.test.ts
```

### Scan takes too long
Run tests in parallel by checking specific categories:
```bash
npm run burndown:check tests/unit/services/*.test.ts
```

### Want to force-remove without checking
Edit `burndown-blocklist.json` directly and remove the file path from the `tests.blocked` array.

## Example Session

```bash
# Start your day by checking status
$ npm run burndown:status
📊 Progress: 56% tests passing

# You fixed the ProjectService import errors
$ npm run burndown:scan
✨ Files ready to remove:
  1. tests/unit/cli/commands/new.test.ts
  2. tests/unit/cli/commands/fix.test.ts

# Remove them
$ npm run burndown:remove tests/unit/cli/commands/new.test.ts
✅ Removed from blocklist

$ npm run burndown:remove tests/unit/cli/commands/fix.test.ts
✅ Removed from blocklist

# Check new status
$ npm run burndown:status
📊 Progress: 62% tests passing (+6%)
```