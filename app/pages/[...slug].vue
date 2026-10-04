<script setup lang="ts">
const route = useRoute()
const appConfig = useAppConfig()

const layoutStore = useLayoutStore()
layoutStore.setAside([])

const { data: post } = await useAsyncData(
	`content:${route.path}`,
	() => {
		if (import.meta.dev)
			return queryCollection('content').path(route.path).first()

		const query = queryCollection('content')
			.where('stem', 'LIKE', 'posts/%')
			.path(route.path)
		query.where('draft', '=', false)
		return query.first()
	},
)

const excerpt = computed(() => post.value?.description || '')
const asideWidgets = computed(() => {
	const aside = post.value?.meta?.aside
	return Array.isArray(aside) && aside.every((widget): widget is WidgetName => typeof widget === 'string')
		? aside
		: undefined
})
const { activeHeadingId } = useToc(() => post.value?.body.toc)
provide('article-active-heading-id', activeHeadingId)

if (post.value) {
	useSeoMeta({
		title: post.value.title,
		ogType: 'article',
		ogImage: post.value.image,
		description: post.value.description,
	})
	layoutStore.setAside(asideWidgets.value)
}
else {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
	route.meta.title = '404'
	layoutStore.setAside([])
}

if (import.meta.dev) {
	watchEffect(() => {
		layoutStore.setAside(asideWidgets.value)
	})
}
</script>

<template>
<template v-if="post">
	<div class="article-layout">
		<div class="article-main">
			<PostHeader v-bind="post" />
			<WidgetToc class="article-toc-float" :active-heading-id="activeHeadingId" />
			<PostExcerpt v-if="excerpt" :excerpt />
			<!-- 使用 float-in 动画会导致搜索跳转不准确 -->
			<ContentRenderer
				class="article"
				:class="getPostTypeClassName(post?.type, { prefix: 'md' })"
				:value="post"
				tag="article"
			/>

			<PostFooter v-bind="post" />
			<PostSurround />
			<PostComment v-if="appConfig.features.comments.enabled" />
		</div>
		<PostAside class="article-aside" :toc="post.body.toc" :widgets="asideWidgets" />
	</div>
</template>

<ZError
	v-else
	icon="line-md:document-delete-twotone"
	title="内容为空或页面不存在"
/>
</template>

<style lang="scss" scoped>
.article-layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 15rem;
	gap: 1rem;
	min-width: 0;
}

.article-main {
	min-width: 0;
}

.article-aside {
	display: none;
}

@media (max-width: $breakpoint-widescreen) {
	.article-layout {
		display: block;
	}
}

@media (min-width: 1081px) {
	.article-toc-float {
		display: none;
	}

	.article-aside {
		display: block;
	}
}
</style>
