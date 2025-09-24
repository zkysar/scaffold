# GitHub Issue Style Guide

## Issue Title Format

### Bug Reports
- Format: `[BUG] Clear description of the problem`
- Example: `[BUG] Template creation fails with permission error`

### Feature Requests
- Format: `[FR] Clear description of the feature`
- Example: `[FR] Add support for nested scaffold projects`

### Technical Debt
- Format: `[TECH-DEBT] Area needing refactoring`
- Example: `[TECH-DEBT] Refactor error handling to use error types`

## Priority Levels

- **CRITICAL**: System breaking, blocks all users, data loss risk
- **HIGH**: Major functionality broken, blocks many users
- **MEDIUM**: Important but not blocking, workarounds available
- **LOW**: Nice-to-have improvements, minor issues

## Required Labels

### Type Labels (Required - Pick One)
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `tech-debt` - Code improvements and refactoring

### Priority Labels (Required - Pick One)
- `critical-priority` - Immediate attention required
- `high-priority` - Address soon
- `medium-priority` - Standard priority
- `low-priority` - When time permits

### Additional Labels (Optional)
- `documentation` - Documentation improvements
- `testing` - Test-related issues
- `performance` - Performance improvements
- `breaking-change` - Will break existing functionality
- `good-first-issue` - Good for newcomers

## Issue Body Structure

### Bug Reports Must Include:
1. **Description** - Clear problem statement
2. **Current Behavior** - What happens now
3. **Expected Behavior** - What should happen
4. **Steps to Reproduce** - Numbered steps
5. **Environment** - Version info
6. **Error Messages** - Stack traces if applicable
7. **Priority Assessment** - Priority level

### Feature Requests Must Include:
1. **Problem Statement** - What problem to solve
2. **Proposed Solution** - How to solve it
3. **Alternatives Considered** - Other options explored
4. **Use Cases** - Real-world scenarios
5. **Priority Assessment** - Priority level
6. **Acceptance Criteria** - Checklist format

### Tech Debt Must Include:
1. **Problem Overview** - Current issues
2. **Current Implementation** - How it works now
3. **Proposed Refactoring** - Improvement plan
4. **Impact Analysis** - What areas affected
5. **Breaking Changes** - Yes/No with details
6. **Priority Assessment** - Priority level
7. **Files Affected** - Key files to change

## Writing Guidelines

### Do:
- Use clear, concise language
- Include code examples in markdown blocks
- Add screenshots where helpful
- Link to related issues
- Use checkboxes for acceptance criteria
- Specify exact error messages

### Don't:
- Use vague descriptions
- Mix multiple issues in one ticket
- Leave priority unspecified
- Skip reproduction steps for bugs
- Use emotional language

## Examples of Well-Formatted Issues

### Good Bug Report:
```
Title: [BUG] Fix command fails with manifest write permission errors

Labels: bug, high-priority

Description: The scaffold fix command consistently fails when attempting to write the project manifest after repairs.

Current Behavior: Command exits with "Failed to write project manifest" error
Expected Behavior: Successfully repairs project and updates manifest

Steps to Reproduce:
1. Run `scaffold new test-project`
2. Delete src/ directory
3. Run `scaffold fix`

Priority: HIGH - Core functionality broken
```

### Good Feature Request:
```
Title: [FR] Add interactive prompts for missing template parameters

Labels: enhancement, medium-priority

Problem Statement: Users must provide all template parameters upfront or the command fails

Proposed Solution: Interactive prompts for missing required parameters

Use Cases:
1. New users discovering template requirements
2. Complex templates with many parameters

Priority: MEDIUM - Improves user experience
```