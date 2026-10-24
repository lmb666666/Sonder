import { projectsModule } from './projects/index.js';
import type { NavfolioI18nContribution } from '@navfolio/core';
import type { NavfolioPageModule, ResolvedNavfolioPageModule } from './types';

export interface NavfolioPageModuleConfig {
  modules?: NavfolioPageModule[];
}

export const defaultPageModules = [projectsModule()] satisfies NavfolioPageModule[];

export function normalizeModuleRoute(route: string): string {
  const trimmed = route.trim();

  if (!trimmed) {
    throw new Error('Navfolio page module route cannot be empty.');
  }

  const withoutSlashes = trimmed.replace(/^\/+|\/+$/g, '');

  if (!withoutSlashes) return '/';

  return `/${withoutSlashes}`;
}

export function getConfiguredPageModules(config: NavfolioPageModuleConfig): NavfolioPageModule[] {
  return config.modules ?? defaultPageModules;
}

export function getResolvedPageModules(
  config: NavfolioPageModuleConfig,
): ResolvedNavfolioPageModule[] {
  const modules = getConfiguredPageModules(config);
  const routeOwners = new Map<string, string>();

  return modules.flatMap((module) => {
    if (module.enabled === false) return [];

    const route = normalizeModuleRoute(module.route);
    const existingOwner = routeOwners.get(route);

    if (existingOwner) {
      throw new Error(
        `Duplicate Navfolio page module route "${route}" for "${existingOwner}" and "${module.id}".`,
      );
    }

    routeOwners.set(route, module.id);

    return [
      {
        ...module,
        enabled: true,
        route,
        nav: {
          ...module.nav,
          href: route,
        },
      },
    ];
  });
}

export function getResolvedPageModule(
  config: NavfolioPageModuleConfig,
  moduleId: string,
): ResolvedNavfolioPageModule | undefined {
  return getResolvedPageModules(config).find((module) => module.id === moduleId);
}

export function getPageModuleRoute(config: NavfolioPageModuleConfig, moduleId: string): string {
  return getResolvedPageModule(config, moduleId)?.route ?? `/${moduleId}`;
}

export function isPageModuleEnabled(config: NavfolioPageModuleConfig, moduleId: string): boolean {
  return getResolvedPageModule(config, moduleId) !== undefined;
}

export function getResolvedPageModuleScaffolds(config: NavfolioPageModuleConfig) {
  return getResolvedPageModules(config).flatMap((module) => {
    if (!module.scaffold) return [];

    if (!module.collections.includes(module.scaffold.collection)) {
      throw new Error(
        `Navfolio page module "${module.id}" scaffold collection ` +
          `"${module.scaffold.collection}" must be declared in module.collections.`,
      );
    }

    return [
      {
        moduleId: module.id,
        ...module.scaffold,
        collection: module.scaffold.collection,
        defaultExtension: module.scaffold.defaultExtension ?? 'md',
      },
    ];
  });
}

export function getResolvedPageModuleI18n(config: NavfolioPageModuleConfig) {
  return getResolvedPageModules(config).flatMap((module): NavfolioI18nContribution[] =>
    module.i18n ? [module.i18n] : [],
  );
}
