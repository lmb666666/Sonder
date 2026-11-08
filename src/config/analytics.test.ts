import { describe, expect, test } from 'bun:test';

import type { SiteConfig } from './schema';
import { normalizeHostUrl, normalizeScriptUrl, resolveAnalyticsConfig } from './analytics';

const rawConfig: SiteConfig['analytics'] = {
  sendInDev: false,
  umami: { websiteId: '', scriptUrl: '', hostUrl: '' },
  la51: { id: '', lingqueMonitorId: '' },
};

function captureWarnings(fn: () => void) {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    fn();
  } finally {
    console.warn = original;
  }

  return warnings;
}

describe('normalizeScriptUrl', () => {
  test('允许绝对地址、协议相对地址、站内路径与 query', () => {
    expect(normalizeScriptUrl('https://umami.example.com/script.js')).toBe(
      'https://umami.example.com/script.js',
    );
    expect(normalizeScriptUrl('http://127.0.0.1:3000/script.js?v=1')).toBe(
      'http://127.0.0.1:3000/script.js?v=1',
    );
    expect(normalizeScriptUrl('//cdn.example.com/umami.js')).toBe('//cdn.example.com/umami.js');
    expect(normalizeScriptUrl('/stats/script.js')).toBe('/stats/script.js');
  });

  test('拒绝非 http(s)、凭据、hash、空白与 HTML 特殊字符', () => {
    expect(normalizeScriptUrl('')).toBe('');
    expect(normalizeScriptUrl('javascript:alert(1)')).toBe('');
    expect(normalizeScriptUrl('ftp://example.com/script.js')).toBe('');
    expect(normalizeScriptUrl('https://user:pass@example.com/script.js')).toBe('');
    expect(normalizeScriptUrl('//user:pass@example.com/script.js')).toBe('');
    expect(normalizeScriptUrl('https://example.com/script.js#top')).toBe('');
    expect(normalizeScriptUrl('https://example.com/a b.js')).toBe('');
    expect(normalizeScriptUrl('https://example.com/</script><script>')).toBe('');
  });
});

describe('normalizeHostUrl', () => {
  test('规范化 http(s) 与协议相对地址', () => {
    expect(normalizeHostUrl('https://umami.example.com/')).toBe('https://umami.example.com');
    expect(normalizeHostUrl('https://umami.example.com/umami/')).toBe(
      'https://umami.example.com/umami',
    );
    expect(normalizeHostUrl('//umami.example.com')).toBe('//umami.example.com');
  });

  test('拒绝相对路径、query、hash 与凭据', () => {
    expect(normalizeHostUrl('')).toBe('');
    expect(normalizeHostUrl('/umami')).toBe('');
    expect(normalizeHostUrl('https://umami.example.com/?a=1')).toBe('');
    expect(normalizeHostUrl('https://umami.example.com/#top')).toBe('');
    expect(normalizeHostUrl('https://user:pass@umami.example.com')).toBe('');
  });
});

describe('resolveAnalyticsConfig', () => {
  test('留空时关闭所有提供商', () => {
    const resolved = resolveAnalyticsConfig(rawConfig);
    expect(resolved.umami).toBe(null);
    expect(resolved.la51).toBe(null);
    expect(resolved.sendInDev).toBe(false);
  });

  test('解析 Umami 并保留 hostUrl', () => {
    const resolved = resolveAnalyticsConfig({
      ...rawConfig,
      umami: {
        websiteId: '94db1cb1-74f4-4a40-ad6c-962362670409',
        scriptUrl: 'https://cdn.example.com/umami.js',
        hostUrl: 'https://umami.example.com/',
      },
    });

    expect(resolved.umami).toEqual({
      websiteId: '94db1cb1-74f4-4a40-ad6c-962362670409',
      scriptUrl: 'https://cdn.example.com/umami.js',
      hostUrl: 'https://umami.example.com',
    });
  });

  test('Umami 缺少 ID 或脚本地址时关闭并警告', () => {
    const warnings = captureWarnings(() => {
      const noScript = resolveAnalyticsConfig({
        ...rawConfig,
        umami: { ...rawConfig.umami, websiteId: 'website-id' },
      });
      const noId = resolveAnalyticsConfig({
        ...rawConfig,
        umami: { ...rawConfig.umami, scriptUrl: 'https://umami.example.com/script.js' },
      });

      expect(noScript.umami).toBe(null);
      expect(noId.umami).toBe(null);
    });

    expect(warnings.some((warning) => warning.includes('umami.scriptUrl'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('umami.websiteId'))).toBe(true);
  });

  test('Umami hostUrl 无效时忽略并回退脚本所在域', () => {
    const warnings = captureWarnings(() => {
      const resolved = resolveAnalyticsConfig({
        ...rawConfig,
        umami: {
          websiteId: 'website-id',
          scriptUrl: 'https://umami.example.com/script.js',
          hostUrl: '/umami',
        },
      });

      expect(resolved.umami?.hostUrl).toBe('');
    });

    expect(warnings.some((warning) => warning.includes('umami.hostUrl'))).toBe(true);
  });

  test('远程 http 地址提示混合内容风险，本地 http 不提示', () => {
    const warnings = captureWarnings(() => {
      const resolved = resolveAnalyticsConfig({
        ...rawConfig,
        umami: {
          websiteId: 'website-id',
          scriptUrl: 'http://umami.example.com/script.js',
          hostUrl: 'http://umami.example.com',
        },
      });

      expect(resolved.umami).not.toBe(null);
    });

    expect(warnings.filter((warning) => warning.includes('http'))).toHaveLength(2);

    const localWarnings = captureWarnings(() => {
      const resolved = resolveAnalyticsConfig({
        ...rawConfig,
        umami: {
          websiteId: 'website-id',
          scriptUrl: 'http://127.0.0.1:3000/script.js',
          hostUrl: 'http://localhost:3000',
        },
      });

      expect(resolved.umami).not.toBe(null);
    });

    expect(localWarnings.some((warning) => warning.includes('http'))).toBe(false);
  });

  test('解析 51la 与灵雀', () => {
    const resolved = resolveAnalyticsConfig({
      ...rawConfig,
      la51: { id: 'la-id', lingqueMonitorId: 'lingque-id' },
    });

    expect(resolved.la51).toEqual({ id: 'la-id', lingqueMonitorId: 'lingque-id' });
  });

  test('灵雀 ID 无效时只保留 51la', () => {
    const warnings = captureWarnings(() => {
      const resolved = resolveAnalyticsConfig({
        ...rawConfig,
        la51: { id: 'la-id', lingqueMonitorId: 'bad id' },
      });

      expect(resolved.la51).toEqual({ id: 'la-id', lingqueMonitorId: '' });
    });

    expect(warnings.some((warning) => warning.includes('la51.lingqueMonitorId'))).toBe(true);
  });

  test('51la ID 无效时关闭统计和灵雀', () => {
    const warnings = captureWarnings(() => {
      const resolved = resolveAnalyticsConfig({
        ...rawConfig,
        la51: { id: 'bad id', lingqueMonitorId: 'lingque-id' },
      });

      expect(resolved.la51).toBe(null);
    });

    expect(warnings.some((warning) => warning.includes('la51.id'))).toBe(true);
  });

  test('保留 sendInDev', () => {
    const resolved = resolveAnalyticsConfig({ ...rawConfig, sendInDev: true });
    expect(resolved.sendInDev).toBe(true);
  });
});
