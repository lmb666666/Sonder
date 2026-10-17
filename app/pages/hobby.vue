<script setup lang="ts">
import type { HobbyGroup } from '~/types/hobby'
import hobbyGroups from '~/hobbies'

const appConfig = useAppConfig()
const hobbyConfig = appConfig.pages.hobby

if (!hobbyConfig.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}

useSeoMeta({
	title: hobbyConfig.title,
	description: hobbyConfig.description,
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])

const sections = computed(() => hobbyGroups.filter(group => group.playlist || group.items.length))
const itemCount = computed(() => sections.value.reduce(
	(total, group) => group.playlist ? total : total + group.items.length,
	0,
))
const playlistCount = computed(() => sections.value.filter(group => group.playlist).length)

const headerStats = computed(() => [
	{ icon: 'tabler:category', value: sections.value.length, label: '个分类' },
	{ icon: 'tabler:heart', value: itemCount.value, label: '件收藏' },
	...(playlistCount.value
		? [{ icon: 'tabler:music', value: playlistCount.value, label: '张歌单' }]
		: []),
])

const sourceNames: Record<string, string> = { bangumi: 'Bangumi', steam: 'Steam' }
const sourceLabel = computed(() => [...new Set(sections.value
	.filter(group => !group.playlist)
	.flatMap(group => group.items.map(item => item.source))
	.filter((source): source is 'bangumi' | 'steam' => source === 'bangumi' || source === 'steam'))]
	.map(source => sourceNames[source])
	.join(' / '))

function sectionCount(group: HobbyGroup) {
	if (group.playlist)
		return '1 张歌单'
	return `${group.items.length} ${group.unit || '件'}`
}
</script>

<template>
<ZError v-if="!hobbyConfig.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<div v-else class="hobby-page proper-height">
	<ZPageHeader
		icon="tabler:heart"
		:title="hobbyConfig.title"
		:description="hobbyConfig.description"
		:background="appConfig.ui.article.fallbackCover"
		:stats="headerStats"
	>
		<template v-if="sourceLabel" #powered>
			<span>数据来自 {{ sourceLabel }}</span>
		</template>
	</ZPageHeader>

	<div v-if="!sections.length" class="hobby-empty">
		<Icon name="tabler:heart" aria-hidden="true" />
		<p>还没有添加兴趣条目</p>
		<span>在 <code>content/data/hobbies.ts</code> 里写下看过、听过、读过的作品。</span>
	</div>

	<section
		v-for="group in sections"
		:key="group.key"
		class="hobby-section"
	>
		<header class="hobby-section-head">
			<Icon
				:name="group.icon"
				class="hobby-section-icon"
				:style="{ color: group.color }"
				aria-hidden="true"
			/>
			<h2 class="hobby-section-title text-creative">
				{{ group.name }}
			</h2>
			<p v-if="group.description" class="hobby-section-desc">
				{{ group.description }}
			</p>
			<span class="hobby-section-count">{{ sectionCount(group) }}</span>
		</header>

		<HobbyMusicPlayer
			v-if="group.playlist"
			:playlist="group.playlist"
		/>
		<HobbyShelf
			v-else-if="!group.layout || group.layout === 'shelf'"
			:group="group"
		/>
		<HobbyList
			v-else-if="group.layout === 'list'"
			:group="group"
		/>
		<HobbyGrid
			v-else
			:group="group"
		/>
	</section>
</div>
</template>

<style lang="scss" scoped>
.hobby-page {
	--hobby-card-width: 12rem;

	padding: 1.5rem 1rem 2rem;
}

.hobby-section {
	max-width: 64rem;
	margin-top: 1.6rem;
}

.hobby-section + .hobby-section {
	margin-top: 2rem;
	padding-top: 1.5rem;
	border-top: 1px solid var(--c-border);
}

.hobby-section-head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.45rem 0.6rem;
	margin-bottom: 0.7rem;
}

.hobby-section-icon {
	align-self: center;
	font-size: 1.05rem;
}

.hobby-section-title {
	font-size: var(--fs-h3);
	font-weight: 650;
	line-height: 1.25;
	color: var(--c-text-1);
}

.hobby-section-desc {
	font-size: var(--fs-xs);
	color: var(--c-text-3);
}

.hobby-section-count {
	margin-inline-start: auto;
	font-family: var(--font-monospace);
	font-size: var(--fs-xs);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	color: var(--c-text-3);
}

.hobby-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	padding: 4rem 1rem;
	text-align: center;

	.iconify {
		opacity: 0.35;
		font-size: 2rem;
		color: var(--c-text-3);
	}

	p {
		font-size: 0.95rem;
		color: var(--c-text-2);
	}

	span {
		font-size: var(--fs-xs);
		color: var(--c-text-3);

		code {
			padding: 0.1em 0.3em;
			border-radius: 0.25em;
			background: var(--c-bg-2);
			font-family: var(--font-monospace);
		}
	}
}

@media (max-width: $breakpoint-mobile) {
	.hobby-page {
		--hobby-card-width: calc((100% - 0.65rem) / 2);

		padding: 1rem 0.75rem 2rem;
	}

	.hobby-section + .hobby-section {
		margin-top: 1.6rem;
		padding-top: 1.2rem;
	}

	.hobby-section-count {
		margin-inline-start: 0;
	}
}
</style>
