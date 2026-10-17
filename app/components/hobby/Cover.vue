<script setup lang="ts">
const props = withDefaults(defineProps<{
	src?: string
	title: string
	icon?: string
	shape?: 'poster' | 'square'
	fill?: boolean
}>(), {
	icon: 'tabler:photo',
	shape: 'poster',
	fill: false,
})

const coverError = ref(false)

watch(() => props.src, () => {
	coverError.value = false
})
</script>

<template>
<div
	class="hobby-cover"
	:class="{ 'is-fill': fill }"
	:style="{ '--cover-aspect': shape === 'square' ? '1 / 1' : '3 / 4' }"
>
	<div class="hobby-cover-fallback" aria-hidden="true">
		<Icon :name="icon" />
	</div>
	<img
		v-if="src && !coverError"
		:src="src"
		:alt="title"
		loading="lazy"
		decoding="async"
		referrerpolicy="no-referrer"
		@error="coverError = true"
	>
</div>
</template>

<style lang="scss" scoped>
.hobby-cover {
	container-type: inline-size;
	position: relative;
	overflow: hidden;
	width: 100%;
	aspect-ratio: var(--cover-aspect, 3 / 4);
	background: linear-gradient(155deg, var(--c-bg-2), var(--c-bg-3));

	&.is-fill {
		position: absolute;
		inset: 0;
		height: 100%;
		aspect-ratio: auto;
	}

	img {
		display: block;
		position: relative;
		width: 100%;
		height: 100%;
		transition: transform 0.35s ease;
		object-fit: cover;
		z-index: 1;
	}
}

.hobby-cover-fallback {
	display: grid;
	place-items: center;
	position: absolute;
	opacity: 0.4;
	inset: 0;
	font-size: clamp(1rem, 16cqw, 2.2rem);
	color: var(--c-text-3);
	z-index: 0;
}

@media (prefers-reduced-motion: reduce) {
	.hobby-cover img {
		transition: none;
	}
}
</style>
