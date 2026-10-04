import { defineCollection } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { z } from 'zod'
import blogConfig from './blog.config'
import { articleTypes, postIdPattern } from './shared/utils/article'

export interface ArticleSchema {
	title?: string
	author?: string
	description?: string
	date?: string
	updated?: string
	published?: string
	categories: string[]
	tags: string[]
	type: typeof articleTypes[number]

	image?: string
	recommend?: number
	references?: Array<{
		title?: string
		link?: string
	}>
	draft: boolean
	postid?: string

	readingTime: {
		text: string
		minutes: number
		time: number
		words: number
	}
}

const postIdSchema = z.preprocess(
	value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : value,
	z.string().regex(postIdPattern).optional(),
)

const articleSchema = z.object({
	title: z.string().optional(),
	author: z.string().optional(),
	description: z.string().optional(),
	date: z.string().optional(),
	updated: z.string().optional(),
	published: z.string().optional(),
	categories: z.array(z.string()).default([blogConfig.defaultCategory]),
	tags: z.array(z.string()).default([]),
	type: z.enum(articleTypes).optional().default(articleTypes[0]),

	image: z.string().optional(),
	recommend: z.number().optional(),
	references: z.array(z.object({
		title: z.string().optional(),
		link: z.string().optional(),
	})).optional(),
	draft: z.boolean().default(false),
	postid: postIdSchema,

	readingTime: z.object({
		text: z.string(),
		minutes: z.number(),
		time: z.number(),
		words: z.number(),
	}),
})

export const collections = {
	content: defineCollection({
		source: {
			include: '**/*.md',
		},
		type: 'page',
		schema: articleSchema.extend({
			sitemap: defineSitemapSchema({
				name: 'content',
				filter: entry => entry.stem?.startsWith('posts/') === true && entry.draft !== true,
				onUrl: (url, entry) => {
					const lastmod = (entry.updated || entry.published || entry.date) as string | undefined
					if (lastmod)
						url.lastmod = new Date(lastmod).toLocaleDateString('sv')
				},
				z,
			}),
		}),
	}),
}
