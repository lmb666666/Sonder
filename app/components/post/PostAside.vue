<script setup lang="ts">
import type { Toc } from '@nuxt/content'

const props = defineProps<{
	toc?: Toc
	widgets?: WidgetName[]
}>()

const { widgets } = useWidgets(() => props.widgets ?? [])
</script>

<template>
<aside class="post-aside" aria-label="文章导航">
	<WidgetToc class="post-toc" static :toc />

	<TransitionGroup v-if="widgets.length" name="float-in" tag="div" class="post-widgets">
		<component :is="widget.comp" v-for="widget in widgets" :key="widget.name" />
	</TransitionGroup>
</aside>
</template>

<style lang="scss" scoped>
.post-aside {
	align-self: start;
	position: sticky;
	overflow: auto;
	top: 1rem;
	min-width: 0;
	max-height: calc(100dvh - 2rem);
	padding: 0.5rem 0;
	overscroll-behavior: contain;
	scrollbar-width: thin;
}

.post-widgets {
	margin-top: 1rem;
	padding-top: 0.75rem;
	border-top: 1px solid var(--c-border);
	font-size: 0.82em;
	color: var(--c-text-2);

	:deep(.widget-header) {
		padding: 0.35rem 0.25rem;
		font-size: 0.92em;
	}

	:deep(.widget-body.widget-card) {
		padding: 0.35rem 0.25rem;
		border-radius: 0;
		background-color: transparent;
	}

	:deep(.blog-widget + .blog-widget) {
		margin-top: 0.75rem;
	}
}

@media (max-width: $breakpoint-widescreen) {
	.post-aside {
		display: none;
	}
}
</style>
