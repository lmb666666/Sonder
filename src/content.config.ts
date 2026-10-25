import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import navfolioConfig from '../navfolio.config';
import { isPageModuleEnabled } from './plugins/config';

type CollectionSchemaFactory = Extract<
  Parameters<typeof defineCollection>[0]['schema'],
  (...args: any[]) => any
>;

const sidebarSchema = z
  .object({
    enable: z.boolean().optional(),
    toc: z.boolean().optional(),
    relatedPosts: z.boolean().optional(),
  })
  .optional();

const remoteImageSchema = z
  .url()
  .refine((src) => /^https?:\/\//i.test(src), 'Remote images must start with http:// or https://');

const siteUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}, z.url());

const contentImageSchema = ({ image }: Parameters<CollectionSchemaFactory>[0]) =>
  z.union([image(), remoteImageSchema]);

const articleSchema = ({ image }: Parameters<CollectionSchemaFactory>[0]) =>
  z.object({
    title: z.string(),
    description: z.string(),
    // Creation date. Accepts ISO 8601 strings and plain dates such as YYYY-MM-DD.
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    heroImage: z.optional(contentImageSchema({ image })),
    showHeroImage: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    series: z.array(z.string()).optional().default([]),
    comments: z.boolean().optional().default(true),
    sidebar: sidebarSchema,
  });

const blogArticleSchema = (context: Parameters<CollectionSchemaFactory>[0]) =>
  articleSchema(context).extend({
    sticky: z.union([z.boolean(), z.number().positive()]).optional().default(false),
    // Sonder v1 兼容字段：稳定文章 ID（数字会归一为字符串，字符集 [\w-]）。
    postid: z.preprocess(
      (value) =>
        typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
          ? String(value)
          : value,
      z
        .string()
        .regex(/^[\w-]+$/, 'postid 只能包含字母、数字、下划线与连字符。')
        .optional(),
    ),
    // Sonder v1 兼容字段：文末「参考链接」清单。
    references: z
      .array(
        z.object({
          title: z.string().optional(),
          link: z.string().optional(),
        }),
      )
      .optional(),
  });

const contentSource = process.env.NAVFOLIO_CONTENT_SOURCE === 'docs' ? 'docs' : 'content';
const contentBase = contentSource === 'docs' ? './src/docs' : './src/content';
const vibeModuleEnabled = isPageModuleEnabled(navfolioConfig, 'vibe');
const mediaModuleEnabled = isPageModuleEnabled(navfolioConfig, 'media');

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
  lightTheme: 'catppuccin-latte',
  darkTheme: 'catppuccin-macchiato',
  lineNumbers: true,
  wrap: true,
  preserveIndent: true,
  collapseStyle: 'github',
} as const;

const defaultMathConfig = {
  render: 'katex',
} satisfies {
  render: z.infer<typeof mathRendererSchema>;
};

const defaultFontConfig = {
  en: 'Maple Mono',
  code: 'Monaco',
  zh: 'ChillRoundM',
  file: '/fonts/ChillRoundM.woff2',
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
  pageview: true,
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

const linkSchema = z.object({
  label: z.string(),
  href: z.string().optional(),
  module: z.string().optional(),
  icon: z.string().optional(),
  disabled: z.boolean().optional().default(false),
});

const topNavLinkSchema = linkSchema
  .omit({ icon: true })
  .refine((link) => Boolean(link.href || link.module), {
    message: 'Top nav links must define either href or module.',
  });

const navigationItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
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
      title: 'Categories',
      kicker: 'Browse notes',
      subtitle: '',
      note: 'A quiet index of recurring topics, gathered from article frontmatter.',
    },
    series: {
      title: 'Series',
      kicker: 'Reading paths',
      subtitle: '',
      note: 'Connected notes that can be followed in the order they were written.',
    },
  },
  projects: {
    title: 'Projects',
    kicker: 'Project shelf',
    subtitle: 'Small tools and site systems.',
    note: 'A compact shelf for implementation choices, releases, and publishing experiments.',
  },
  vibe: {
    title: 'vibe',
    kicker: '',
    subtitle: 'Life and coding fragments.',
    note: 'Not formal enough for blog posts, but still part of the story.',
    showTrail: true,
  },
  media: {
    title: 'Media',
    subtitle: 'Books, films, and music worth returning to.',
    note: 'A personal shelf for what I have read, watched, and heard.',
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
      title: z.string().optional().default(defaultPagesConfig.blog.categories.title),
      kicker: z.string().optional().default(defaultPagesConfig.blog.categories.kicker),
      subtitle: z.string().optional().default(defaultPagesConfig.blog.categories.subtitle),
      note: z.string().optional().default(defaultPagesConfig.blog.categories.note),
    })
    .optional()
    .default(defaultPagesConfig.blog.categories),
  series: z
    .object({
      title: z.string().optional().default(defaultPagesConfig.blog.series.title),
      kicker: z.string().optional().default(defaultPagesConfig.blog.series.kicker),
      subtitle: z.string().optional().default(defaultPagesConfig.blog.series.subtitle),
      note: z.string().optional().default(defaultPagesConfig.blog.series.note),
    })
    .optional()
    .default(defaultPagesConfig.blog.series),
});

const projectsPageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.projects.title),
  kicker: z.string().optional().default(defaultPagesConfig.projects.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.projects.subtitle),
  note: z.string().optional().default(defaultPagesConfig.projects.note),
});

const vibePageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.vibe.title),
  kicker: z.string().optional().default(defaultPagesConfig.vibe.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.vibe.subtitle),
  note: z.string().optional().default(defaultPagesConfig.vibe.note),
  showTrail: z.boolean().optional().default(defaultPagesConfig.vibe.showTrail),
});

const mediaPageSchema = z.object({
  title: z.string().optional().default(defaultPagesConfig.media.title),
  subtitle: z.string().optional().default(defaultPagesConfig.media.subtitle),
  note: z.string().optional().default(defaultPagesConfig.media.note),
});

const momentsPageSchema = z.object({
  title: z.string().optional().default('动态'),
  subtitle: z.string().optional().default('记录生活点滴。'),
  note: z.string().optional().default(''),
  // Ech0 后端地址（可选）。配置后页面在浏览器里从 Ech0 拉取动态；
  // 留空则展示仓库内置演示数据。
  apiUrl: z.string().optional().default(''),
  pageSize: z.number().int().positive().optional().default(20),
  showPoweredBy: z.boolean().optional().default(true),
});

const siteConfig = defineCollection({
  loader: file('./src/config/site.toml'),
  schema: z.object({
    site: z.object({
      title: z.string(),
      description: z.string(),
      pageTitle: z.string(),
      pageDescription: z.string(),
      url: siteUrlSchema,
      repository: z.url(),
      footerNote: z.string(),
      // 站点建立日期（站点信息卡的运行时长；留空隐藏该行）
      timeEstablished: z.string().optional(),
    }),
    theme: z
      .object({
        palette: paletteSchema.optional().default('green-soft'),
        lang: z.string().optional().default('en'),
        // 导航栏样式："bar" 通栏工具条，"pill" 居中胶囊（带头像交接）
        navStyle: z.enum(['bar', 'pill']).optional().default('bar'),
      })
      .optional()
      .default({
        palette: 'green-soft',
        lang: 'en',
        navStyle: 'bar',
      }),
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
        lightTheme: z.string().optional().default(defaultCodeConfig.lightTheme),
        darkTheme: z.string().optional().default(defaultCodeConfig.darkTheme),
        lineNumbers: z.boolean().optional().default(defaultCodeConfig.lineNumbers),
        wrap: z.boolean().optional().default(defaultCodeConfig.wrap),
        preserveIndent: z.boolean().optional().default(defaultCodeConfig.preserveIndent),
        collapseStyle: collapseStyleSchema.optional().default(defaultCodeConfig.collapseStyle),
      })
      .optional()
      .default(defaultCodeConfig),
    math: z
      .object({
        render: mathRendererSchema.optional().default(defaultMathConfig.render),
      })
      .optional()
      .default(defaultMathConfig),
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
            pageview: z.boolean().optional().default(true),
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
        projects: projectsPageSchema.optional().default(defaultPagesConfig.projects),
        vibe: vibePageSchema.optional().default(defaultPagesConfig.vibe),
        media: mediaPageSchema.optional().default(defaultPagesConfig.media),
        moments: momentsPageSchema.optional().default({
          title: '动态',
          subtitle: '记录生活点滴。',
          note: '',
          apiUrl: '',
          pageSize: 20,
          showPoweredBy: true,
        }),
      })
      .optional()
      .default(defaultPagesConfig),
    home: z.object({
      quote: z.object({
        text: z.array(z.string()).min(1),
      }),
      intro: z.object({
        title: z.string(),
        name: z.string(),
        body: z.array(z.string()).min(1),
      }),
      latest: z
        .object({
          count: z.number().int().positive().default(1),
          heatmapWeeks: z.number().int().positive().default(24),
          showHeatmapLatest: z.boolean().optional().default(true),
          excludeDraft: z.boolean().optional().default(true),
          startDate: z.string().optional().default(''),
          dateArchiveBaseHref: z.string().optional().default(''),
        })
        .optional()
        .default({
          count: 1,
          heatmapWeeks: 24,
          showHeatmapLatest: true,
          excludeDraft: true,
          startDate: '',
          dateArchiveBaseHref: '',
        }),
      navigation: z.array(navigationItemSchema),
      links: z.array(homeLinkSchema).optional().default([]),
    }),
  }),
});

