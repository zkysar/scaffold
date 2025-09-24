#!/bin/bash

# Replace console statements with logger calls in TypeScript files

# First, ensure all files import logger if they use console
for file in $(find src -type f -name "*.ts" -exec grep -l "console\." {} \;); do
  # Skip logger.ts itself
  if [[ "$file" == "src/lib/logger.ts" ]]; then
    continue
  fi

  # Check if logger is already imported
  if ! grep -q "import.*logger" "$file"; then
    # Add logger import after the last import statement
    awk '
      /^import/ { last_import = NR; imports[NR] = $0 }
      { lines[NR] = $0 }
      END {
        for (i = 1; i <= NR; i++) {
          print lines[i]
          if (i == last_import) {
            print "import { logger } from '\''@/lib/logger'\'';"
          }
        }
      }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi

  # Replace console.log with logger.info (concatenating multiple arguments)
  sed -i.bak -E "s/console\.log\(([^)]+)\)/logger.info(\1)/g" "$file"

  # Replace console.error with logger.error
  sed -i.bak -E "s/console\.error\(([^)]+)\)/logger.error(\1)/g" "$file"

  # Replace console.warn with logger.warn
  sed -i.bak -E "s/console\.warn\(([^)]+)\)/logger.warn(\1)/g" "$file"

  # Clean up backup files
  rm -f "$file.bak"
done

# Fix multi-argument logger calls by concatenating them
for file in $(find src -type f -name "*.ts"); do
  # Skip logger.ts itself
  if [[ "$file" == "src/lib/logger.ts" ]]; then
    continue
  fi

  # Use Node.js to properly handle multi-argument calls
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$file', 'utf8');

    // Replace multi-argument logger calls
    const fixed = content
      .replace(/logger\.(info|error|warn|success)\(([^)]+)\)/g, (match, method, args) => {
        // Check if it contains a comma (multiple arguments)
        if (args.includes(',') && !args.includes('=>') && !args.includes('{')) {
          // Split by comma, trim, and join with +
          const parts = args.split(',').map(p => p.trim());
          if (parts.length > 1) {
            // Join with string concatenation
            const joined = parts.join(' + \" \" + ');
            return 'logger.' + method + '(' + joined + ')';
          }
        }
        return match;
      });

    fs.writeFileSync('$file', fixed);
  "
done

echo "Console statements replaced with logger calls"