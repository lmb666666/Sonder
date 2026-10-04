import type { ArticleSchema } from '~~/content.config'
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'

export type { ArticleOrderType } from '~~/shared/utils/article'

export type ArticleProps = Pick<ArticleSchema, 'title' | 'description' | 'date' | 'updated' | 'published' | 'categories' | 'tags' | 'type' | 'image' | 'recommend' | 'references' | 'draft' | 'readingTime'> & {
	path: string

	meta?: {
		aside?: WidgetName[]
		coverDim?: boolean
		coverFilter?: string
		hideInfo?: boolean
		slots?: Record<string, MetaSlotsTree>
	}
}
