<script setup lang="ts">
import type { ArticleProps } from '~/types/article'

const props = defineProps<{ useUpdated?: boolean } & ArticleProps>()
const appConfig = useAppConfig()
const displayDate = computed(() => props.useUpdated ? props.updated || props.date : props.date || props.updated)
const displayDateIcon = computed(() => props.useUpdated && props.updated ? 'tabler:clock-edit' : 'tabler:pencil-minus')
</script>

<template>
<UtilLink class="article-card card">
	<div class="article-cover-frame">
		<NuxtImg class="article-cover" :src="image || appConfig.ui.article.fallbackCover" :alt="title" loading="lazy" />
	</div>

	<article class="article-content">
		<span v-if="categories?.[0]" class="article-category" :style="{ color: getCategoryColor(categories[0]) }">
			<Icon :name="getCategoryIcon(categories[0])" />
			{{ categories[0] }}
		</span>

		<h2 class="article-title text-creative">
			{{ title }}
		</h2>

		<div class="article-info">
			<span v-if="readingTime?.words" class="article-words" aria-label="字数">
				<Icon name="tabler:pilcrow" />
				{{ formatNumber(readingTime?.words) }}字
			</span>

			<UtilDate
				v-if="displayDate"
				class="article-date"
				:date="displayDate"
				:icon="displayDateIcon"
			/>
		</div>
	</article>
</UtilLink>
</template>

<style lang="scss" scoped>
.article-card {
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	margin: 0 0 var(--sp-4);
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	color: var(--c-text);
	transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover,
	&:focus-visible {
		border-color: color-mix(in srgb, var(--c-primary) 70%, var(--c-border));
		box-shadow: var(--box-shadow-1), inset 0 0 0 1px var(--c-primary-soft);
	}

	> article {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 8rem;
		padding: var(--sp-4);
	}
}

.article-info {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.6em;
	margin-top: auto;
	font-size: 0.8em;
	color: var(--c-text-2);

	&:empty {
		display: none;
	}

	> * {
		min-width: 0;
	}

	:deep(.iconify) {
		flex-shrink: 0;
	}
}

.article-words,
.article-date {
	display: flex;
	align-items: center;
	gap: 0.25em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.article-category {
	display: flex;
	align-items: center;
	align-self: flex-start;
	gap: 0.3em;
	max-width: 100%;
	font-size: 0.78rem;
	font-weight: 700;
	line-height: 1.2;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.article-words {
	justify-self: start;
	max-width: 8em;
	color: var(--c-text-3);
}

.article-date {
	justify-self: end;
	text-align: end;
}

.article-title {
	display: -webkit-box;
	overflow: hidden;
	margin: auto 0;
	font-size: var(--fs-h2);
	font-weight: 700;
	-webkit-line-clamp: 2;
	line-height: var(--lh-tight);
	color: var(--c-text);
	-webkit-box-orient: vertical;
}

.article-cover-frame {
	flex-shrink: 0;
	position: relative;
	overflow: hidden;
	height: 12rem;
}

.article-cover {
	display: block;
	width: 100%;
	height: 100%;
	margin: 0;
	transition: transform 0.35s ease;
	object-fit: cover;

	.article-card:hover &,
	.article-card:focus-visible & {
		transform: scale(1.06);
	}
}
</style>
