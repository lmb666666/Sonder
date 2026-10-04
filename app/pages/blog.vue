<script setup lang="ts">
import { orderBy } from 'es-toolkit/array'
import { getRecommendedArticles } from '#shared/utils/article'

const appConfig = useAppConfig()
useSeoMeta({
	description: appConfig.description,
	ogImage: appConfig.author.avatar,
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])

const { data: listRaw } = await useAsyncData(
	'posts:blog',
	async () => (await getArticleIndexOptions()).map(article => ({ ...article, draft: false })),
	{
		default: () => [],
		getCachedData: (key, app, ctx) =>
			(ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook')
				? undefined
				: (app.payload.data[key] ?? app.static.data[key]),
	},
)
const { listSorted, isAscending, sortOrder } = useArticleSort(listRaw, { bindDirectionQuery: 'asc', bindOrderQuery: 'sort' })
const { category, categories, listCategorized } = useCategory(listSorted, { bindQuery: 'category' })
const { page, totalPages, listPaged } = usePagination(listCategorized, { bindQuery: 'page' })

watch(category, () => {
	page.value = 1
})

useSeoMeta({ title: () => (page.value > 1 ? `${appConfig.pages.blog.title} - 第${page.value}页` : appConfig.pages.blog.title) })

const listRecommended = computed(() => orderBy(
	getRecommendedArticles(listRaw.value),
	['recommend', 'date'],
	['desc'],
))

const { data: previewCount } = useAsyncData(
	'previews:count',
	() => import.meta.dev
		? queryCollection('content').where('stem', 'LIKE', 'previews/%').count()
		: Promise.resolve(0),
)
</script>

<template>
<UtilHydrateSafe>
	<PostSlide v-if="appConfig.ui.slide.enabled && listRecommended.length && page === 1 && !category" :list="listRecommended" />

	<div class="post-list">
		<PostOrderToggle
			v-model:is-ascending="isAscending"
			v-model:sort-order="sortOrder"
			v-model:category="category"
			:categories
		>
			<ZSecret>
				<UtilLink v-if="previewCount" to="/preview" class="preview-entrance">
					<Icon name="tabler:shield-lock" />
					查看预览文章
				</UtilLink>
			</ZSecret>
		</PostOrderToggle>

		<TransitionGroup tag="div" class="article-grid proper-height" name="float-in">
			<PostArticle
				v-for="article, index in listPaged"
				:key="article.path"
				v-bind="article"
				:to="article.path"
				:use-updated="sortOrder === 'updated'"
				:style="getFixedDelay(index * 0.05)"
			/>
		</TransitionGroup>

		<ZPagination v-model="page" sticky avoid :total-pages="totalPages" />
	</div>
</UtilHydrateSafe>
</template>

<style lang="scss" scoped>
.post-list {
	margin: var(--sp-4);
}

.article-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-content: start;
	align-items: stretch;
	gap: var(--sp-4);
	margin: var(--sp-4) 0;

	> :deep(.article-card) {
		height: 100%;
		margin: 0;
	}

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;
	}
}

.float-in-leave-to {
	position: absolute;
}
</style>