const blog = defineCollection({
  loader: glob({ base: `${contentBase}/blog`, pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: blogArticleSchema,
});

const about = defineCollection({
  loader: glob({ base: contentBase, pattern: 'about.{md,mdx}' }),
  schema: articleSchema,
});

const projects = defineCollection({
  loader: glob({ base: `${contentBase}/projects`, pattern: '**/*.{md,mdx}' }),
  schema: (context) =>
    articleSchema(context).extend({
      sticky: z.union([z.boolean(), z.number().positive()]).optional().default(false),
      icon: z
        .enum([
          'github',
          'box',
          'code-2',
          'database',
          'file-code-2',
          'globe-2',
          'layers-3',
          'palette',
          'rocket',
          'sparkles',
          'terminal',
          'wand-sparkles',
        ])
        .optional()
        .default('github'),
      iconColor: z
        .string()
        .regex(
          /^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\)|[a-z]+)$/i,
          'Use a CSS color, hex color, or CSS variable.',
        )
        .optional(),
      authors: z
        .array(
          z.object({
            name: z.string(),
            url: z.url().optional(),
          }),
        )
        .optional()
        .default([]),
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.url(),
            kind: z
              .enum(['github', 'website', 'platform', 'docs', 'demo'])
              .optional()
              .default('website'),
          }),
        )
        .optional()
        .default([]),
    }),
});

const vibe = defineCollection({
  loader: glob({ base: `${contentBase}/vibe`, pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().optional().default(false),
      type: z.enum(['text', 'photo', 'quote', 'code', 'mixed']).optional().default('text'),
      mood: z.string().optional(),
      location: z.string().optional(),
      images: z.array(contentImageSchema({ image })).optional().default([]),
      tags: z.array(z.string()).optional().default([]),
      align: z.enum(['left', 'right', 'center']).optional(),
      size: z.enum(['sm', 'md', 'lg']).optional().default('md'),
    }),
});

const media = defineCollection({
  loader: glob({ base: `${contentBase}/media`, pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      creator: z.string(),
      type: z.enum(['book', 'film', 'series', 'album', 'podcast']),
      status: z.enum(['completed', 'in-progress', 'planned', 'abandoned']).default('completed'),
      completedAt: z.coerce.date().optional(),
      draft: z.boolean().optional().default(false),
      cover: contentImageSchema({ image }).optional(),
      coverAspect: z.enum(['portrait', 'landscape', 'square', 'wide']).optional(),
      rating: z.number().min(1).max(5).optional(),
      review: z.boolean().optional().default(false),
      tags: z.array(z.string()).optional().default([]),
      externalUrl: z.url().optional(),
    }),
});

export const collections = {
  about,
  blog,
  siteConfig,
  // projects 集合与页面模块解耦：项目卡片现由关于页展示
  projects,
  ...(vibeModuleEnabled ? { vibe } : {}),
  ...(mediaModuleEnabled ? { media } : {}),
};
