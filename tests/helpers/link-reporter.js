const path = require('path');
const fs = require('fs');

class LinkReporter {
  onRunComplete(contexts, results) {
    const cwd = process.cwd();

    // Log test report links
    const testReportsDir = path.join(cwd, 'test-reports');
    if (fs.existsSync(testReportsDir)) {
      console.log('\n📊 Test Reports Generated:');

      const reportFiles = [
        { file: 'test-report.html', name: 'All Tests' },
        { file: 'unit-tests.html', name: 'Unit Tests' },
        { file: 'integration-tests.html', name: 'Integration Tests' },
        { file: 'contract-tests.html', name: 'Contract Tests' }
      ];

      reportFiles.forEach(({ file, name }) => {
        const reportPath = path.join(testReportsDir, file);
        if (fs.existsSync(reportPath)) {
          const fileUrl = `file://${reportPath}`;
          console.log(`   ${name}: \x1b]8;;${fileUrl}\x1b\\${fileUrl}\x1b]8;;\x1b\\`);
        }
      });
    }

    // Log coverage report link if it exists
    const coverageDir = path.join(cwd, 'coverage');
    const coverageIndexPath = path.join(coverageDir, 'lcov-report', 'index.html');
    if (fs.existsSync(coverageIndexPath)) {
      const fileUrl = `file://${coverageIndexPath}`;
      console.log(`\n📈 Coverage Report: \x1b]8;;${fileUrl}\x1b\\${fileUrl}\x1b]8;;\x1b\\`);
    }

    console.log(''); // Add blank line
  }
}

module.exports = LinkReporter;