/**
 * Program builder - creates the Commander program instance
 * Separated from index.ts to avoid circular dependencies
 *
 * @deprecated Use ProgramBuilder injectable class instead
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { ProgramBuilder } from './program-builder';

export function createProgram(container: DependencyContainer): Command {
  const programBuilder = container.resolve(ProgramBuilder);
  return programBuilder.build();
}
