/**
 * Factory for creating command displays
 */

import { injectable } from 'tsyringe';

import { CheckDisplay } from './check-display';
import { CleanDisplay } from './clean-display';
import { ConfigDisplay } from './config-display';
import { ExtendDisplay } from './extend-display';
import { FixDisplay } from './fix-display';
import { NewDisplay } from './new-display';
import { ShowDisplay } from './show-display';
import { TemplateDisplay } from './template-display';

@injectable()
export class DisplayFactory {
  createCheckDisplay(): CheckDisplay {
    return new CheckDisplay();
  }

  createCleanDisplay(): CleanDisplay {
    return new CleanDisplay();
  }

  createConfigDisplay(): ConfigDisplay {
    return new ConfigDisplay();
  }

  createFixDisplay(): FixDisplay {
    return new FixDisplay();
  }

  createNewDisplay(): NewDisplay {
    return new NewDisplay();
  }

  createShowDisplay(): ShowDisplay {
    return new ShowDisplay();
  }

  createTemplateDisplay(): TemplateDisplay {
    return new TemplateDisplay();
  }

  createExtendDisplay(): ExtendDisplay {
    return new ExtendDisplay();
  }
}
