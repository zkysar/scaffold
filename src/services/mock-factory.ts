/**
 * Mock factory for creating unimplemented service stubs
 */

/**
 * Creates a mock implementation of a service interface that throws
 * descriptive errors when any method is called.
 *
 * @param serviceName - The name of the service for error messages
 * @returns A proxy object that implements the service interface
 */
export function createMockService<T extends object>(serviceName: string): T {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Handle special properties
      if (prop === Symbol.toStringTag) {
        return serviceName;
      }

      // Handle constructor
      if (prop === 'constructor') {
        return Object;
      }

      // For any other property, assume it's a method and return a function that throws
      if (typeof prop === 'string') {
        // Return a function that throws with a descriptive error
        return async (): Promise<unknown> => {
          throw new Error(`${serviceName}.${prop} is not implemented`);
        };
      }

      return undefined;
    },
  };

  // Create an empty object and wrap it with the proxy
  const mockInstance = {};
  return new Proxy(mockInstance, handler) as T;
}

/**
 * Creates a mock service class that can be instantiated
 * @param serviceName - The name of the service for error messages
 * @returns A class constructor that creates mock instances
 */
export function createMockServiceClass<T extends object>(
  serviceName: string
): new (...args: unknown[]) => T {
  return class MockService {
    constructor(...args: unknown[]) {
      void args; // Silence unused warning
      return createMockService<T>(serviceName);
    }
  } as new (...args: unknown[]) => T;
}
