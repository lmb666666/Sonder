import type { NavfolioPagesPlugin } from './types';

export interface PagesOptions {
  enabled?: boolean;
}

export function pages(options: PagesOptions = {}): NavfolioPagesPlugin {
  return {
    name: '@navfolio/pages',
    enabled: options.enabled,
  };
}
