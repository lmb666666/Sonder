<script setup lang="ts">
import type { HobbyGroup, HobbyItem } from '~/types/hobby'
import { formatHobbyRating, getHobbyItemKey, getHobbySubline } from '#shared/utils/hobby'

defineProps<{
	group: HobbyGroup
}>()

function meta(item: HobbyItem) {
	return [item.year, item.progress, item.status].filter(Boolean).join(' · ')
}
</script>

<template>
<div class="hobby-list">
	<article
		v-for="(item, index) in group.items"
		:key="`${getHobbyItemKey(item)}-${index}`"
		class="list-row"
		:style="getFixedDelay(index * 0.03)"
	>
		<div class="list-cover">
			<HobbyCover :src="item.cover" :title="item.title" :icon="group.icon" />
		</div>

		<div class="list-main">
			<h3 class="list-title text-creative">
				{{ item.title }}
			</h3>
			<p v-if="getHobbySubline(item)" class="list-subline">
				{{ getHobbySubline(item) }}
			</p>
			<p v-if="item.note" class="list-note">
				{{ item.note }}
			</p>
		</div>

		<div class="list-meta">
			<span v-if="item.rating" class="list-rating">
				<Icon name="tabler:star-filled" aria-hidden="true" />
				{{ formatHobbyRating(item.rating) }}
			</span>
			<span v-if="meta(item)" class="list-meta-text">{{ meta(item) }}</span>
		</div>

		<UtilLink
			v-if="item.link"
			class="list-link"
			:to="item.link"
			:aria-label="`${item.title}${item.creator ? `，${item.creator}` : ''}`"
		/>
	</article>
</div>
</template>

<style lang="scss" scoped>
.hobby-list {
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background: var(--surface-card);
}

.list-row {
	display: grid;
	grid-template-columns: 2.5rem minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.9rem;
	position: relative;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--c-border);
	transition: background-color 0.2s;
	animation: float-in 0.2s var(--delay, 0s) backwards;

	&:last-child {
		border-bottom: 0;
	}

	&:hover {
		background: var(--c-bg-2);

		.list-title {
			color: var(--c-primary);
		}
	}

	&:focus-within {
		background: var(--c-bg-2);
	}
}

.list-cover {
	overflow: hidden;
	width: 2.5rem;
	aspect-ratio: 3 / 4;
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow-card);
}

.list-main {
	min-width: 0;
}

.list-title {
	overflow: hidden;
	font-size: 0.95rem;
	font-weight: 650;
	line-height: 1.35;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
	transition: color 0.2s;
}

.list-subline {
	overflow: hidden;
	margin-top: 0.1rem;
	font-size: 0.72rem;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}

.list-note {
	overflow: hidden;
	margin-top: 0.2rem;
	font-size: 0.78rem;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-2);
}

.list-meta {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	font-family: var(--font-monospace);
	font-size: 0.68rem;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	color: var(--c-text-3);
}

.list-rating {
	display: inline-flex;
	align-items: center;
	gap: 0.15rem;

	.iconify {
		font-size: 0.7rem;
	}
}

.list-link {
	position: absolute;
	inset: 0;
	z-index: 2;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: -2px;
	}
}

@media (max-width: $breakpoint-mobile) {
	.list-row {
		grid-template-areas:
			"cover main"
			".     meta";
		grid-template-columns: 2.2rem minmax(0, 1fr);
		gap: 0.3rem 0.7rem;
		padding: 0.7rem 0.8rem;
	}

	.list-cover {
		grid-area: cover;
		width: 2.2rem;
	}

	.list-main {
		grid-area: main;
	}

	.list-meta {
		grid-area: meta;
		justify-content: flex-start;
	}

	.list-note {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		white-space: normal;
		-webkit-box-orient: vertical;
	}
}

@media (prefers-reduced-motion: reduce) {
	.list-row {
		animation: none;
	}
}
</style>
