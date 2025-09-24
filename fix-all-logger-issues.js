#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixLoggerCallsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;

  // Fix logger.info(chalk.blue('Key:'), value) -> logger.keyValue('Key', value, 'blue')
  modified = modified.replace(/logger\.info\(chalk\.(\w+)\('([^']+):'\),\s*([^)]+)\)/g, (match, color, key, value) => {
    hasChanges = true;
    return `logger.keyValue('${key}', ${value}, '${color}')`;
  });

  // Fix logger.info(arg1, arg2) -> logger.info(arg1 + ' ' + arg2) for simple cases
  modified = modified.replace(/logger\.(info|warn|success|debug|bold|gray|yellow|green|red)\(([^,]+),\s*([^)]+)\)/g, (match, method, arg1, arg2) => {
    // Skip if already processed or if it's keyValue
    if (match.includes('keyValue')) return match;
    hasChanges = true;
    return `logger.${method}(${arg1} + ' ' + ${arg2})`;
  });

  // Fix logger.error with 3 args
  modified = modified.replace(/logger\.error\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, arg1, arg2, arg3) => {
    hasChanges = true;
    return `logger.error(${arg1} + ' ' + ${arg2}, ${arg3})`;
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, modified);
    console.log(`Fixed logger calls in: ${filePath}`);
  }

  return hasChanges;
}

// Process command files
const commandsDir = path.join(__dirname, 'src', 'cli', 'commands');
const files = fs.readdirSync(commandsDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => path.join(commandsDir, f));

let totalFixed = 0;
files.forEach(file => {
  if (fixLoggerCallsInFile(file)) {
    totalFixed++;
  }
});

console.log(`Fixed logger calls in ${totalFixed} command files`);
