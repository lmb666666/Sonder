export type I18nValue = string | { one?: string; other: string };
export type I18nMessages = { [key: string]: I18nValue | I18nMessages };
export type I18nCatalogs = Record<string, I18nMessages>;

export interface NavfolioI18nContribution {
  namespace?: string;
  messages: I18nCatalogs;
}

export interface I18nOptions {
  locale?: string;
  catalogs?: I18nCatalogs[];
  overrides?: I18nMessages;
}

export interface I18n {
  locale: string;
  t(key: string, values?: Record<string, string | number>): string;
  messages: I18nMessages;
}

/**
 * Stable UI surfaces a Navfolio theme can provide. Feature plugins consume
 * these names instead of importing a concrete theme's source files.
 */
export type NavfolioThemeComponent =
  | 'baseHead'
  | 'footer'
  | 'layout'
  | 'blogArticle'
  | 'blogArchive'
  | 'siteSearch'
  | 'tableOfContents';

/**
 * A serializable theme description. Component and stylesheet values are
 * package specifiers so the core never needs to import a theme's UI directly.
 */
export interface NavfolioTheme {
  name: string;
  components: Partial<Record<NavfolioThemeComponent, string>>;
  styles?: readonly string[];
  slots?: readonly string[];
}

/**
 * Marks a theme manifest as a Navfolio theme while preserving its exact type.
 */
export function defineTheme<const Theme extends NavfolioTheme>(theme: Theme): Theme {
  return theme;
}

/**
 * Resolves an optional theme component without coupling callers to a package.
 */
export function getThemeComponent(
  theme: NavfolioTheme,
  component: NavfolioThemeComponent,
): string | undefined {
  return theme.components[component];
}

const localeAliases: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  en_us: 'en',
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-my': 'zh-CN',
  'zh-hans': 'zh-CN',
  zh_cn: 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
  zh_tw: 'zh-TW',
};

export function normalizeLocale(value?: string, fallback = 'en') {
  const normalized = value?.trim().toLowerCase();
  return normalized ? (localeAliases[normalized] ?? fallback) : fallback;
}

export function defineI18nContribution(contribution: NavfolioI18nContribution) {
  return contribution;
}

export function mergeI18nMessages(...messages: Array<I18nMessages | undefined>) {
  return messages.reduce<I18nMessages>((merged, source) => merge(merged, source ?? {}), {});
}

export function createI18n({ locale, catalogs = [], overrides }: I18nOptions = {}): I18n {
  const resolvedLocale = normalizeLocale(locale);
  const selected = catalogs.map((catalog) => catalog[resolvedLocale] ?? catalog.en ?? {});
  const messages = mergeI18nMessages(...selected, overrides);

  return {
    locale: resolvedLocale,
    messages,
    t(key, values = {}) {
      const value = key
        .split('.')
        .reduce<unknown>(
          (current, segment) =>
            current && typeof current === 'object'
              ? (current as Record<string, unknown>)[segment]
              : undefined,
          messages,
        );
      const template =
        typeof value === 'string'
          ? value
          : value && typeof value === 'object'
            ? Number(values.count) === 1 && typeof (value as { one?: unknown }).one === 'string'
              ? (value as { one: string }).one
              : (value as { other?: string }).other
            : undefined;
      return (template ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values[name] ?? ''),
      );
    },
  };
}

function merge(base: I18nMessages, extension: I18nMessages): I18nMessages {
  const result: I18nMessages = { ...base };
  for (const [key, value] of Object.entries(extension)) {
    const existing = result[key];
    result[key] = isMessages(existing) && isMessages(value) ? merge(existing, value) : value;
  }
  return result;
}

function isMessages(value: unknown): value is I18nMessages {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !('other' in (value as object))
  );
}
