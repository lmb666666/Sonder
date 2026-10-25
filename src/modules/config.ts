import type { SonderI18nContribution } from '@sonder/core';
import type { SonderPageModule, ResolvedSonderPageModule } from './types';

export interface SonderPageModuleConfig {
  modules?: SonderPageModule[];
}

export const defaultPageModules: SonderPageModule[] = [];

export function normalizeModuleRoute(route: string): string {
  const trimmed = route.trim();

  if (!trimmed) {
    throw new Error('Sonder page module route cannot be empty.');
  }

  const withoutSlashes = trimmed.replace(/^\/+|\/+$/g, '');

  if (!withoutSlashes) return '/';

  return `/${withoutSlashes}`;
}

export function getConfiguredPageModules(config: SonderPageModuleConfig): SonderPageModule[] {
  return config.modules ?? defaultPageModules;
}

export function getResolvedPageModules(config: SonderPageModuleConfig): ResolvedSonderPageModule[] {
  const modules = getConfiguredPageModules(config);
  const routeOwners = new Map<string, string>();

  return modules.flatMap((module) => {
    if (module.enabled === false) return [];

    const route = normalizeModuleRoute(module.route);
    const existingOwner = routeOwners.get(route);

    if (existingOwner) {
      throw new Error(
        `Duplicate Sonder page module route "${route}" for "${existingOwner}" and "${module.id}".`,
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
  config: SonderPageModuleConfig,
  moduleId: string,
): ResolvedSonderPageModule | undefined {
  return getResolvedPageModules(config).find((module) => module.id === moduleId);
}

export function getPageModuleRoute(config: SonderPageModuleConfig, moduleId: string): string {
  return getResolvedPageModule(config, moduleId)?.route ?? `/${moduleId}`;
}

export function isPageModuleEnabled(config: SonderPageModuleConfig, moduleId: string): boolean {
  return getResolvedPageModule(config, moduleId) !== undefined;
}

export function getResolvedPageModuleScaffolds(config: SonderPageModuleConfig) {
  return getResolvedPageModules(config).flatMap((module) => {
    if (!module.scaffold) return [];

    if (!module.collections.includes(module.scaffold.collection)) {
      throw new Error(
        `Sonder page module "${module.id}" scaffold collection ` +
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

export function getResolvedPageModuleI18n(config: SonderPageModuleConfig) {
  return getResolvedPageModules(config).flatMap((module): SonderI18nContribution[] =>
    module.i18n ? [module.i18n] : [],
  );
}
