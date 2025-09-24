#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

// Find all TypeScript files with logger calls
const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Fix logger.info calls with multiple arguments
  // Pattern: logger.info(arg1, arg2, ...) -> logger.info(arg1 + ' ' + arg2 + ...)
  content = content.replace(/logger\.(info|error|warn|success)\(([^)]+)\)/g, (match, method, args) => {
    // Check if this has multiple arguments (contains comma not inside quotes or objects)
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let hasComma = false;

    for (let i = 0; i < args.length; i++) {
      const char = args[i];
      const prevChar = i > 0 ? args[i-1] : '';

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
      } else {
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          inString = true;
          stringChar = char;
        } else if (char === '(' || char === '{' || char === '[') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']') {
          depth--;
        } else if (char === ',' && depth === 0) {
          hasComma = true;
          break;
        }
      }
    }

    if (hasComma) {
      // Split arguments properly
      const parts = [];
      let current = '';
      depth = 0;
      inString = false;

      for (let i = 0; i < args.length; i++) {
        const char = args[i];
        const prevChar = i > 0 ? args[i-1] : '';

        if (inString) {
          current += char;
          if (char === stringChar && prevChar !== '\\') {
            inString = false;
          }
        } else {
          if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
            inString = true;
            stringChar = char;
            current += char;
          } else if (char === '(' || char === '{' || char === '[') {
            depth++;
            current += char;
          } else if (char === ')' || char === '}' || char === ']') {
            depth--;
            current += char;
          } else if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
      }

      if (current.trim()) {
        parts.push(current.trim());
      }

      // Join with string concatenation
      const joined = parts.join(' + \' \' + ');
      modified = true;
      return `logger.${method}(${joined})`;
    }

    return match;
  });

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Fixed logger arguments in: ${file}`);
  }
});

console.log('Logger argument fixes complete');