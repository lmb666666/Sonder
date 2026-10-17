<script setup lang="ts">
import type { HobbyItem } from '~/types/hobby'
import { formatHobbyRating, getHobbySubline } from '#shared/utils/hobby'

const props = withDefaults(defineProps<{
	item: HobbyItem
	icon?: string
}>(), {
	icon: 'tabler:photo',
})

const rating = computed(() => formatHobbyRating(props.item.rating))
const subline = computed(() => getHobbySubline(props.item))
const meta = computed(() => {
	const detail = props.item.progress || props.item.status
	return [props.item.year, detail].filter(Boolean).join(' · ')
})
</script>

<template>
<article class="hobby-card">
	<HobbyCover :src="item.cover" :title="item.title" :icon="icon" fill />

	<div class="hobby-card-panel">
		<div class="hobby-card-heading">
			<h3 class="hobby-card-title text-creative">
				{{ item.title }}
			</h3>
			<span v-if="rating" class="hobby-card-rating">
				<Icon name="tabler:star-filled" aria-hidden="true" />
				{{ rating }}
			</span>
		</div>
		<p v-if="subline" class="hobby-card-subline">
			{{ subline }}
		</p>
		<p v-if="meta" class="hobby-card-meta">
			{{ meta }}
		</p>
	</div>

	<UtilLink
		v-if="item.link"
		class="hobby-card-link"
		:to="item.link"
		:aria-label="`${item.title}${item.creator ? `，${item.creator}` : ''}`"
	/>
</article>
</template>

<style lang="scss" scoped>
.hobby-card {
	position: relative;
	overflow: hidden;
	aspect-ratio: 2 / 3;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background: var(--c-bg-2);
	transition: border-color 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay, 0s) backwards;

	&:hover,
	&:focus-within {
		border-color: color-mix(in srgb, var(--c-primary) 55%, var(--c-border));
		box-shadow: var(--box-shadow-3);
	}

	&:hover :deep(img) {
		transform: scale(1.04);
	}
}

.hobby-card-panel {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	padding: 0.7rem 0.8rem 0.8rem;
	border-top: 1px solid color-mix(in srgb, var(--c-text-1) 10%, transparent);
	background:
		linear-gradient(135deg, rgb(255 255 255 / 10%), transparent 42%),
		color-mix(in srgb, var(--c-bg) 62%, transparent);
	backdrop-filter: blur(18px) saturate(140%);
	z-index: 1;
}

.hobby-card-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.5rem;
}

.hobby-card-title {
	display: -webkit-box;
	overflow: hidden;
	min-height: 2.7em;
	font-size: 1rem;
	font-weight: 650;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.35;
	color: var(--c-text-1);
	-webkit-box-orient: vertical;
}

.hobby-card-rating {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: 0.15rem;
	padding-top: 0.12rem;
	font-family: var(--font-monospace);
	font-size: 0.7rem;
	font-variant-numeric: tabular-nums;
	color: var(--c-text-2);

	.iconify {
		font-size: 0.72rem;
	}
}

.hobby-card-subline {
	overflow: hidden;
	margin-top: 0.2rem;
	font-size: 0.72rem;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-2);
}

.hobby-card-meta {
	overflow: hidden;
	margin-top: 0.12rem;
	font-family: var(--font-monospace);
	font-size: 0.68rem;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}

.hobby-card-link {
	position: absolute;
	inset: 0;
	border-radius: var(--radius);
	z-index: 2;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

@media (max-width: $breakpoint-mobile) {
	.hobby-card-title {
		min-height: 0;
		font-size: 0.95rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.hobby-card {
		animation: none;

		&:hover :deep(img) {
			transform: none;
		}
	}
}
</style>
