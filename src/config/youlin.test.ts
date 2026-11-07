import { describe, expect, test } from 'bun:test';

import type { SiteConfig } from './schema';
import {
  normalizeBaseUrl,
  resolveApplyProvider,
  resolveYoulinConfig,
  shouldFetchYoulinFirst,
  youlinApplyUrl,
  youlinCircleUrl,
  youlinLinksUrl,
} from './youlin';

const rawConfig: SiteConfig['youlin'] = {
  baseUrl: 'https://youlin.example.com/',
  timeoutMs: 8000,
  mode: 'build',
  links: { sources: ['youlin', 'local'], group: '' },
  circle: { sources: ['youlin', 'friendcircle', 'public', 'rss', 'demo'], limit: 0 },
  apply: { provider: 'auto', turnstileSiteKey: '' },
  directives: { friendCircle: 'auto', friendLinkCard: 'auto' },
};

function withEnv<T>(values: Record<string, string | undefined>, fn: () => T): T {
  const saved = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('normalizeBaseUrl', () => {
  test('去掉尾部斜杠并保留路径前缀', () => {
    expect(normalizeBaseUrl('https://youlin.example.com/')).toBe('https://youlin.example.com');
    expect(normalizeBaseUrl('https://example.com/youlin/')).toBe('https://example.com/youlin');
    expect(normalizeBaseUrl('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787');
  });

  test('拒绝非 http(s)、账号密码、query 与 hash', () => {
    expect(normalizeBaseUrl('')).toBe('');
    expect(normalizeBaseUrl('ftp://example.com')).toBe('');
    expect(normalizeBaseUrl('https://user:pass@example.com')).toBe('');
    expect(normalizeBaseUrl('https://example.com/?a=1')).toBe('');
    expect(normalizeBaseUrl('https://example.com/#top')).toBe('');
    expect(normalizeBaseUrl('https://example.com/path?')).toBe('');
    expect(normalizeBaseUrl('https://example.com/path#')).toBe('');
  });
});

describe('resolveYoulinConfig', () => {
  test('未设置环境变量时使用 TOML，并按全局 mode 解析', () => {
    withEnv({ SONDER_YOULIN_BASE_URL: undefined, SONDER_YOULIN_MODE: undefined }, () => {
      const resolved = resolveYoulinConfig(rawConfig);
      expect(resolved.baseUrl).toBe('https://youlin.example.com');
      expect(resolved.links.mode).toBe('build');
      expect(resolved.circle.mode).toBe('build');
    });
  });

  test('环境变量覆盖 baseUrl 与 mode', () => {
    withEnv(
      {
        SONDER_YOULIN_BASE_URL: 'http://127.0.0.1:8799/',
        SONDER_YOULIN_MODE: 'client',
      },
      () => {
        const resolved = resolveYoulinConfig(rawConfig);
        expect(resolved.baseUrl).toBe('http://127.0.0.1:8799');
        expect(resolved.links.mode).toBe('client');
        expect(resolved.circle.mode).toBe('client');
      },
    );
  });

  test('各功能可以单独覆盖 mode', () => {
    withEnv({ SONDER_YOULIN_BASE_URL: undefined, SONDER_YOULIN_MODE: undefined }, () => {
      const resolved = resolveYoulinConfig({
        ...rawConfig,
        mode: 'client',
        links: { ...rawConfig.links, mode: 'build' },
      });
      expect(resolved.links.mode).toBe('build');
      expect(resolved.circle.mode).toBe('client');
    });
  });

  test('环境变量 mode 是覆盖层，连 per-feature mode 一起覆盖', () => {
    withEnv({ SONDER_YOULIN_BASE_URL: undefined, SONDER_YOULIN_MODE: 'client' }, () => {
      const resolved = resolveYoulinConfig({
        ...rawConfig,
        mode: 'build',
        links: { ...rawConfig.links, mode: 'build' },
        circle: { ...rawConfig.circle, mode: 'build' },
      });
      expect(resolved.links.mode).toBe('client');
      expect(resolved.circle.mode).toBe('client');
    });
  });
});

describe('resolveApplyProvider', () => {
  test('auto 优先 Youlin，其次 GitHub，最后关闭', () => {
    expect(resolveApplyProvider('auto', 'https://youlin.example.com', '')).toBe('youlin');
    expect(resolveApplyProvider('auto', '', 'https://github.com/owner/repo')).toBe('github');
    expect(resolveApplyProvider('auto', '', 'https://gitlab.com/owner/repo')).toBe('none');
  });

  test('强制 provider 时缺依赖就关闭', () => {
    expect(resolveApplyProvider('youlin', '', 'https://github.com/owner/repo')).toBe('none');
    expect(resolveApplyProvider('github', 'https://youlin.example.com', '')).toBe('none');
    expect(resolveApplyProvider('none', 'https://youlin.example.com', '')).toBe('none');
  });
});

describe('shouldFetchYoulinFirst', () => {
  test('只有 client + youlin 首位 + baseUrl 才刷新', () => {
    expect(
      shouldFetchYoulinFirst('client', ['youlin', 'local'], 'https://youlin.example.com'),
    ).toBe(true);
    expect(shouldFetchYoulinFirst('build', ['youlin', 'local'], 'https://youlin.example.com')).toBe(
      false,
    );
    expect(
      shouldFetchYoulinFirst('client', ['local', 'youlin'], 'https://youlin.example.com'),
    ).toBe(false);
    expect(shouldFetchYoulinFirst('client', ['youlin'], '')).toBe(false);
  });
});

describe('URL helpers', () => {
  test('拼接 API 地址并编码分组', () => {
    expect(youlinLinksUrl('https://example.com/youlin', '技术 区')).toBe(
      'https://example.com/youlin/api/links?group=%E6%8A%80%E6%9C%AF%20%E5%8C%BA',
    );
    expect(youlinLinksUrl('https://example.com/youlin')).toBe(
      'https://example.com/youlin/api/links',
    );
    expect(youlinCircleUrl('https://example.com/youlin', 20)).toBe(
      'https://example.com/youlin/api/circle?limit=20',
    );
    expect(youlinCircleUrl('https://example.com/youlin', 0)).toBe(
      'https://example.com/youlin/api/circle',
    );
    expect(youlinApplyUrl('https://example.com/youlin')).toBe('https://example.com/youlin/apply');
  });
});
