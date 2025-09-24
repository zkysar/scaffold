#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

// Find all service files with decorator issues
const files = [
  'src/services/project-creation.service.ts',
  'src/services/project-extension.service.ts',
  'src/services/project-fix.service.ts',
  'src/services/project-manifest.service.ts',
  'src/services/project-validation.service.ts',
  'src/services/template-service.ts',
  'src/services/variable-substitution.service.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove @inject decorators from constructor parameters
  // Pattern: @inject(ClassName) private readonly
  content = content.replace(/@inject\([^)]+\)\s+/g, '');

  fs.writeFileSync(file, content);
  console.log(`Fixed decorators in: ${file}`);
});

console.log('Decorator fixes complete');