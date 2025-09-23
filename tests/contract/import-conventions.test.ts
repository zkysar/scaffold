/**
 * Contract test for import conventions
 * Ensures all source files follow proper import patterns
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Import Conventions', () => {
  const srcDir = path.resolve(__dirname, '../../src');
  const testDir = path.resolve(__dirname, '..');

  it('should not use relative parent imports in source files', async () => {
    const files = await glob('**/*.ts', {
      cwd: srcDir,
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(srcDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for relative parent imports
        if (/^import .* from ['"]\.\.\//.test(line.trim())) {
          violations.push(`${file}:${index + 1} - ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      const message = [
        'Found relative parent imports that should use @ aliases:',
        '',
        ...violations,
        '',
        'Replace these with:',
        '  ../../models → @/models',
        '  ../../services → @/services',
        '  ../../lib/* → @/lib/*'
      ].join('\n');

      throw new Error(message);
    }
  });

  it('should not use relative parent imports in test files', async () => {
    const files = await glob('**/*.test.ts', {
      cwd: testDir,
    });

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(testDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for relative imports to src directory
        if (/^import .* from ['"]\.\.\/\.\.\/(\.\.\/)?src\//.test(line.trim())) {
          violations.push(`${file}:${index + 1} - ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      const message = [
        'Found relative imports to src directory in test files that should use @ aliases:',
        '',
        ...violations,
        '',
        'Replace these with:',
        '  ../../../src/models → @/models',
        '  ../../../src/services → @/services',
        '  ../../../src/lib/* → @/lib/*',
        '  ../../helpers/* → @tests/helpers/*'
      ].join('\n');

      throw new Error(message);
    }
  });

  it('should use path aliases for cross-module imports', async () => {
    const files = await glob('**/*.ts', {
      cwd: srcDir,
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    const crossModulePatterns = [
      { pattern: /from ['"]\.\.\/\.\.\/(models|services|lib|types)/, suggestion: '@/$1' },
      { pattern: /from ['"]\.\.\/\.\.\/(models|services|lib|types)\//, suggestion: '@/$1/' }
    ];

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(srcDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const { pattern, suggestion } of crossModulePatterns) {
          if (pattern.test(line)) {
            violations.push(
              `${file}:${index + 1} - Should use ${suggestion} alias`
            );
          }
        }
      });
    }

    if (violations.length > 0) {
      const message = [
        'Found cross-module imports not using aliases:',
        '',
        ...violations
      ].join('\n');

      throw new Error(message);
    }
  });

  it('should use path aliases for cross-module imports in test files', async () => {
    const files = await glob('**/*.test.ts', {
      cwd: testDir,
    });

    const testCrossModulePatterns = [
      { pattern: /from ['"]\.\.\/\.\.\/(\.\.\/)?src\/(models|services|lib|types)['"]/, suggestion: '@/$2' },
      { pattern: /from ['"]\.\.\/\.\.\/(\.\.\/)?src\/(models|services|lib|types)\//, suggestion: '@/$2/' },
      { pattern: /from ['"]\.\.\/\.\.\/helpers\//, suggestion: '@tests/helpers/' },
      { pattern: /from ['"]\.\.\/helpers\//, suggestion: '@tests/helpers/' }
    ];

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(testDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const { pattern, suggestion } of testCrossModulePatterns) {
          if (pattern.test(line)) {
            violations.push(
              `${file}:${index + 1} - Should use ${suggestion} alias`
            );
          }
        }
      });
    }

    if (violations.length > 0) {
      const message = [
        'Found cross-module imports not using aliases in test files:',
        '',
        ...violations
      ].join('\n');

      throw new Error(message);
    }
  });

  it('should have consistent import ordering', async () => {
    const files = await glob('**/*.ts', {
      cwd: srcDir,
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    const warnings: string[] = [];

    for (const file of files) {
      const filePath = path.join(srcDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const imports = lines
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => line.startsWith('import '));

      if (imports.length <= 1) continue;

      // Check for proper grouping (this is a simple check)
      let lastWasAlias = false;
      let hasSeenNonAlias = false;

      for (const { line, index } of imports) {
        const isAlias = line.includes('from \'@/') || line.includes('from "@/');

        if (isAlias && hasSeenNonAlias && !lastWasAlias) {
          warnings.push(
            `${file}:${index + 1} - Alias imports should be grouped together`
          );
        }

        if (!isAlias) {
          hasSeenNonAlias = true;
        }
        lastWasAlias = isAlias;
      }
    }

    // Warnings don't fail the test but are reported
    if (warnings.length > 0) {
      console.warn('Import ordering suggestions:\n' + warnings.join('\n'));
    }
  });
});