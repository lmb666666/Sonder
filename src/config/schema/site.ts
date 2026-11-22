import { z } from 'astro/zod';

import {
  collapseStyleSchema,
  defaultCodeConfig,
  defaultFontConfig,
  defaultMarkdownConfig,
  mathRendererSchema,
  nonEmptyStringSchema,
  paletteSchema,
  siteUrlSchema,
  topNavLinkSchema,
} from './shared';

const siteInfoSchema = z
  .object({
    title: z.string().optional().default('站点信息'),
    program: z.string().optional().default('Sonder'),
    uptime: z.boolean().optional().default(true),
    lastUpdated: z.boolean().optional().default(true),
    totalWords: z.boolean().optional().default(true),
    lastContentUpdate: z.boolean().optional().default(true),
    buildPlatform: z.boolean().optional().default(true),
    imageBed: z
      .object({
        enabled: z.boolean().optional().default(false),
        name: z.string().optional().default(''),
        icon: z.string().optional().default(''),
      })
      .optional()
      .default({ enabled: false, name: '', icon: '' }),
  })
  .optional()
  .default({
    title: '站点信息',
    program: 'Sonder',
    uptime: true,
    lastUpdated: true,
    totalWords: true,
    lastContentUpdate: true,
    buildPlatform: true,
    imageBed: { enabled: false, name: '', icon: '' },
  });

const siteProfileSchema = z.object({
  name: z.string(),
  role: z.string(),
  avatar: z.string(),
});

export const siteSchema = z.object({
  title: z.string(),
  description: z.string(),
  pageTitle: z.string(),
  pageDescription: z.string(),
  url: siteUrlSchema,
  repository: z.url(),
  footerNote: z.string(),
  // 站点建立日期（站点信息卡的运行时长；留空隐藏该行）
  timeEstablished: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      'timeEstablished 必须是可解析的日期字符串。',
    ),
  info: siteInfoSchema,
  profile: siteProfileSchema,
});

export const themeSchema = z
  .object({
    palette: paletteSchema.optional().default('orange-soft'),
    lang: z.string().optional().default('en'),
    // 导航栏样式："bar" 通栏工具条，"pill" 居中胶囊（带头像交接）
    navStyle: z.enum(['bar', 'pill']).optional().default('bar'),
  })
  .optional()
  .default({
    palette: 'orange-soft',
    lang: 'en',
    navStyle: 'bar',
  });

export const fontsSchema = z
  .object({
    en: nonEmptyStringSchema(defaultFontConfig.en),
    code: nonEmptyStringSchema(defaultFontConfig.code),
    zh: nonEmptyStringSchema(defaultFontConfig.zh),
    file: nonEmptyStringSchema(defaultFontConfig.file),
  })
  .optional()
  .default(defaultFontConfig);

export const codeSchema = z
  .object({
    lineNumbers: z.boolean().optional().default(defaultCodeConfig.lineNumbers),
    wrap: z.boolean().optional().default(defaultCodeConfig.wrap),
    preserveIndent: z.boolean().optional().default(defaultCodeConfig.preserveIndent),
    collapseStyle: collapseStyleSchema.optional().default(defaultCodeConfig.collapseStyle),
    languageBadge: z.boolean().optional().default(defaultCodeConfig.languageBadge),
    collapseLines: z.number().int().positive().optional().default(defaultCodeConfig.collapseLines),
    previewLines: z.number().int().positive().optional().default(defaultCodeConfig.previewLines),
  })
  .optional()
  .default(defaultCodeConfig);

export const markdownSchema = z
  .object({
    math: z.boolean().optional().default(defaultMarkdownConfig.math),
    mathRenderer: mathRendererSchema.optional().default(defaultMarkdownConfig.mathRenderer),
    mermaid: z.boolean().optional().default(defaultMarkdownConfig.mermaid),
  })
  .optional()
  .default(defaultMarkdownConfig);

export const appearanceSchema = z.object({
  theme: themeSchema,
  fonts: fontsSchema,
  code: codeSchema,
  markdown: markdownSchema,
});

export const searchSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    placeholder: z.string().optional().default('Search notes...'),
    maxResults: z.number().int().positive().optional().default(6),
  })
  .optional()
  .default({
    enabled: true,
    placeholder: 'Search notes...',
    maxResults: 6,
  });

export const navSchema = z.object({
  links: z.array(topNavLinkSchema),
  search: searchSchema,
});
