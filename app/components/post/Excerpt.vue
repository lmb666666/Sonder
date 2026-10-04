<script setup lang="ts">
import { delay } from 'es-toolkit/promise'

const props = defineProps<{
	excerpt: string
}>()

const appConfig = useAppConfig()

const excerpt = ref(props.excerpt)
const caret = ref('')
const animationEnabled: boolean = appConfig.ui.excerpt?.animation ?? true

if (animationEnabled) {
	excerpt.value = ''
	onMounted(async () => {
		caret.value = appConfig.ui.excerpt?.caret ?? '_'
		for (const char of props.excerpt) {
			excerpt.value += char
			await delay(50)
		}
		caret.value = ''
	})
}

if (import.meta.dev) {
	watch(() => props.excerpt, (newExcerpt) => {
		excerpt.value = newExcerpt
	})
}
</script>

<template>
<div class="md-excerpt gradient-card">
	<span class="dynamic"><Icon name="tabler:sparkles-2" />{{ excerpt }}{{ caret }}</span>
	<span class="static"><Icon name="tabler:sparkles-2" />{{ props.excerpt }}</span>
</div>
</template>

<style lang="scss" scoped>
.md-excerpt {
	opacity: 0.6;
	margin: var(--sp-4) 0;
	padding: var(--sp-3);
	font-size: 0.9em;
	transition: opacity 0.2s;

	> .static {
		opacity: 0;
		pointer-events: none;
		user-select: none;
	}

	> .dynamic {
		position: absolute;
		width: calc(100% - 1rem);
	}

	.iconify {
		margin-inline-end: 0.3em;
	}

	&:hover {
		opacity: 1;
	}
}
</style>
