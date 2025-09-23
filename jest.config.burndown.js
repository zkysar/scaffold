/** @type {import('jest').Config} */
const fs = require('fs');
const path = require('path');

// Load the burndown blocklist
const blocklistPath = path.join(__dirname, 'burndown-blocklist.json');
const blocklist = JSON.parse(fs.readFileSync(blocklistPath, 'utf8'));

// Convert blocked test files to absolute paths for testPathIgnorePatterns
const ignoredTests = blocklist.tests.blocked.map(file =>
  `<rootDir>/${file}`
);

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Test file locations
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Ignore blocked test files from burndown list
  testPathIgnorePatterns: [
    '/node_modules/',
    ...ignoredTests
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts'
  ],

  // Coverage thresholds (50% minimum for all TypeScript files)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Test projects for different test types
  projects: [
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        ...ignoredTests
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
      }
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        ...ignoredTests
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts', '<rootDir>/tests/integration-setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
      }
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        ...ignoredTests
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
      }
    }
  ],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/fixtures/',
    '/tests/helpers/',
    '\\.d\\.ts$',
    'index\\.ts$'
  ]
};