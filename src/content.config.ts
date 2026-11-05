import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { siteConfigSchema } from './config/schema';

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
    comments: z.boolean().optional().default(true),
    sidebar: sidebarSchema,
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
  loader: glob({ base: `${contentBase}/blog`, pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: blogArticleSchema,
});

const about = defineCollection({
  loader: glob({ base: contentBase, pattern: 'about.md' }),
  schema: articleSchema,
});

const projects = defineCollection({
  loader: glob({ base: `${contentBase}/projects`, pattern: '**/*.md' }),
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
  siteConfig,
  // projects 集合与页面模块解耦：项目卡片现由关于页展示
  projects,
  media,
};
