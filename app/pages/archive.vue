<script setup lang="ts">
import { groupBy } from 'es-toolkit/array'
import { sumBy } from 'es-toolkit/math'
import { mapValues } from 'es-toolkit/object'

const appConfig = useAppConfig()
if (!appConfig.pages.archive.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}
useSeoMeta({
	title: appConfig.pages.archive.title,
	description: appConfig.pages.archive.description || `${appConfig.pages.archive.title}的所有文章归档。`,
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])

const { data: listRaw } = await useAsyncData(
	'posts:index',
	async () => (await getArticleIndexOptions()).map(article => ({ ...article, draft: false })),
	{
		default: () => [],
		getCachedData: (key, app, ctx) =>
			(ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook')
				? undefined
				: (app.payload.data[key] ?? app.static.data[key]),
	},
)
const { listSorted, isAscending, sortOrder } = useArticleSort(listRaw)
const { category, categories, listCategorized } = useCategory(listSorted)

const listGrouped = computed(() => {
	const groupList = Object.entries(groupBy(listCategorized.value, getArticleYear))
	return isAscending.value ? groupList : groupList.reverse()
})

// 不能使用 /api/stats，因为可能切换分组方式
const yearlyWordCount = computed(() =>
	mapValues(Object.fromEntries(listGrouped.value), (articles) => {
		const total = sumBy(articles, a => a.readingTime?.words ?? 0)
		return formatNumber(total)
	}),
)

function getArticleYear(article: (typeof listRaw.value)[number]) {
	try {
		return toZonedTemporal(article[sortOrder.value] as string).year.toString()
	}
	catch {
		return ''
	}
}
</script>

<template>
<ZError v-if="!appConfig.pages.archive.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<template v-else>
	<div class="archive proper-height">
		<PostOrderToggle
			v-model:is-ascending="isAscending"
			v-model:sort-order="sortOrder"
			v-model:category="category"
			:categories
		/>

		<section
			v-for="[year, yearGroup] in listGrouped"
			:key="year"
			class="archive-group"
		>
			<div class="archive-title">
				<h2 class="archive-year">
					{{ year }}
				</h2>

				<div class="archive-info">
					<span>{{ yearlyWordCount[year] }}字</span>
					<span>{{ yearGroup?.length }}篇</span>
				</div>
			</div>

			<TransitionGroup tag="menu" class="archive-list" name="float-in">
				<PostArchive
					v-for="article, index in yearGroup"
					:key="article.path"
					v-bind="article"
					:to="article.path"
					show-category
					:use-updated="sortOrder === 'updated'"
					:style="getFixedDelay(index * 0.03)"
				/>
			</TransitionGroup>
		</section>
	</div>
</template>
</template>

<style lang="scss" scoped>
.archive {
	padding: 1rem; // 防止内部 outline 被 mask
	mask-image: linear-gradient(#FFF 50%, #FFF7);
}

.archive-group {
	// 密度调节已移除，保持原有的紧凑间距 / Density tuning removed; keep the previous compact spacing
	--archive-item-gap: 0em;

	margin: 1rem 0 3rem;

	> .archive-list {
		display: grid;
		grid-template-columns: 1fr;
	}
}

.archive-title {
	display: flex;
	justify-content: space-between;
	gap: 1em;
	position: sticky;
	opacity: 0.5;
	top: 0;
	font-size: min(1.5em, 5vw);
	color: transparent;
	transition: color 0.2s;

	&::selection, :hover > & {
		color: var(--c-text-3);
	}

	> .archive-year {
		margin-bottom: -0.3em;
		mask-image: linear-gradient(#FFF 50%, transparent);
		font-family: var(--font-stroke-free);
		font-size: 3em;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		line-height: 1;
		z-index: -1;
		-webkit-text-stroke: 1px var(--c-text-3);
	}

	> .archive-info {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		column-gap: 0.5em;
	}
}
</style>
