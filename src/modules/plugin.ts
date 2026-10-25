import type { SonderPagesPlugin } from './types';

export interface PagesOptions {
  enabled?: boolean;
}

export function pages(options: PagesOptions = {}): SonderPagesPlugin {
  return {
    name: '@sonder/pages',
    enabled: options.enabled,
  };
}
