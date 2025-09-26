/**
 * Factory for creating CLI commands
 */

import { Command } from 'commander';
import { injectable, inject, DependencyContainer } from 'tsyringe';

import { createCheckCommand } from './check.command';
import { createCleanCommand } from './clean.command';
import { createConfigCommand } from './config.command';
import { createExtendCommand } from './extend.command';
import { createFixCommand } from './fix.command';
import { createNewCommand } from './new.command';
import { createShowCommand } from './show.command';
import { createTemplateCommand } from './template.command';

@injectable()
export class CommandFactory {
  constructor(@inject('Container') private container: DependencyContainer) {}

  createCheckCommand(): Command {
    return createCheckCommand(this.container);
  }

  createCleanCommand(): Command {
    return createCleanCommand(this.container);
  }

  createConfigCommand(): Command {
    return createConfigCommand(this.container);
  }

  createExtendCommand(): Command {
    return createExtendCommand(this.container);
  }

  createFixCommand(): Command {
    return createFixCommand(this.container);
  }

  createNewCommand(): Command {
    return createNewCommand(this.container);
  }

  createShowCommand(): Command {
    return createShowCommand(this.container);
  }

  createTemplateCommand(): Command {
    return createTemplateCommand(this.container);
  }
}
