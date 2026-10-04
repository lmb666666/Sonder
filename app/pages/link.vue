<script setup lang="ts">
import feeds, { myFeed } from '~/feeds'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

if (!appConfig.pages.link.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}

const { data: postLink } = await useAsyncData(
	'content:/link',
	() => queryCollection('content').path('/link').first(),
)

useSeoMeta({
	title: appConfig.pages.link.title,
	ogType: 'profile',
	description: appConfig.pages.link.description,
})

const copyFields = {
	博主: myFeed.author,
	标题: myFeed.title,
	介绍: myFeed.desc,
	网址: myFeed.link,
	头像: myFeed.avatar,
}
</script>

<template>
<ZError v-if="!appConfig.pages.link.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<template v-else>
	<h1 class="sr-only">
		{{ appConfig.pages.link.title }}
	</h1>

	<FeedGroup
		v-for="group in feeds"
		:key="group.name"
		v-bind="group"
		:shuffle="appConfig.pages.link.randomInGroup"
	/>

	<Tab :tabs="[appConfig.pages.link.tabs.mine, appConfig.pages.link.tabs.apply]" center>
		<template #tab1>
			<div class="link-tab">
				<FeedCard v-bind="myFeed" />
				<Copy v-for="(code, prompt) in copyFields" :key="prompt" :prompt :code />
			</div>
		</template>
		<template #tab2>
			<ContentRenderer
				v-if="postLink"
				:value="postLink"
				class="article"
			/>
			<p v-else class="text-center">
				可于 link.md 配置友链补充说明。
			</p>
		</template>
	</Tab>

	<PostComment v-if="appConfig.features.comments.enabled" />
</template>
</template>

<style lang="scss" scoped>
.sr-only {
	position: absolute;
	overflow: hidden;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	border: 0;
	clip-path: inset(50%);
	white-space: nowrap;
}

.link-tab {
	margin: 1rem;
}
</style>
