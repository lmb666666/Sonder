import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { parse } from 'smol-toml';

import { siteConfigSchema } from './schema';

const rawConfig = parse(
  readFileSync(new URL('../../site.config.toml', import.meta.url), 'utf8'),
) as {
  config: Record<string, unknown>;
};

describe('site config', () => {
  test('site.config.toml 能通过 schema', () => {
    expect(siteConfigSchema.safeParse(rawConfig.config).success).toBe(true);
  });

  test('FCL 启用时 apiUrl 必填', () => {
    const config = structuredClone(rawConfig.config);
    const friendCircle = config.friendCircle as Record<string, unknown>;
    friendCircle.enable = true;
    friendCircle.provider = 'fcl';
    friendCircle.fcl = { apiUrl: '' };

    const result = siteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['friendCircle', 'fcl', 'apiUrl']);
    }
  });

  test('Youlin 启用时 baseUrl 必填', () => {
    const config = structuredClone(rawConfig.config);
    const friendCircle = config.friendCircle as Record<string, unknown>;
    const youlin = config.youlin as Record<string, unknown>;
    friendCircle.enable = true;
    friendCircle.provider = 'youlin';
    youlin.baseUrl = '';

    const result = siteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['friendCircle', 'provider']);
    }
  });

  test('friendCircle 不接受未知键', () => {
    const config = structuredClone(rawConfig.config);
    const friendCircle = config.friendCircle as Record<string, unknown>;
    friendCircle.mode = 'client';

    expect(siteConfigSchema.safeParse(config).success).toBe(false);
  });
});
