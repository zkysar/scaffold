#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TRACKING_DIR = path.join(__dirname, '..', 'tracking');
const TEST_STATUS_FILE = path.join(TRACKING_DIR, 'test-status.json');
const FAILING_TEST_STATUS_FILE = path.join(TRACKING_DIR, 'failing-test-status.json');
const LINT_ISSUES_FILE = path.join(TRACKING_DIR, 'lint-issues.json');
const COMPILATION_ERRORS_FILE = path.join(TRACKING_DIR, 'compilation-errors.json');

// Get test results with detailed information
function getTestResults() {
  const testStatus = {
    files: {}
  };

  try {
    // Run Jest with JSON reporter to get detailed results
    const output = execSync('npx jest --json --no-coverage 2>/dev/null', {
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });

    const results = JSON.parse(output);

    // Process test results
    if (results.testResults) {
      results.testResults.forEach(fileResult => {
        // Get relative path from project root
        const relativePath = path.relative(process.cwd(), fileResult.name);

        const fileInfo = {
          suites: {}
        };

        // Process each test suite and test
        if (fileResult.assertionResults) {
          fileResult.assertionResults.forEach(test => {
            // Parse ancestor titles (suite names) and test title
            const suitePath = test.ancestorTitles.join(' > ');

            if (!fileInfo.suites[suitePath]) {
              fileInfo.suites[suitePath] = {};
            }

            fileInfo.suites[suitePath][test.title] = test.status;
          });
        }

        testStatus.files[relativePath] = fileInfo;
      });
    }
  } catch (error) {
    // Tests might fail but we can still parse the output
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);

        if (results.testResults) {
          results.testResults.forEach(fileResult => {
            const relativePath = path.relative(process.cwd(), fileResult.name);

            const fileInfo = {
              suites: {}
            };

            if (fileResult.assertionResults) {
              fileResult.assertionResults.forEach(test => {
                const suitePath = test.ancestorTitles.join(' > ');

                if (!fileInfo.suites[suitePath]) {
                  fileInfo.suites[suitePath] = {};
                }

                fileInfo.suites[suitePath][test.title] = test.status;
              });
            }

            testStatus.files[relativePath] = fileInfo;
          });
        }
      } catch (parseError) {
        console.error('Failed to parse test results:', parseError.message);
      }
    }
  }

  // Sort files for consistent output
  const sortedStatus = { files: {} };
  Object.keys(testStatus.files).sort().forEach(file => {
    sortedStatus.files[file] = testStatus.files[file];
  });

  return sortedStatus;
}

// Get ESLint results
function getLintResults() {
  const lintIssues = {
    files: {}
  };

  try {
    // Run ESLint with JSON formatter (only src directory since tests is ignored)
    const output = execSync('npx eslint src --ext .ts,.tsx --format json 2>/dev/null', {
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const results = JSON.parse(output);

    // Process lint results
    results.forEach(fileResult => {
      if (fileResult.messages && fileResult.messages.length > 0) {
        const relativePath = path.relative(process.cwd(), fileResult.filePath);

        const issues = fileResult.messages.map(msg => ({
          line: msg.line,
          column: msg.column,
          rule: msg.ruleId || 'unknown',
          severity: msg.severity === 2 ? 'error' : 'warning',
          message: msg.message
        }));

        // Sort issues by line and column for consistency
        issues.sort((a, b) => {
          if (a.line !== b.line) return a.line - b.line;
          return a.column - b.column;
        });

        lintIssues.files[relativePath] = issues;
      }
    });
  } catch (error) {
    // ESLint might exit with non-zero if there are errors, but we can still parse output
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);

        results.forEach(fileResult => {
          if (fileResult.messages && fileResult.messages.length > 0) {
            const relativePath = path.relative(process.cwd(), fileResult.filePath);

            const issues = fileResult.messages.map(msg => ({
              line: msg.line,
              column: msg.column,
              rule: msg.ruleId || 'unknown',
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message
            }));

            issues.sort((a, b) => {
              if (a.line !== b.line) return a.line - b.line;
              return a.column - b.column;
            });

            lintIssues.files[relativePath] = issues;
          }
        });
      } catch (parseError) {
        console.error('Failed to parse lint results:', parseError.message);
      }
    }
  }

  // Sort files for consistent output
  const sortedIssues = { files: {} };
  Object.keys(lintIssues.files).sort().forEach(file => {
    sortedIssues.files[file] = lintIssues.files[file];
  });

  return sortedIssues;
}

