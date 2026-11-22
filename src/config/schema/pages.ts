import { z } from 'astro/zod';

import { blogCoverImageStyleSchema, homeLinkSchema, nonEmptyStringSchema } from './shared';

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
  },
} as const;

const blogPageSchema = z.strictObject({
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
});

const mediaPageSchema = z.strictObject({
  title: z.string().optional().default(defaultPagesConfig.media.title),
  kicker: z.string().optional().default(defaultPagesConfig.media.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.media.subtitle),
  note: z.string().optional().default(defaultPagesConfig.media.note),
});

const momentsPageSchema = z.strictObject({
  title: z.string().optional().default(defaultPagesConfig.moments.title),
  kicker: z.string().optional().default(defaultPagesConfig.moments.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.moments.subtitle),
  note: z.string().optional().default(defaultPagesConfig.moments.note),
});

const linksPageSchema = z.strictObject({
  title: z.string().optional().default(defaultPagesConfig.links.title),
  kicker: z.string().optional().default(defaultPagesConfig.links.kicker),
  subtitle: z.string().optional().default(defaultPagesConfig.links.subtitle),
});

export const pagesSchema = z
  .strictObject({
    blog: blogPageSchema.optional().default(defaultPagesConfig.blog),
    media: mediaPageSchema.optional().default(defaultPagesConfig.media),
    moments: momentsPageSchema.optional().default(defaultPagesConfig.moments),
    links: linksPageSchema.optional().default(defaultPagesConfig.links),
  })
  .optional()
  .default(defaultPagesConfig);

export const articleSchema = z
  .strictObject({
    share: z.boolean().optional().default(true),
    navigation: z.boolean().optional().default(true),
    morePosts: z.boolean().optional().default(true),
  })
  .optional()
  .default({ share: true, navigation: true, morePosts: true });

export const homeSchema = z.strictObject({
  // 首页引语可整段省略；不配置时 IntroCard 不渲染引语区
  quote: z
    .strictObject({
      text: z.array(z.string()).min(1),
    })
    .optional(),
  intro: z.strictObject({
    title: z.string(),
    name: z.string(),
    body: z.array(z.string()).min(1),
  }),
  latest: z
    .strictObject({
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
});
