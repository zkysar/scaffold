#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files in src
const files = glob.sync('src/**/*.ts', { ignore: 'src/lib/logger.ts' });

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Check if file has console statements
  if (!content.includes('console.')) {
    return;
  }

  // Skip logger.ts itself
  if (file === 'src/lib/logger.ts') {
    return;
  }

  // Check if logger is imported, add if not
  if (!content.includes("import { logger }") && !content.includes("import logger")) {
    // Find the last import statement
    const importMatch = content.match(/^import .* from .*;$/gm);
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;

      // Add logger import after the last import
      content = content.slice(0, insertPosition) + "\nimport { logger } from '@/lib/logger';" + content.slice(insertPosition);
      modified = true;
    }
  }

  // Replace console.log with logger.info
  content = content.replace(/console\.log\(/g, 'logger.info(');

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, 'logger.error(');

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');

  // Check if we made changes
  if (content.includes('logger.info(') || content.includes('logger.error(') || content.includes('logger.warn(')) {
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('All console statements replaced with logger calls');