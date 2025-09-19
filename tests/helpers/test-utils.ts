/**
 * Common test utilities for scaffold CLI testing
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';

/**
 * Create a temporary directory for testing
 */
export function createTempDir(): string {
  const tempDir = path.join(process.cwd(), '.scaffold-temp', `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  fs.ensureDirSync(tempDir);
  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.removeSync(tempDir);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temp directory: ${tempDir}`, error);
  }
}

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a spy that tracks calls with their arguments
 */
export function createCallTracker<T extends (...args: any[]) => any>() {
  const calls: Parameters<T>[] = [];
  const mockFn = jest.fn((...args: Parameters<T>) => {
    calls.push(args);
  }) as jest.MockedFunction<T>;

  return {
    mockFn,
    calls,
    getCallCount: () => calls.length,
    getCall: (index: number) => calls[index],
    getLastCall: () => calls[calls.length - 1],
    reset: () => {
      calls.length = 0;
      mockFn.mockClear();
    }
  };
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Create a simple mock implementation for testing
 */
export function createMockImplementation<T extends Record<string, any>>(
  partial: Partial<T>
): T {
  return partial as T;
}

/**
 * Normalize paths for cross-platform testing
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Create a mock console with captured output
 */
export function createMockConsole() {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const infos: string[] = [];

  const mockConsole = {
    log: jest.fn((...args: any[]) => logs.push(args.join(' '))),
    warn: jest.fn((...args: any[]) => warnings.push(args.join(' '))),
    error: jest.fn((...args: any[]) => errors.push(args.join(' '))),
    info: jest.fn((...args: any[]) => infos.push(args.join(' '))),
  };

  return {
    mockConsole,
    logs,
    warnings,
    errors,
    infos,
    clear: () => {
      logs.length = 0;
      warnings.length = 0;
      errors.length = 0;
      infos.length = 0;
    }
  };
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Validate that an object matches expected structure
 */
export function expectObjectStructure(
  actual: any,
  expected: Record<string, any>,
  path = ''
): void {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (!(key in actual)) {
      throw new Error(`Missing property: ${currentPath}`);
    }

    if (typeof expectedValue === 'object' && expectedValue !== null) {
      if (Array.isArray(expectedValue)) {
        if (!Array.isArray(actual[key])) {
          throw new Error(`Expected array at ${currentPath}, got ${typeof actual[key]}`);
        }
      } else {
        expectObjectStructure(actual[key], expectedValue, currentPath);
      }
    } else if (typeof actual[key] !== typeof expectedValue) {
      throw new Error(
        `Type mismatch at ${currentPath}: expected ${typeof expectedValue}, got ${typeof actual[key]}`
      );
    }
  }
}