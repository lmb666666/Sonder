<script setup lang="ts">
import type { HobbyGroup } from '~/types/hobby'
import { getHobbyItemKey } from '#shared/utils/hobby'

defineProps<{
	group: HobbyGroup
}>()

const track = useTemplateRef<HTMLElement>('track')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

const overflowing = ref(false)
const canPrev = ref(false)
const canNext = ref(false)

function updateEdges() {
	const el = track.value
	if (!el)
		return
	overflowing.value = el.scrollWidth > el.clientWidth + 2
	canPrev.value = el.scrollLeft > 2
	canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}

function scrollShelf(direction: 1 | -1) {
	const el = track.value
	if (!el)
		return
	el.scrollBy({
		left: direction * el.clientWidth * 0.8,
		behavior: reducedMotion.value ? 'auto' : 'smooth',
	})
}

useEventListener(track, 'scroll', updateEdges, { passive: true })
useResizeObserver(track, updateEdges)

onMounted(() => {
	nextTick(updateEdges)
})
</script>

<template>
<div class="hobby-shelf">
	<div
		ref="track"
		class="shelf-track scrollcheck-x scrollbar-hidden"
		tabindex="0"
		role="region"
		:aria-label="`${group.name}列表`"
	>
		<HobbyCard
			v-for="(item, index) in group.items"
			:key="`${getHobbyItemKey(item)}-${index}`"
			:item="item"
			:icon="group.icon"
			:style="getFixedDelay(index * 0.04)"
			class="shelf-item"
		/>
	</div>

	<template v-if="overflowing">
		<button
			class="shelf-nav prev mobile-hidden"
			type="button"
			aria-label="向左滚动"
			:disabled="!canPrev"
			@click="scrollShelf(-1)"
		>
			<Icon name="tabler:chevron-left" />
		</button>
		<button
			class="shelf-nav next mobile-hidden"
			type="button"
			aria-label="向右滚动"
			:disabled="!canNext"
			@click="scrollShelf(1)"
		>
			<Icon name="tabler:chevron-right" />
		</button>
	</template>
</div>
</template>

<style lang="scss" scoped>
.hobby-shelf {
	--shelf-card-width: var(--hobby-card-width, 12rem);

	position: relative;
}

.shelf-track {
	display: flex;
	gap: var(--sp-3);
	overflow-x: auto;
	padding: 0.2rem 0.15rem 0.7rem;
	scroll-padding-inline: 0.15rem;
	scroll-snap-type: x proximity;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.shelf-item {
	flex: 0 0 var(--shelf-card-width);
	width: var(--shelf-card-width);
	scroll-snap-align: start;
}

.shelf-nav {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	top: calc(var(--shelf-card-width) * 0.75);
	width: 2rem;
	height: 2rem;
	padding: 0;
	border: 1px solid var(--c-border);
	border-radius: 50%;
	box-shadow: var(--shadow-card);
	background: var(--c-bg-a80);
	backdrop-filter: blur(8px);
	font-size: 1.05rem;
	color: var(--c-text-2);
	transform: translateY(-50%);
	transition: color 0.2s, border-color 0.2s, opacity 0.2s;
	cursor: pointer;
	z-index: 4;

	&:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--c-primary) 55%, var(--c-border));
		color: var(--c-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	&:disabled {
		opacity: 0.3;
		cursor: default;
	}

	&.prev {
		left: -0.75rem;
	}

	&.next {
		right: -0.75rem;
	}
}

@media (max-width: $breakpoint-mobile) {
	.shelf-track {
		gap: 0.65rem;
	}
}
</style>
