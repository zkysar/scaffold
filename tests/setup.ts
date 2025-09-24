import 'reflect-metadata';
import mockFs from 'mock-fs';

// Global test setup
beforeEach(() => {
  // Reset console methods to prevent spam during testing
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();

  // Clean up mock filesystem
  mockFs.restore();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testTimeout: number;
    }
  }
}
