import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tocSchema = z
  .object({
    enable: z.boolean().optional().default(true),
  })
  .optional()
  .default({ enable: true });

const sidebarSchema = z
  .object({
    enable: z.boolean().optional(),
    toc: z.boolean().optional(),
    relatedPosts: z.boolean().optional(),
  })
  .optional();

const articleSchema = ({ image }: Parameters<Parameters<typeof defineCollection>[0]['schema']>[0]) =>
  z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional().default(false),
    heroImage: z.optional(image()),
    tags: z.array(z.string()).optional().default([]),
    toc: tocSchema,
    sidebar: sidebarSchema,
  });

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: articleSchema,
});

const about = defineCollection({
  loader: glob({ base: './src/content', pattern: 'about.{md,mdx}' }),
  schema: articleSchema,
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: articleSchema,
});

export const collections = { about, blog, projects };