// Get TypeScript compilation errors
function getCompilationErrors() {
  const compilationErrors = {
    files: {}
  };

  try {
    // Run TypeScript compiler in no-emit mode to check for errors
    execSync('npx tsc --noEmit --project tsconfig.test.json 2>&1', {
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    // If command succeeds, no compilation errors
  } catch (error) {
    if (error.stdout) {
      const output = error.stdout.toString();
      const lines = output.split('\n');

      lines.forEach(line => {
        // Parse TypeScript error format: file(line,column): error TS####: message
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
        if (match) {
          const [, filePath, lineNum, colNum, errorCode, message] = match;
          const relativePath = path.relative(process.cwd(), filePath);

          if (!compilationErrors.files[relativePath]) {
            compilationErrors.files[relativePath] = [];
          }

          compilationErrors.files[relativePath].push({
            line: parseInt(lineNum, 10),
            column: parseInt(colNum, 10),
            errorCode,
            message
          });
        }
      });
    }
  }

  // Sort files and errors for consistent output
  const sortedErrors = { files: {} };
  Object.keys(compilationErrors.files).sort().forEach(file => {
    sortedErrors.files[file] = compilationErrors.files[file].sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });
  });

  return sortedErrors;
}

// Main function
function main() {
  const silent = process.argv.includes('--silent');

  // Ensure tracking directory exists
  if (!fs.existsSync(TRACKING_DIR)) {
    fs.mkdirSync(TRACKING_DIR, { recursive: true });
  }

  if (!silent) {
    console.log('Updating test and lint tracking...');
  }

  // Get test results
  const testStatus = getTestResults();
  fs.writeFileSync(TEST_STATUS_FILE, JSON.stringify(testStatus, null, 2));

  // Create failing tests only file
  const failingTestStatus = { files: {} };

  Object.entries(testStatus.files).forEach(([filePath, fileData]) => {
    const failingSuites = {};

    Object.entries(fileData.suites).forEach(([suiteName, tests]) => {
      const failingTests = {};

      Object.entries(tests).forEach(([testName, status]) => {
        if (status === 'failed') {
          failingTests[testName] = status;
        }
      });

      if (Object.keys(failingTests).length > 0) {
        failingSuites[suiteName] = failingTests;
      }
    });

    if (Object.keys(failingSuites).length > 0) {
      failingTestStatus.files[filePath] = { suites: failingSuites };
    }
  });

  fs.writeFileSync(FAILING_TEST_STATUS_FILE, JSON.stringify(failingTestStatus, null, 2));

  if (!silent) {
    const totalFiles = Object.keys(testStatus.files).length;
    const failingFiles = Object.keys(failingTestStatus.files).length;
    let totalTests = 0;
    let passingTests = 0;
    let failingTests = 0;

    Object.values(testStatus.files).forEach(file => {
      Object.values(file.suites).forEach(suite => {
        Object.values(suite).forEach(status => {
          totalTests++;
          if (status === 'passed') passingTests++;
          else if (status === 'failed') failingTests++;
        });
      });
    });

    console.log(`Test status updated: ${totalFiles} files, ${totalTests} tests (${passingTests} passing, ${failingTests} failing in ${failingFiles} files)`);
  }

  // Get lint results
  const lintIssues = getLintResults();
  fs.writeFileSync(LINT_ISSUES_FILE, JSON.stringify(lintIssues, null, 2));

  if (!silent) {
    const filesWithIssues = Object.keys(lintIssues.files).length;
    let totalIssues = 0;
    let errors = 0;
    let warnings = 0;

    Object.values(lintIssues.files).forEach(issues => {
      totalIssues += issues.length;
      issues.forEach(issue => {
        if (issue.severity === 'error') errors++;
        else warnings++;
      });
    });

    console.log(`Lint issues updated: ${filesWithIssues} files with issues, ${totalIssues} total (${errors} errors, ${warnings} warnings)`);
  }

  // Get compilation errors
  const compilationErrors = getCompilationErrors();
  fs.writeFileSync(COMPILATION_ERRORS_FILE, JSON.stringify(compilationErrors, null, 2));

  if (!silent) {
    const filesWithErrors = Object.keys(compilationErrors.files).length;
    let totalErrors = 0;

    Object.values(compilationErrors.files).forEach(errors => {
      totalErrors += errors.length;
    });

    if (totalErrors > 0) {
      console.log(`Compilation errors found: ${filesWithErrors} files with errors, ${totalErrors} total`);
    } else {
      console.log('No TypeScript compilation errors found');
    }
  }
}

// Run main function
main();