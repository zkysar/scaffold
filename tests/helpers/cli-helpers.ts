/**
 * CLI-specific test helpers
 * Provides utilities for mocking file systems and console output in CLI tests
 */

import mockFs from 'mock-fs';

/**
 * Mock file system interface for testing
 */
export interface MockFileSystem {
  [path: string]: string | MockFileSystem | mockFs.Directory;
}

/**
 * Create a mock file system structure for testing
 */
export function createMockFileSystem(structure: MockFileSystem): MockFileSystem {
  return structure;
}

/**
 * Mock console interface with captured output
 */
export interface MockConsole {
  mockConsole: {
    log: jest.MockedFunction<typeof console.log>;
    warn: jest.MockedFunction<typeof console.warn>;
    error: jest.MockedFunction<typeof console.error>;
    info: jest.MockedFunction<typeof console.info>;
  };
  logs: string[];
  warnings: string[];
  errors: string[];
  infos: string[];
  clear: () => void;
}

/**
 * Create a mock console with captured output for testing
 */
export function createMockConsole(): MockConsole {
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
 * Command result interface for testing
 */
export interface CommandResult {
  code: number;
  message: string;
  data?: any;
}

/**
 * Mock CLI runner for testing commands
 */
export class MockCliRunner {
  private mockConsole: MockConsole;

  constructor() {
    this.mockConsole = createMockConsole();
  }

  /**
   * Get the mock console instance
   */
  getConsole(): MockConsole {
    return this.mockConsole;
  }

  /**
   * Execute a command with mocked environment
   */
  async executeCommand(
    command: string,
    args: string[],
    options: Record<string, any> = {}
  ): Promise<CommandResult> {
    // Replace global console with our mock
    const originalConsole = { ...console };
    Object.assign(console, this.mockConsole.mockConsole);

    try {
      // This will be implemented when actual CLI commands exist
      // For now, return a failing result to satisfy TDD principles
      return {
        code: 1,
        message: `Command '${command}' not implemented yet`
      };
    } finally {
      // Restore original console
      Object.assign(console, originalConsole);
    }
  }

  /**
   * Clear all captured output
   */
  clear(): void {
    this.mockConsole.clear();
  }
}

/**
 * Simulate user input for interactive commands
 */
export function mockUserInput(answers: Record<string, any>): void {
  const inquirer = require('inquirer');
  if (inquirer && inquirer.prompt) {
    jest.spyOn(inquirer, 'prompt').mockResolvedValue(answers);
  }
}

/**
 * Create a temporary project structure for testing
 */
export function createTestProject(structure: MockFileSystem): void {
  mockFs(structure);
}

/**
 * Assert that a command result matches expected values
 */
export function expectCommandResult(
  result: CommandResult,
  expected: Partial<CommandResult>
): void {
  if (expected.code !== undefined) {
    expect(result.code).toBe(expected.code);
  }
  if (expected.message !== undefined) {
    expect(result.message).toBe(expected.message);
  }
  if (expected.data !== undefined) {
    expect(result.data).toEqual(expected.data);
  }
}