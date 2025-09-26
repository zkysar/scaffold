# IDE Setup Guide

## VS Code Setup

### Automatic Setup
1. Open the project in VS Code
2. When prompted, install the recommended extensions
3. Reload VS Code if needed

### Manual Extension Installation
Install these extensions from the VS Code marketplace:
- **ESLint** (`dbaeumer.vscode-eslint`) - Real-time linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **Jest** (`orta.vscode-jest`) - Test runner integration
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) - Catch typos

### Features Enabled
- **Auto-format on save** - Files are automatically formatted with Prettier
- **Auto-fix ESLint issues on save** - Fixable linting issues are corrected
- **Real-time error highlighting** - See TypeScript and ESLint errors as you type
- **Consistent EOL and whitespace** - Automatic trimming and line ending normalization

### Verification
1. Open any TypeScript file
2. Make a formatting change (e.g., remove a semicolon)
3. Save the file (Cmd+S / Ctrl+S)
4. The file should auto-format and fix the issue

## WebStorm / IntelliJ IDEA Setup

### Configure Prettier
1. Go to **Preferences → Languages & Frameworks → JavaScript → Prettier**
2. Set Prettier package path to `{project}/node_modules/prettier`
3. Check **On save** under "Run for files"
4. Set file pattern to `{**/*,*}.{js,ts,jsx,tsx,json}`

### Configure ESLint
1. Go to **Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
2. Select **Automatic ESLint configuration**
3. Check **Run eslint --fix on save**

### Enable TypeScript
1. Go to **Preferences → Languages & Frameworks → TypeScript**
2. Check **Recompile on changes**
3. Set TypeScript version to project's `node_modules/typescript`

## Other IDEs

### General Requirements
Any IDE should be configured to:
1. Use the project's **ESLint** configuration (`.eslintrc.json`)
2. Use the project's **Prettier** configuration (`.prettierrc`)
3. Format on save using Prettier
4. Run ESLint fixes on save
5. Use the project's TypeScript version from `node_modules`

### Command Line Alternative
If your IDE doesn't support auto-formatting, you can use:
```bash
# Format all files
npm run format

# Lint and fix all files
npm run lint -- --fix

# Or use git hooks (already configured)
# Files are auto-formatted and linted on commit
```

## Troubleshooting

### VS Code Not Formatting
1. Check that Prettier extension is installed
2. Verify default formatter: Cmd+Shift+P → "Format Document With..." → Select Prettier
3. Check for syntax errors preventing formatting

### ESLint Not Working
1. Restart the ESLint server: Cmd+Shift+P → "ESLint: Restart ESLint Server"
2. Check for `.eslintrc.json` errors: `npm run lint`
3. Ensure ESLint extension is enabled for the workspace

### Different Formatting Results
1. Ensure everyone uses the same Prettier version (check `package-lock.json`)
2. Verify no local prettier config overrides (`~/.prettierrc`)
3. Check IDE isn't using global Prettier installation