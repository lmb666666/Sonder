import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { parse } from 'smol-toml';

import { siteConfigSchema } from './schema';

const rawConfig = parse(
  readFileSync(new URL('../../site.config.toml', import.meta.url), 'utf8'),
) as {
  config: Record<string, unknown>;
};

function integrations(config: Record<string, unknown>) {
  return config.integrations as Record<string, Record<string, unknown>>;
}

describe('site config', () => {
  test('site.config.toml 能通过 schema', () => {
    expect(siteConfigSchema.safeParse(rawConfig.config).success).toBe(true);
  });

  test('FCL 启用时 apiUrl 必填', () => {
    const config = structuredClone(rawConfig.config);
    const friends = integrations(config).friends!;
    friends.enable = true;
    friends.provider = 'fcl';
    friends.fcl = { apiUrl: '' };

    const result = siteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['integrations', 'friends', 'fcl', 'apiUrl']);
    }
  });

  test('Youlin 启用时 baseUrl 必填', () => {
    const config = structuredClone(rawConfig.config);
    const all = integrations(config);
    const friends = all.friends!;
    const youlin = all.youlin!;
    friends.enable = true;
    friends.provider = 'youlin';
    youlin.baseUrl = '';

    const result = siteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['integrations', 'friends', 'provider']);
    }
  });

  test('Ech0 启用时 apiUrl 必填', () => {
    const config = structuredClone(rawConfig.config);
    const moments = integrations(config).moments!;
    moments.provider = 'ech0';
    moments.ech0 = { apiUrl: '' };

    const result = siteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['integrations', 'moments', 'ech0', 'apiUrl']);
    }
  });

  test('friends 不接受未知键', () => {
    const config = structuredClone(rawConfig.config);
    integrations(config).friends!.mode = 'client';

    expect(siteConfigSchema.safeParse(config).success).toBe(false);
  });
});
