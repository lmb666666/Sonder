<script setup lang="ts">
import type { ArticleProps } from '~/types/article'

defineOptions({ inheritAttrs: false })
const props = defineProps<ArticleProps>()

const appConfig = useAppConfig()

const coverFilter = computed(() => props.meta?.coverFilter || (props.meta?.coverDim && 'brightness(0.75)') || undefined)

const shareText = `【${appConfig.title}】${props.title}\n\n${
	props.description ? `${props.description}\n\n` : ''}${
	new URL(props.path!, appConfig.url).href}`

const { copy, copied } = useCopy(shareText)
</script>

<template>
<div class="post-header" :class="{ 'has-cover': image }">
	<Pic v-if="image" class="post-cover" :src="image" :alt="title" :filter="coverFilter" />
	<div class="post-nav">
		<div v-if="appConfig.features.share.enabled" class="operations">
			<Icon v-show="false" name="tabler:check" />
			<ZButton
				:icon="copied ? 'tabler:check' : 'tabler:share'"
				text="文字分享"
				@click="copy()"
			/>
		</div>

		<div v-if="!meta?.hideInfo" class="post-info">
			<UtilDate
				v-if="appConfig.ui.article.info.date && date"
				v-tip
				:tip-transform="d => `创建于${d}`"
				:date
				icon="tabler:pencil-minus"
			/>

			<UtilDate
				v-if="appConfig.ui.article.info.updated && updated && isTimeDiffSignificant(date, updated, 1)"
				v-tip
				:tip-transform="d => `修改于${d}`"
				:date="updated"
				icon="tabler:clock-edit"
			/>

			<span v-if="appConfig.ui.article.info.category && categories">
				<Icon :name="getCategoryIcon(categories[0])" />
				{{ categories[0] }}
			</span>

			<span v-if="appConfig.ui.article.info.words">
				<Icon name="tabler:pilcrow" />
				{{ formatNumber(readingTime?.words) }} 字
			</span>
		</div>
	</div>

	<h1 class="post-title" :class="getPostTypeClassName(type)">
		{{ title }}
	</h1>
</div>
</template>

<style lang="scss" scoped>
.post-header {
	contain: layout style;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 1rem;
	position: relative;
	overflow: hidden;
	margin: 0.5rem;
	border-radius: var(--radius);
	background-color: var(--surface-nested);
	color: var(--c-text);

	&:hover .operations,
	&:focus-within .operations {
		opacity: 1;
	}

	&.has-cover {
		min-height: 0;
		max-height: none;
		aspect-ratio: 2 / 1;
		color: white;
		transition: font-size 0.2s;

		.post-info {
			filter: drop-shadow(0 1px 2px #000);
		}

		.post-title {
			background-image: linear-gradient(transparent, #0003, #0005);
			text-shadow: var(--text-shadow-black);

			&.text-story {
				text-align: center;
			}
		}
	}

	// Mobile keeps the overlay structure while using the same fixed cover ratio.
	// 放在桌面规则之后，确保等特异性下覆盖生效
	@media (max-width: $breakpoint-mobile) {
		// Keep the rounded card below the fixed top bar.
		margin: 0.75rem 0.5rem 0.5rem;

		&.has-cover {
			max-height: none;
			aspect-ratio: 2 / 1;

			.post-cover {
				> :deep(img) {
					display: block;
				}
			}

			// Keep title and metadata over the cover without changing its height.
			.post-nav {
				position: absolute;
				inset-block-start: 0;
				inset-inline: 0;
			}

			.post-title {
				position: absolute;
				inset-block-end: 0;
				inset-inline: 0;
			}
		}
	}
}

.operations {
	position: absolute;
	opacity: 0;
	inset-inline-end: 1em;
	color: var(--c-text-1);
	transition: opacity 0.2s;
	z-index: 1;
}

.post-cover {
	position: absolute;
	inset: 0;

	> :deep(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.post-title {
	overflow: auto;
	max-height: calc(100% - 4.5rem);
	padding: 0.8em 1rem;
	font-size: var(--fs-h1);
	line-height: 1.2;
	z-index: 1;
}

.post-nav {
	padding: 0.8em 1rem;
	font-size: 0.8em;

	.post-info {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5em 1.2em;
		column-gap: clamp(1em, 3%, 1.5em);
	}
}
</style>
