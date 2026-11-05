import { z } from 'astro/zod';

/**
 * 站点配置的唯一 schema。
 * 构建期由 astro.config.mjs 直接校验 site.config.toml（快速失败），
 * 运行时由 content collection 用同一份 schema 再校验一次。
 */

const siteUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}, z.url());

const commentProviderSchema = z.enum(['giscus', 'utterances', 'waline', 'twikoo', 'none']);
const mathRendererSchema = z.enum(['katex', 'mathjax']);
const paletteSchema = z.enum([
  'green-soft',
  'green-vivid',
  'rose-soft',
  'pink-soft',
  'purple-soft',
  'blue-soft',
  'orange-soft',
  'brown-soft',
]);

const collapseStyleSchema = z.enum([
  'github',
  'collapsible-start',
  'collapsible-end',
  'collapsible-auto',
]);
const blogCoverImageStyleSchema = z.enum(['card', 'mask']);

const defaultCodeConfig = {
  lineNumbers: true,
  wrap: false,
  preserveIndent: true,
  collapseStyle: 'github',
  languageBadge: true,
  collapseLines: 15,
  previewLines: 8,
} as const;

const defaultMarkdownConfig = {
  math: true,
  mathRenderer: 'katex',
  mermaid: true,
} satisfies {
  math: boolean;
  mathRenderer: z.infer<typeof mathRendererSchema>;
  mermaid: boolean;
};

const defaultFontConfig = {
  en: 'Maple Mono',
  code: 'Monaco',
  zh: 'ChillRoundF',
  file: 'assets/fonts/ChillRoundFRegular.woff2',
};

const nonEmptyStringSchema = (fallback: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional().default(fallback),
  );

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
  light_theme: 'github-light',
  dark_theme: 'github-dark',
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
  // Twikoo 客户端脚本地址；留空使用 jsDelivr 默认源
  script_src: '',
  lang: 'zh-CN',
};

const defaultCommentsConfig = {
  enabled: false,
  provider: 'none',
  show_on_posts: true,
  giscus: defaultGiscusConfig,
  utterances: defaultUtterancesConfig,
  waline: defaultWalineConfig,
  twikoo: defaultTwikooConfig,
} satisfies {
  enabled: boolean;
  provider: z.infer<typeof commentProviderSchema>;
  show_on_posts: boolean;
  giscus: typeof defaultGiscusConfig;
  utterances: typeof defaultUtterancesConfig;
  waline: typeof defaultWalineConfig;
  twikoo: typeof defaultTwikooConfig;
};

const topNavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  disabled: z.boolean().optional().default(false),
});

const homeLinkSchema = z.object({
  label: z.string(),
  icon: z.string(),
  tooltip: z.string().trim(),
  copy: z.boolean(),
});

const defaultPagesConfig = {
  blog: {
    title: 'Writing notes',
    kicker: 'Notebook archive',
    subtitle: 'Notes from the margins.',
    note: 'Field notes, drafts, and technical margins arranged for slow browsing.',
    postsPerPage: 6,
    dateFormat: 'MMM d, yyyy',
    metadataSeparator: '·',
    coverImageStyle: 'card',
    listLayout: 'rows',
    categories: {
      kicker: 'Browse notes',
      subtitle: '',
      note: 'A quiet index of recurring topics, gathered from article frontmatter.',
    },
  },
  media: {
    title: 'Media',
    kicker: 'Media',
    subtitle: 'Books, films, and music worth returning to.',
    note: 'A personal shelf for what I have read, watched, and heard.',
  },
  links: {
    title: '朋友',
    kicker: 'Friends',
    subtitle: '那些人，那些事。',
  },
  moments: {
    title: '动态',
    kicker: 'Moments',
    subtitle: '记录生活点滴。',
    note: '',
    apiUrl: '',
    pageSize: 20,
    showPoweredBy: true,
  },
} as const;

const blogPageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.blog.title),
  kicker: z.string().optional().default(defaultPagesConfig.blog.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.blog.subtitle),
  note: z.string().optional().default(defaultPagesConfig.blog.note),
  postsPerPage: z
    .number()
    .int()
    .positive()
    .optional()
    .default(defaultPagesConfig.blog.postsPerPage),
  dateFormat: nonEmptyStringSchema(defaultPagesConfig.blog.dateFormat),
  metadataSeparator: nonEmptyStringSchema(defaultPagesConfig.blog.metadataSeparator),
  coverImageStyle: blogCoverImageStyleSchema
    .optional()
    .default(defaultPagesConfig.blog.coverImageStyle),
  listLayout: z.enum(['rows', 'media']).optional().default(defaultPagesConfig.blog.listLayout),
  categories: z
    .object({
      kicker: z.string().optional().default(defaultPagesConfig.blog.categories.kicker),
      subtitle: z.string().optional().default(defaultPagesConfig.blog.categories.subtitle),
      note: z.string().optional().default(defaultPagesConfig.blog.categories.note),
    })
    .optional()
    .default(defaultPagesConfig.blog.categories),
});

const mediaPageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.media.title),
  kicker: z.string().optional().default(defaultPagesConfig.media.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.media.subtitle),
  note: z.string().optional().default(defaultPagesConfig.media.note),
});

const momentsPageSchema = z.object({
  title: z.string().optional().default('动态'),
  kicker: z.string().optional().default('Moments'),
  subtitle: z.string().optional().default('记录生活点滴。'),
  note: z.string().optional().default(''),
  // Ech0 后端地址（可选）。配置后页面在浏览器里从 Ech0 拉取动态；
  // 留空则展示仓库内置演示数据。
  apiUrl: z.string().optional().default(''),
  pageSize: z.number().int().positive().optional().default(20),
  showPoweredBy: z.boolean().optional().default(true),
});

const linksPageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.links.title),
  kicker: z.string().optional().default(defaultPagesConfig.links.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.links.subtitle),
});

