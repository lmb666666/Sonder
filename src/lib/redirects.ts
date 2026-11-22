function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

function isSitePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !/[?#]/.test(value);
}

function normalizeRoute(value: string): string {
  return value.replace(/\/+$/, '') || '/';
}

/**
 * redirects.json 只描述「旧站内路径 → 新站内路径 / 外部 URL」。
 * 纯静态构建下由 Astro 生成 meta refresh 页面，状态码交给托管平台处理。
 */
export function validateRedirects(
  value: unknown,
  postPaths: ReadonlySet<string> = new Set(),
): string[] {
  if (!isRecord(value)) return ['redirects.json 顶层必须是对象'];

  const failures: string[] = [];
  const normalizedPostPaths = new Set([...postPaths].map((path) => path.toLowerCase()));

  for (const [source, destination] of Object.entries(value)) {
    if (source !== source.trim()) {
      failures.push(`redirects.json source 不能包含首尾空白: ${JSON.stringify(source)}`);
    }

    if (!source.startsWith('/') || source.startsWith('//') || /[?#]/.test(source)) {
      failures.push(`redirects.json source 非法: ${source}`);
    } else if (source !== '/' && source.endsWith('/')) {
      failures.push(`redirects.json source 不能以 / 结尾: ${source}`);
    }

    if (normalizedPostPaths.has(source.toLowerCase())) {
      failures.push(`redirects.json source 与现有文章路径冲突: ${source}`);
    }

    if (typeof destination !== 'string' || destination.trim() === '') {
      failures.push(`redirects.json target 必须是非空字符串: ${source}`);
      continue;
    }

    const target = destination.trim();
    if (target !== destination) {
      failures.push(`redirects.json target 不能包含首尾空白: ${JSON.stringify(destination)}`);
    }

    if (!isSitePath(target) && !isHttpUrl(target)) {
      failures.push(`redirects.json target 非法: ${source} -> ${target}`);
      continue;
    }

    if (isSitePath(target) && normalizeRoute(source) === normalizeRoute(target)) {
      failures.push(`redirects.json 禁止 self redirect: ${source} -> ${target}`);
    }
  }

  return failures;
}

export function getRedirectSources(value: unknown): Set<string> {
  if (!isRecord(value)) return new Set();
  return new Set(Object.keys(value).map(normalizeRoute));
}
