import { z } from 'astro/zod';

import {
  commentProviderSchema,
  youlinApplyProviderSchema,
  youlinDirectiveSourceSchema,
  youlinLinkSourceSchema,
  youlinModeSchema,
} from './shared';

const defaultGiscusConfig = {
  repo: '',
  repo_id: '',
  category: '',
  category_id: '',
  mapping: 'pathname',
  strict: '0',
  reactions_enabled: '1',
  emit_metadata: '0',
  input_position: 'bottom',
  light_theme: 'light',
  dark_theme: 'dark',
  lang: 'zh-CN',
  loading: 'lazy',
};

const defaultUtterancesConfig = {
  repo: '',
  issue_term: 'pathname',
  label: 'comment',
  theme: 'github-light',
};

const defaultWalineConfig = {
  server_url: '',
  lang: 'zh-CN',
  dark: 'html.dark',
  comment: true,
};

const defaultTwikooConfig = {
  env_id: '',
  script_src: '',
  lang: 'zh-CN',
};

const defaultCommentsConfig = {
  enable: false,
  provider: 'none',
  show_on_posts: true,
  giscus: defaultGiscusConfig,
  utterances: defaultUtterancesConfig,
  waline: defaultWalineConfig,
  twikoo: defaultTwikooConfig,
} satisfies {
  enable: boolean;
  provider: z.infer<typeof commentProviderSchema>;
  show_on_posts: boolean;
  giscus: typeof defaultGiscusConfig;
  utterances: typeof defaultUtterancesConfig;
  waline: typeof defaultWalineConfig;
  twikoo: typeof defaultTwikooConfig;
};

const commentsSchema = z
  .strictObject({
    enable: z.boolean().optional().default(false),
    provider: commentProviderSchema.optional().default('none'),
    show_on_posts: z.boolean().optional().default(true),
    giscus: z
      .strictObject({
        repo: z.string().optional().default(''),
        repo_id: z.string().optional().default(''),
        category: z.string().optional().default(''),
        category_id: z.string().optional().default(''),
        mapping: z.string().optional().default('pathname'),
        strict: z.string().optional().default('0'),
        reactions_enabled: z.string().optional().default('1'),
        emit_metadata: z.string().optional().default('0'),
        input_position: z.string().optional().default('bottom'),
        light_theme: z.string().optional().default('light'),
        dark_theme: z.string().optional().default('dark'),
        lang: z.string().optional().default('zh-CN'),
        loading: z.string().optional().default('lazy'),
      })
      .optional()
      .default(defaultGiscusConfig),
    utterances: z
      .strictObject({
        repo: z.string().optional().default(''),
        issue_term: z.string().optional().default('pathname'),
        label: z.string().optional().default('comment'),
        theme: z.string().optional().default('github-light'),
      })
      .optional()
      .default(defaultUtterancesConfig),
    waline: z
      .strictObject({
        server_url: z.string().optional().default(''),
        lang: z.string().optional().default('zh-CN'),
        dark: z.string().optional().default('html.dark'),
        comment: z.boolean().optional().default(true),
      })
      .optional()
      .default(defaultWalineConfig),
    twikoo: z
      .strictObject({
        env_id: z.string().optional().default(''),
        script_src: z.string().optional().default(''),
        lang: z.string().optional().default('zh-CN'),
      })
      .optional()
      .default(defaultTwikooConfig),
  })
  .optional()
  .default(defaultCommentsConfig);

const defaultAnalyticsConfig = {
  sendInDev: false,
  umami: {
    websiteId: '',
    scriptUrl: '',
    hostUrl: '',
  },
  la51: {
    id: '',
    lingqueMonitorId: '',
  },
};

const analyticsSchema = z
  .strictObject({
    sendInDev: z.boolean().optional().default(false),
    umami: z
      .strictObject({
        websiteId: z.string().trim().max(128).optional().default(''),
        scriptUrl: z.string().trim().max(2048).optional().default(''),
        hostUrl: z.string().trim().max(2048).optional().default(''),
      })
      .optional()
      .default(defaultAnalyticsConfig.umami),
    la51: z
      .strictObject({
        id: z.string().trim().max(64).optional().default(''),
        lingqueMonitorId: z.string().trim().max(64).optional().default(''),
      })
      .optional()
      .default(defaultAnalyticsConfig.la51),
  })
  .optional()
  .default(defaultAnalyticsConfig);

