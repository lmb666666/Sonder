export interface VibeModuleOptions {
  enabled?: boolean;
  route?: string;
}

export function vibeModule(options: VibeModuleOptions = {}) {
  const route = options.route ?? '/vibe';

  return {
    id: 'vibe',
    enabled: options.enabled,
    route,
    nav: {
      label: 'Vibe',
      href: route,
    },
    collections: ['vibe'],
    i18n: vibeI18n,
    routes: [
      {
        entrypoint: new URL('./routes/vibe.astro', import.meta.url),
        prerender: true,
      },
    ],
    scaffold: {
      command: 'vibe',
      collection: 'vibe',
      directory: 'src/content/vibe',
      defaultExtension: 'md' as const,
      template: new URL('./templates/default.md', import.meta.url),
    },
  };
}
import { vibeI18n } from './i18n.js';
