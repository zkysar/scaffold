#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BLOCKLIST_FILE = path.join(__dirname, '..', 'burndown-blocklist.json');

// Load the burndown blocklist
function loadBlocklist() {
  try {
    return JSON.parse(fs.readFileSync(BLOCKLIST_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading burndown-blocklist.json:', error.message);
    process.exit(1);
  }
}

// Save the burndown blocklist
function saveBlocklist(blocklist) {
  try {
    fs.writeFileSync(BLOCKLIST_FILE, JSON.stringify(blocklist, null, 2));
  } catch (error) {
    console.error('Error saving burndown-blocklist.json:', error.message);
    process.exit(1);
  }
}

// Run a single test file to check if it passes
function testFile(filePath) {
  try {
    execSync(`npm test -- ${filePath}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Get actual test statistics by running Jest
function getActualTestStats() {
  let output;
  try {
    output = execSync('npm test', { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    // Tests might fail but we can still parse the output
    output = error.stdout + error.stderr || '';
  }

  try {

    // Parse the Jest output for test statistics
    const lines = output.split('\n');
    let totalTests = 0;
    let passingTests = 0;
    let failingTests = 0;

    // Look for the summary line like "Tests:       174 failed, 180 passed, 354 total"
    for (const line of lines) {
      // Trim the line to normalize whitespace
      const trimmedLine = line.trim();

      const testSummaryMatch = trimmedLine.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testSummaryMatch) {
        failingTests = parseInt(testSummaryMatch[1], 10);
        passingTests = parseInt(testSummaryMatch[2], 10);
        totalTests = parseInt(testSummaryMatch[3], 10);
        break;
      }

      // Alternative format: "Tests:       124 passed, 230 failed, 354 total"
      const altTestSummaryMatch = trimmedLine.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/);
      if (altTestSummaryMatch) {
        passingTests = parseInt(altTestSummaryMatch[1], 10);
        failingTests = parseInt(altTestSummaryMatch[2], 10);
        totalTests = parseInt(altTestSummaryMatch[3], 10);
        break;
      }

      // Format with only passing: "Tests:       354 passed, 354 total"
      const passingOnlyMatch = trimmedLine.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (passingOnlyMatch) {
        passingTests = parseInt(passingOnlyMatch[1], 10);
        totalTests = parseInt(passingOnlyMatch[2], 10);
        failingTests = totalTests - passingTests;
        break;
      }

      // Format with only failing: "Tests:       230 failed, 354 total"
      const failingOnlyMatch = trimmedLine.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+total/);
      if (failingOnlyMatch) {
        failingTests = parseInt(failingOnlyMatch[1], 10);
        totalTests = parseInt(failingOnlyMatch[2], 10);
        passingTests = totalTests - failingTests;
        break;
      }
    }

    if (totalTests > 0) {
      return { totalTests, passingTests, failingTests };
    } else {
      return null;
    }
  } catch (error) {
    console.warn('Warning: Could not get actual test statistics, using cached values');
    return null;
  }
}

// Commands
const commands = {
  // Show current burndown status
  status: () => {
    const blocklist = loadBlocklist();

    // Get actual test statistics from Jest
    const actualStats = getActualTestStats();
    const stats = actualStats || blocklist.statistics;

    console.log('\n📊 Burndown Status:');
    console.log('─'.repeat(50));
    console.log(`Total Tests: ${stats.totalTests}`);
    console.log(`Passing Tests: ${stats.passingTests}`);
    console.log(`Failing Tests: ${stats.failingTests}`);
    console.log(`\nBlocked Test Files: ${blocklist.tests.blocked.length}`);
    console.log(`Passing Test Files: ${blocklist.statistics.passingTestFiles}`);
    console.log('─'.repeat(50));

    const percentage = Math.round((stats.passingTests / stats.totalTests) * 100);
    console.log(`\n✅ Progress: ${percentage}% tests passing`);

    if (actualStats) {
      console.log('\n📈 Statistics refreshed from live test run');
    } else {
      console.log('\n⚠️  Using cached statistics (run tests to refresh)');
    }
  },

  // List all blocked test files
  list: () => {
    const blocklist = loadBlocklist();
    console.log('\n🚫 Blocked Test Files:');
    console.log('─'.repeat(50));
    blocklist.tests.blocked.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
  },

  // Check a specific test file
  check: (filePath) => {
    if (!filePath) {
      console.error('Error: Please provide a test file path');
      process.exit(1);
    }

    console.log(`\n🔍 Checking ${filePath}...`);
    const passes = testFile(filePath);

    if (passes) {
      console.log('✅ Test passes! You can remove it from the blocklist.');
    } else {
      console.log('❌ Test still fails.');
    }
  },

  // Remove a test file from the blocklist if it passes
  remove: (filePath) => {
    if (!filePath) {
      console.error('Error: Please provide a test file path');
      process.exit(1);
    }

    const blocklist = loadBlocklist();
    const index = blocklist.tests.blocked.indexOf(filePath);

    if (index === -1) {
      console.log(`⚠️  ${filePath} is not in the blocklist`);
      return;
    }

    console.log(`\n🔍 Testing ${filePath} before removing...`);
    const passes = testFile(filePath);

    if (!passes) {
      console.log('❌ Test still fails. Cannot remove from blocklist.');
      return;
    }

    // Remove from blocklist
    blocklist.tests.blocked.splice(index, 1);

    // Update statistics (rough estimate - would need actual test count for accuracy)
    const estimatedTestsPerFile = Math.floor(blocklist.statistics.failingTests / blocklist.tests.blocked.length);
    blocklist.statistics.failingTests -= estimatedTestsPerFile;
    blocklist.statistics.passingTests += estimatedTestsPerFile;
    blocklist.statistics.passingTestFiles += 1;

    saveBlocklist(blocklist);
    console.log(`✅ Removed ${filePath} from blocklist`);
    console.log(`📊 ${blocklist.tests.blocked.length} files remaining in blocklist`);
  },

  // Scan all blocked tests to find which ones now pass
  scan: () => {
    const blocklist = loadBlocklist();
    const passing = [];
    const failing = [];

    console.log('\n🔍 Scanning all blocked tests...\n');

    blocklist.tests.blocked.forEach((file, index) => {
      process.stdout.write(`[${index + 1}/${blocklist.tests.blocked.length}] Testing ${file}... `);
      const passes = testFile(file);

      if (passes) {
        console.log('✅ PASSES');
        passing.push(file);
      } else {
        console.log('❌ FAILS');
        failing.push(file);
      }
    });

    console.log('\n📊 Scan Results:');
    console.log('─'.repeat(50));
    console.log(`✅ Now passing: ${passing.length} files`);
    console.log(`❌ Still failing: ${failing.length} files`);

    if (passing.length > 0) {
      console.log('\n✨ Files ready to remove from blocklist:');
      passing.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log('\nRun "npm run burndown:remove <file>" to remove each one');
    }
  },

  // Run tests with burndown configuration
  test: () => {
    console.log('\n🧪 Running tests with burndown configuration...\n');
    try {
      execSync('npm test -- --config=jest.config.burndown.js', { stdio: 'inherit' });
    } catch (error) {
      // Test command will exit with non-zero if tests fail, which is expected
      process.exit(error.status);
    }
  },

  // Run linting with burndown configuration
  lint: () => {
    console.log('\n🔍 Running ESLint with burndown configuration...\n');
    try {
      execSync('eslint src --ext .ts --config .eslintrc.burndown.js', { stdio: 'inherit' });
    } catch (error) {
      process.exit(error.status);
    }
  },

  // Update cached statistics with actual test results
  refresh: () => {
    console.log('\n🔄 Refreshing statistics from test results...\n');

    const actualStats = getActualTestStats();
    if (!actualStats) {
      console.error('❌ Failed to get actual test statistics');
      process.exit(1);
    }

    const blocklist = loadBlocklist();
    blocklist.statistics.totalTests = actualStats.totalTests;
    blocklist.statistics.passingTests = actualStats.passingTests;
    blocklist.statistics.failingTests = actualStats.failingTests;

    saveBlocklist(blocklist);

    console.log('✅ Statistics updated successfully:');
    console.log(`   Total Tests: ${actualStats.totalTests}`);
    console.log(`   Passing Tests: ${actualStats.passingTests}`);
    console.log(`   Failing Tests: ${actualStats.failingTests}`);
  }
};

// Help text
function showHelp() {
  console.log(`
📉 Burndown Management Tool

Usage: node scripts/burndown.js <command> [options]

Commands:
  status              Show current burndown statistics
  list                List all blocked test files
  check <file>        Check if a specific test file passes
  remove <file>       Remove a file from blocklist if it passes
  scan                Scan all blocked tests to find passing ones
  test                Run tests with burndown configuration
  lint                Run ESLint with burndown configuration
  refresh             Update cached statistics with actual test results

Examples:
  node scripts/burndown.js status
  node scripts/burndown.js check tests/unit/services/template-service.test.ts
  node scripts/burndown.js remove tests/unit/services/template-service.test.ts
  node scripts/burndown.js scan
  node scripts/burndown.js refresh
`);
}

// Main
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === 'help' || command === '--help') {
  showHelp();
} else if (commands[command]) {
  commands[command](...args);
} else {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}