const musicSchema = z
  .strictObject({
    // ::music 指令与动态页音乐卡共用
    meting_api: z.string().optional().default(''),
  })
  .optional()
  .default({ meting_api: '' });

const momentsSchema = z
  .strictObject({
    // local：src/data/moments.yml；ech0：浏览器请求 all.json
    provider: z.enum(['local', 'ech0']).optional().default('local'),
    pageSize: z.number().int().positive().optional().default(20),
    showPoweredBy: z.boolean().optional().default(true),
    ech0: z
      .strictObject({
        apiUrl: z.string().trim().optional().default(''),
      })
      .optional()
      .default({ apiUrl: '' }),
  })
  .optional()
  .default({ provider: 'local', pageSize: 20, showPoweredBy: true, ech0: { apiUrl: '' } });

const friendsSchema = z
  .strictObject({
    enable: z.boolean().optional().default(false),
    provider: z.enum(['fcl', 'youlin', 'none']).optional().default('none'),
    pageSize: z.number().int().positive().optional().default(20),
    fcl: z
      .strictObject({
        apiUrl: z.string().trim().optional().default(''),
      })
      .optional()
      .default({ apiUrl: '' }),
  })
  .optional()
  .default({ enable: false, provider: 'none', pageSize: 20, fcl: { apiUrl: '' } });

const youlinBaseUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .default('')
  .refine((value) => {
    if (!value) return true;
    if (/[?#]/.test(value)) return false;
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.username === '' &&
        url.password === '' &&
        url.search === '' &&
        url.hash === ''
      );
    } catch {
      return false;
    }
  }, '[config.integrations.youlin].baseUrl 必须是 http(s) URL，且不能包含账号密码、查询参数或 hash。');

const youlinSchema = z
  .strictObject({
    baseUrl: youlinBaseUrlSchema,
    timeoutMs: z.number().int().min(500).max(30_000).optional().default(8000),
    // 仅影响 /links 页的友链取数；朋友圈始终客户端请求
    mode: youlinModeSchema.optional().default('build'),
    links: z
      .strictObject({
        mode: youlinModeSchema.optional(),
        sources: z.array(youlinLinkSourceSchema).optional().default(['youlin', 'local']),
        group: z.string().trim().max(100).optional().default(''),
      })
      .optional()
      .default({ sources: ['youlin', 'local'], group: '' }),
    circle: z
      .strictObject({
        limit: z.number().int().min(0).max(5000).optional().default(0),
      })
      .optional()
      .default({ limit: 0 }),
    apply: z
      .strictObject({
        provider: youlinApplyProviderSchema.optional().default('auto'),
        turnstileSiteKey: z.string().trim().max(200).optional().default(''),
        timeoutMs: z.number().int().min(5_000).max(120_000).optional().default(45_000),
      })
      .optional()
      .default({ provider: 'auto', turnstileSiteKey: '', timeoutMs: 45_000 }),
    directives: z
      .strictObject({
        friendCircle: youlinDirectiveSourceSchema.optional().default('auto'),
        friendLinkCard: youlinDirectiveSourceSchema.optional().default('auto'),
      })
      .optional()
      .default({ friendCircle: 'auto', friendLinkCard: 'auto' }),
  })
  .optional()
  .default({
    baseUrl: '',
    timeoutMs: 8000,
    mode: 'build',
    links: { sources: ['youlin', 'local'], group: '' },
    circle: { limit: 0 },
    apply: { provider: 'auto', turnstileSiteKey: '', timeoutMs: 45_000 },
    directives: { friendCircle: 'auto', friendLinkCard: 'auto' },
  });

export const integrationsSchema = z.strictObject({
  comments: commentsSchema,
  analytics: analyticsSchema,
  music: musicSchema,
  moments: momentsSchema,
  friends: friendsSchema,
  youlin: youlinSchema,
});
