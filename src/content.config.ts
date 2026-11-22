import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { siteConfigSchema } from './config/schema';
import { createBlogEntryId, POST_ID_PATTERN, RESERVED_POST_IDS } from './lib/post-id';

type CollectionSchemaFactory = Extract<
  Parameters<typeof defineCollection>[0]['schema'],
  (...args: any[]) => any
>;

const sidebarSchema = z
  .object({
    enable: z.boolean().optional(),
    toc: z.boolean().optional(),
  })
  .optional();

const remoteImageSchema = z
  .url()
  .refine((src) => /^https?:\/\//i.test(src), 'Remote images must start with http:// or https://');

const contentImageSchema = ({ image }: Parameters<CollectionSchemaFactory>[0]) =>
  z.union([image(), remoteImageSchema]);

const postIdSchema = z.preprocess(
  (value) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : value,
  z
    .string()
    .trim()
    .min(1, 'postid 不能为空')
    .regex(POST_ID_PATTERN, 'postid 只能包含字母、数字、下划线和连字符')
    .refine(
      (value) => !RESERVED_POST_IDS.has(value.toLowerCase()),
      'postid 与 /blog 下的静态路由冲突',
    ),
);

const articleSchema = ({ image }: Parameters<CollectionSchemaFactory>[0]) =>
  z.object({
    title: z.string(),
    description: z.string(),
    postid: postIdSchema,
    // Creation date. Accepts ISO 8601 strings and plain dates such as YYYY-MM-DD.
    date: z.coerce.date(),
    // Last meaningful edit. Optional; sorting still uses date.
    updated: z.coerce.date().optional(),
    draft: z.boolean().optional().default(false),
    heroImage: z.optional(contentImageSchema({ image })),
    showHeroImage: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    comments: z.boolean().optional().default(true),
    sidebar: sidebarSchema,
  });

const aboutColorSchema = z
  .string()
  .regex(/^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\))$/i, 'Use a CSS color, hex color, or CSS variable.');

const aboutLinkSchema = z.object({
  label: z.string(),
  icon: z.string().optional().default('link'),
  tooltip: z.string().trim(),
  copy: z.boolean().optional().default(false),
});

const aboutMbtiSchema = z.object({
  type: z.string(),
  label: z.string(),
  quote: z.string().optional().default(''),
  quoteAuthor: z.string().optional().default(''),
  image: z.string().optional().default(''),
  link: z.string().optional().default(''),
  linkText: z.string().optional().default(''),
});

const aboutCareerSchema = z.object({
  track: z.enum(['study', 'blog']),
  start: z.number().int(),
  end: z.number().int(),
  period: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  current: z.boolean().optional().default(false),
});

const aboutSkillSchema = z.object({
  name: z.string(),
  note: z.string().optional().default(''),
  short: z.string().optional().default(''),
  color: aboutColorSchema.optional(),
  text: z.enum(['light', 'dark']).optional().default('light'),
});

const aboutWorkSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(''),
  date: z.coerce.date(),
  tags: z.array(z.string()).optional().default([]),
  cover: z.string().optional().default(''),
  links: z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    )
    .optional()
    .default([]),
});

const aboutSchema = z.object({
  title: z.string(),
  description: z.string(),
  banner: z
    .object({
      tags: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({ tags: [] }),
  profile: z
    .object({
      bio: z.array(z.string()).optional().default([]),
      location: z.string().optional().default(''),
      status: z.string().optional().default(''),
      school: z.string().optional().default(''),
      photo: z.string().optional().default(''),
      mbti: aboutMbtiSchema.optional(),
    })
    .optional()
    .default({ bio: [], location: '', status: '', school: '', photo: '' }),
  experience: z.array(aboutCareerSchema).optional().default([]),
  techStatement: z.string().optional().default(''),
  skills: z.array(aboutSkillSchema).optional().default([]),
  works: z.array(aboutWorkSchema).optional().default([]),
  contact: z
    .object({
      links: z.array(aboutLinkSchema).optional().default([]),
    })
    .optional()
    .default({ links: [] }),
});

const momentSchema = z.object({
  id: z.string().min(1),
  content: z.string().optional().default(''),
  date: z
    .union([z.string(), z.date()])
    .transform((value) => (value instanceof Date ? value.toISOString() : value))
    .refine((value) => !Number.isNaN(Date.parse(value)), 'date must be a parseable ISO date'),
  tags: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  video: z
    .object({
      provider: z.enum(['bilibili', 'youtube', 'douyin', 'tiktok']),
      id: z.string(),
    })
    .optional(),
  extension: z
    .object({
      type: z.enum(['github', 'website', 'music', 'location', 'tweet']),
      title: z.string(),
      description: z.string().optional().default(''),
      url: z.string().optional().default(''),
    })
    .optional(),
});

const friendLinkItemSchema = z.object({
  name: z.string(),
  url: z.string(),
  bio: z.string().optional().default(''),
  avatar: z.string().nullable().optional().default(null),
  backgroundImage: z.string().nullable().optional().default(null),
  rss: z.string().nullable().optional().default(null),
  sticky: z.union([z.boolean(), z.number()]).nullable().optional().default(null),
});

const friendsSchema = z.object({
  groups: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional().default(''),
        items: z.array(friendLinkItemSchema).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

const tokenUsageSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD'),
  values: z.array(z.number().int().nonnegative()),
});

const blogArticleSchema = (context: Parameters<CollectionSchemaFactory>[0]) =>
  articleSchema(context).extend({
    sticky: z.union([z.boolean(), z.number().positive()]).optional().default(false),
    // 文末「参考链接」清单。
    references: z
      .array(
        z.object({
          title: z.string().optional(),
          link: z.string().optional(),
        }),
      )
      .optional(),
  });

const contentBase = './src/content';

const siteConfig = defineCollection({
  loader: file('./site.config.toml'),
  schema: siteConfigSchema,
});

const blog = defineCollection({
  loader: glob({
    base: `${contentBase}/blog`,
    pattern: '**/*.md',
    generateId: ({ entry, data }) => createBlogEntryId(entry, data.postid),
  }),
  // Type-check frontmatter using a schema
  schema: blogArticleSchema,
});

const about = defineCollection({
  loader: file('./src/data/about.yml'),
  schema: aboutSchema,
});

const moments = defineCollection({
  loader: file('./src/data/moments.yml'),
  schema: momentSchema,
});

const friends = defineCollection({
  loader: file('./src/data/friends.yml'),
  schema: friendsSchema,
});

const tokenUsage = defineCollection({
  loader: file('./src/data/token-usage.yml'),
  schema: tokenUsageSchema,
});

const media = defineCollection({
  loader: glob({ base: `${contentBase}/media`, pattern: '**/*.md' }),
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
  friends,
  moments,
  siteConfig,
  tokenUsage,
  media,
};
