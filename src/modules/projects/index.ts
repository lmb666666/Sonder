export interface ProjectsModuleOptions {
  enabled?: boolean;
  route?: string;
}

export function projectsModule(options: ProjectsModuleOptions = {}) {
  const route = options.route ?? '/projects';

  return {
    id: 'projects',
    enabled: options.enabled,
    route,
    nav: {
      label: 'Projects',
      href: route,
    },
    collections: ['projects'],
    i18n: projectsI18n,
    scaffold: {
      command: 'project',
      collection: 'projects',
      directory: 'src/content/projects',
      defaultExtension: 'mdx' as const,
      template: new URL('./templates/default.md', import.meta.url),
    },
  };
}
import { projectsI18n } from './i18n.js';
