/** 站点内链与资源 URL 的唯一入口：所有站内路径都必须经过这里，保证子路径部署可用。 */

const basePath = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');

export function withBase(path: string): string {
  if (!path) return `${basePath}/` || '/';
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path;
  if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

export function absoluteUrl(path: string, origin: URL | string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;

  return new URL(withBase(path), origin).href;
}
