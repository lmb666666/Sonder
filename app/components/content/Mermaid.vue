<script setup lang="ts">
const props = defineProps<{ code: string }>()

const instanceId = useId()
const colorMode = useColorMode()
const diagram = useTemplateRef<HTMLElement>('diagram')
const status = ref<'loading' | 'ready' | 'error'>('loading')
let renderId = 0
let renderRequest = 0

async function renderDiagram() {
	if (!import.meta.client || !diagram.value)
		return

	const request = ++renderRequest
	status.value = 'loading'
	try {
		const mermaid = (await import('mermaid')).default
		if (request !== renderRequest)
			return

		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			theme: colorMode.value === 'dark' ? 'dark' : 'default',
		})
		const result = await mermaid.render(`mermaid-${instanceId}-${++renderId}`, props.code)
		if (request !== renderRequest)
			return

		diagram.value.innerHTML = result.svg
		status.value = 'ready'
	}
	catch (error) {
		if (request !== renderRequest)
			return

		console.error('[mermaid] Diagram rendering failed', error)
		status.value = 'error'
	}
}

onMounted(renderDiagram)
watch(() => [colorMode.value, props.code], renderDiagram)
</script>

<template>
<figure class="mermaid-figure">
	<div class="diagram-scroll" :aria-busy="status === 'loading'">
		<p v-if="status === 'loading'" class="diagram-status" role="status">
			正在加载图表…
		</p>
		<p v-else-if="status === 'error'" class="diagram-status" role="alert">
			图表无法渲染，请查看下方 Mermaid 源码。
		</p>
		<div ref="diagram" class="diagram" :class="{ rendered: status === 'ready' }" :aria-hidden="status !== 'ready'" />
	</div>
	<details class="source">
		<summary>查看 Mermaid 源码</summary>
		<pre><code>{{ code }}</code></pre>
	</details>
</figure>
</template>

<style lang="scss" scoped>
.mermaid-figure {
	max-width: 100%;
	margin: 1.5em 0;
	border: 1px solid var(--c-border);
	border-radius: 4px;
	background: var(--c-bg-2);
}

.diagram-scroll {
	overflow-x: auto;
	max-width: 100%;
	overscroll-behavior-inline: contain;
}

.diagram {
	width: max-content;
	min-width: 100%;
	padding: 1rem;
	text-align: center;

	&:not(.rendered) {
		position: absolute;
		overflow: hidden;
		width: 1px;
		height: 1px;
		clip-path: inset(50%);
	}

	:deep(svg) {
		display: block;
		height: auto;
		max-width: none;
		margin-inline: auto;
	}
}

.diagram-status {
	margin: 0;
	padding: 2rem 1rem;
	text-align: center;
	color: var(--c-text-2);
}

.source {
	border-top: 1px solid var(--c-border);
	font-size: 0.85em;

	> summary {
		padding: 0.65rem 1rem;
		color: var(--c-text-2);
		cursor: pointer;
	}

	> pre {
		overflow-x: auto;
		max-width: 100%;
		margin: 0;
		padding: 0 1rem 1rem;
		white-space: pre;
	}
}
</style>
