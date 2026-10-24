export interface MediaModuleOptions {
  enabled?: boolean;
  route?: string;
  label?: string;
}

export function mediaModule(options: MediaModuleOptions = {}) {
  const route = options.route ?? '/media';

  return {
    id: 'media',
    enabled: options.enabled,
    route,
    nav: {
      label: options.label ?? 'Media',
      href: route,
    },
    collections: ['media'],
    i18n: mediaI18n,
    routes: [
      {
        entrypoint: new URL('./routes/media.astro', import.meta.url),
        prerender: true,
      },
      {
        pattern: (moduleRoute: string) => `${moduleRoute}/[...slug]`,
        entrypoint: new URL('./routes/media-review.astro', import.meta.url),
        prerender: true,
      },
    ],
    scaffold: {
      command: 'media',
      collection: 'media',
      directory: 'src/content/media',
      defaultExtension: 'md' as const,
      template: new URL('./templates/default.md', import.meta.url),
    },
  };
}

import { mediaI18n } from './i18n.js';