export const siteConfigSchema = z.object({
  site: z.object({
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
  }),
  theme: z
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
    }),
  article: z
    .object({
      share: z.boolean().optional().default(true),
      navigation: z.boolean().optional().default(true),
      morePosts: z.boolean().optional().default(true),
    })
    .optional()
    .default({ share: true, navigation: true, morePosts: true }),
  fonts: z
    .object({
      en: nonEmptyStringSchema(defaultFontConfig.en),
      code: nonEmptyStringSchema(defaultFontConfig.code),
      zh: nonEmptyStringSchema(defaultFontConfig.zh),
      file: nonEmptyStringSchema(defaultFontConfig.file),
    })
    .optional()
    .default(defaultFontConfig),
  code: z
    .object({
      lineNumbers: z.boolean().optional().default(defaultCodeConfig.lineNumbers),
      wrap: z.boolean().optional().default(defaultCodeConfig.wrap),
      preserveIndent: z.boolean().optional().default(defaultCodeConfig.preserveIndent),
      collapseStyle: collapseStyleSchema.optional().default(defaultCodeConfig.collapseStyle),
      languageBadge: z.boolean().optional().default(defaultCodeConfig.languageBadge),
      collapseLines: z
        .number()
        .int()
        .positive()
        .optional()
        .default(defaultCodeConfig.collapseLines),
      previewLines: z.number().int().positive().optional().default(defaultCodeConfig.previewLines),
    })
    .optional()
    .default(defaultCodeConfig),
  markdown: z
    .object({
      math: z.boolean().optional().default(defaultMarkdownConfig.math),
      mathRenderer: mathRendererSchema.optional().default(defaultMarkdownConfig.mathRenderer),
      mermaid: z.boolean().optional().default(defaultMarkdownConfig.mermaid),
    })
    .optional()
    .default(defaultMarkdownConfig),
  music: z
    .object({
      // Meting API 实例地址模板，支持 :server/:type/:id/:r 占位符
      meting_api: z.string().optional().default(''),
    })
    .optional()
    .default({ meting_api: '' }),
  friendCircle: z
    .object({
      // Friend-Circle-Lite 订阅源（URL 或 public/ 下的文件路径）；
      // 留空时回退到仓库内置演示数据
      feed_src: z.string().optional().default(''),
      pageSize: z.number().int().positive().optional().default(20),
    })
    .optional()
    .default({ feed_src: '', pageSize: 20 }),
  comments: z
    .object({
      enabled: z.boolean().optional().default(false),
      provider: commentProviderSchema.optional().default('none'),
      show_on_posts: z.boolean().optional().default(true),
      giscus: z
        .object({
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
        .object({
          repo: z.string().optional().default(''),
          issue_term: z.string().optional().default('pathname'),
          label: z.string().optional().default('comment'),
          theme: z.string().optional().default('github-light'),
        })
        .optional()
        .default(defaultUtterancesConfig),
      waline: z
        .object({
          server_url: z.string().optional().default(''),
          lang: z.string().optional().default('zh-CN'),
          dark: z.string().optional().default('html.dark'),
          comment: z.boolean().optional().default(true),
        })
        .optional()
        .default(defaultWalineConfig),
      twikoo: z
        .object({
          env_id: z.string().optional().default(''),
          script_src: z.string().optional().default(''),
          lang: z.string().optional().default('zh-CN'),
        })
        .optional()
        .default(defaultTwikooConfig),
    })
    .optional()
    .default(defaultCommentsConfig),
  siteInfo: z
    .object({
      title: z.string().optional().default('站点信息'),
      program: z.string().optional().default('Sonder'),
      uptime: z.boolean().optional().default(true),
      lastUpdated: z.boolean().optional().default(true),
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
      buildPlatform: true,
      imageBed: { enabled: false, name: '', icon: '' },
    }),
  profile: z.object({
    name: z.string(),
    handle: z.string(),
    role: z.string(),
    email: z.email(),
    website: z.url(),
    github: z.url(),
    avatar: z.string(),
  }),
  topNav: z.object({
    links: z.array(topNavLinkSchema),
  }),
  search: z
    .object({
      enabled: z.boolean().optional().default(true),
      shortcut: z.enum(['mod+k']).optional().default('mod+k'),
      placeholder: z.string().optional().default('Search notes...'),
      maxResults: z.number().int().positive().optional().default(6),
    })
    .optional()
    .default({
      enabled: true,
      shortcut: 'mod+k',
      placeholder: 'Search notes...',
      maxResults: 6,
    }),
  pages: z
    .object({
      blog: blogPageSchema.optional().default(defaultPagesConfig.blog),
      media: mediaPageSchema.optional().default(defaultPagesConfig.media),
      moments: momentsPageSchema.optional().default({
        title: '动态',
        kicker: 'Moments',
        subtitle: '记录生活点滴。',
        note: '',
        apiUrl: '',
        pageSize: 20,
        showPoweredBy: true,
      }),
      links: linksPageSchema.optional().default(defaultPagesConfig.links),
    })
    .optional()
    .default(defaultPagesConfig),
  home: z.object({
    // 首页引语可整段省略；不配置时 IntroCard 不渲染引语区
    quote: z
      .object({
        text: z.array(z.string()).min(1),
      })
      .optional(),
    intro: z.object({
      title: z.string(),
      name: z.string(),
      body: z.array(z.string()).min(1),
    }),
    latest: z
      .object({
        count: z.number().int().positive().default(2),
        heatmapWeeks: z.number().int().positive().default(24),
        showHeatmapLatest: z.boolean().optional().default(true),
        excludeDraft: z.boolean().optional().default(true),
        startDate: z.string().optional().default(''),
      })
      .optional()
      .default({
        count: 2,
        heatmapWeeks: 24,
        showHeatmapLatest: true,
        excludeDraft: true,
        startDate: '',
      }),
    links: z.array(homeLinkSchema).optional().default([]),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
