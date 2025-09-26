/**
 * Test container configuration for DI-based testing
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { createTestContainer as createBaseTestContainer } from '@/di/container';

/**
 * Create a test container with proper isolation
 * Each test gets its own container instance to prevent cross-test contamination
 */
export function createTestContainer(): DependencyContainer {
  // Use the base test container from the DI module
  return createBaseTestContainer();
}

/**
 * Helper to mock a specific service in the container
 */
export function mockService<T>(
  testContainer: DependencyContainer,
  token: any,
  mockImplementation: Partial<T>
): void {
  testContainer.registerInstance(token, mockImplementation);
}

/**
 * Helper to spy on a service method
 */
export function spyOnService<T extends object>(
  service: T,
  methodName: keyof T
): jest.SpyInstance {
  return jest.spyOn(service, methodName as any);
}

/**
 * Reset all mocks in the container
 */
export function resetContainer(testContainer: DependencyContainer): void {
  testContainer.reset();
}
