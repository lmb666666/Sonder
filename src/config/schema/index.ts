import { z } from 'astro/zod';

import { integrationsSchema } from './integrations';
import { articleSchema, homeSchema, pagesSchema } from './pages';
import { appearanceSchema, navSchema, siteSchema } from './site';

/**
 * 站点配置的唯一 schema。
 * 构建期由 astro.config.mjs 直接校验 site.config.toml（快速失败），
 * 运行时由 content collection 用同一份 schema 再校验一次。
 */
export const siteConfigSchema = z
  .strictObject({
    site: siteSchema,
    nav: navSchema,
    appearance: appearanceSchema,
    pages: pagesSchema,
    article: articleSchema,
    home: homeSchema,
    integrations: integrationsSchema,
  })
  .superRefine((config, ctx) => {
    const circle = config.integrations.friends;
    if (circle.enable) {
      if (circle.provider === 'fcl' && !circle.fcl.apiUrl) {
        ctx.addIssue({
          code: 'custom',
          path: ['integrations', 'friends', 'fcl', 'apiUrl'],
          message:
            'integrations.friends.provider = "fcl" 时必须填写 integrations.friends.fcl.apiUrl',
        });
      }

      const youlinBase =
        config.integrations.youlin.baseUrl ||
        (typeof process !== 'undefined' ? process.env.SONDER_YOULIN_BASE_URL?.trim() : '') ||
        '';
      if (circle.provider === 'youlin' && !youlinBase) {
        ctx.addIssue({
          code: 'custom',
          path: ['integrations', 'friends', 'provider'],
          message:
            'integrations.friends.provider = "youlin" 时必须填写 integrations.youlin.baseUrl',
        });
      }
    }

    const moments = config.integrations.moments;
    if (moments.provider === 'ech0' && !moments.ech0.apiUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['integrations', 'moments', 'ech0', 'apiUrl'],
        message:
          'integrations.moments.provider = "ech0" 时必须填写 integrations.moments.ech0.apiUrl',
      });
    }
  });

export type SiteConfig = z.infer<typeof siteConfigSchema>;
