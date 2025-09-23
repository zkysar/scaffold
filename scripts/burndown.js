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

// Commands
const commands = {
  // Show current burndown status
  status: () => {
    const blocklist = loadBlocklist();
    console.log('\n📊 Burndown Status:');
    console.log('─'.repeat(50));
    console.log(`Total Tests: ${blocklist.statistics.totalTests}`);
    console.log(`Passing Tests: ${blocklist.statistics.passingTests}`);
    console.log(`Failing Tests: ${blocklist.statistics.failingTests}`);
    console.log(`\nBlocked Test Files: ${blocklist.tests.blocked.length}`);
    console.log(`Passing Test Files: ${blocklist.statistics.passingTestFiles}`);
    console.log('─'.repeat(50));

    const percentage = Math.round((blocklist.statistics.passingTests / blocklist.statistics.totalTests) * 100);
    console.log(`\n✅ Progress: ${percentage}% tests passing`);
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

Examples:
  node scripts/burndown.js status
  node scripts/burndown.js check tests/unit/services/template-service.test.ts
  node scripts/burndown.js remove tests/unit/services/template-service.test.ts
  node scripts/burndown.js scan
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