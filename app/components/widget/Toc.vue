<script setup lang="ts">
import type { Toc, TocLink } from '@nuxt/content'

const props = defineProps<{
	static?: boolean
	toc?: Toc
	activeHeadingId?: MaybeRefOrGetter<string | undefined>
}>()

const commentsEnabled = useAppConfig().features.comments.enabled

const [DefineTemplate, ReuseTemplate] = createReusableTemplate({
	props: {
		tocTree: { type: Array as PropType<TocLink[]> },
	},
})

const { toc: articleToc } = useArticle()
const toc = computed(() => props.toc ?? articleToc.value)
const open = ref(false)
const buttonEl = useTemplateRef('toc-button')
const panelEl = useTemplateRef('toc-panel')
const activeHeading = props.activeHeadingId !== undefined
	? () => toValue(props.activeHeadingId)
	: inject<MaybeRefOrGetter<string | undefined>>('article-active-heading-id')
const { activeHeadingId, scrollToActiveTocItem } = useToc(toc, {
	scrollableEl: computed(() => panelEl.value),
	activeHeadingId: activeHeading,
})

function closeToc() {
	open.value = false
}

watch([open, activeHeadingId], async ([isOpen]) => {
	if (!props.static && !isOpen)
		return
	await nextTick()
	scrollToActiveTocItem()
}, { flush: 'post' })

onMounted(() => {
	if (props.static)
		scrollToActiveTocItem()
})

useEventListener('keydown', (e) => {
	if (open.value && e.key === 'Escape') {
		e.preventDefault()
		closeToc()
	}
})

useEventListener('click', (e) => {
	if (!open.value)
		return

	const target = e.target as Node
	if (buttonEl.value?.contains(target) || panelEl.value?.contains(target))
		return

	closeToc()
})

function hasHeading(tocTree: TocLink, heading?: string): boolean {
	return tocTree.id === heading || !!tocTree.children?.some(child => hasHeading(child, heading))
}
</script>

<template>
<div class="toc-float" :class="{ 'toc-static': props.static }">
	<button
		v-if="!props.static"
		ref="toc-button"
		class="toc-button card upraise"
		type="button"
		:aria-expanded="open"
		aria-controls="article-toc-panel-float"
		aria-label="文章目录"
		@click.stop="open = !open"
	>
		<Icon name="tabler:list-tree" />
	</button>

	<Transition name="toc-pop">
		<div
			v-if="props.static || open"
			:id="props.static ? 'article-toc-panel-static' : 'article-toc-panel-float'"
			class="toc-popover card"
		>
			<header class="toc-header">
				<h2>文章目录</h2>

				<nav aria-label="文章操作">
					<!-- use <a> for anchor -->
					<a href="#main-content" aria-label="返回开头" @click="closeToc">
						<Icon name="tabler:arrow-bar-to-up" />
					</a>

					<a v-if="commentsEnabled" href="#twikoo" aria-label="评论区" @click="closeToc">
						<Icon name="tabler:message-dots" />
					</a>

					<button v-if="!props.static" type="button" aria-label="关闭目录" @click="closeToc">
						<Icon name="tabler:x" />
					</button>
				</nav>
			</header>

			<div ref="toc-panel" class="toc-body scrollcheck-y">
				<!-- 放在顶层会导致 Transition 失效 -->
				<DefineTemplate v-slot="{ tocTree }">
					<ol>
						<li
							v-for="(entry, index) in tocTree"
							:key="index"
							:class="{
								'has-active': hasHeading(entry, activeHeadingId),
								'active': entry.id === activeHeadingId,
							}"
						>
							<!-- 使用 <a> 确保键盘焦点切换 -->
							<a :href="`#${entry?.id}`" :title="entry.text" @click="closeToc">{{ entry.text }}</a>
							<ReuseTemplate v-if="entry.children" :toc-tree="entry.children" />
						</li>
					</ol>
				</DefineTemplate>

				<ReuseTemplate
					v-if="toc?.links.length"
					class="toc"
					:toc-tree="toc.links"
				/>
				<p v-else class="no-toc">
					暂无目录信息
				</p>
			</div>
		</div>
	</Transition>
</div>
</template>

<style lang="scss" scoped>
.toc-float {
	position: fixed;
	inset-inline-end: max(1rem, env(safe-area-inset-right));
	bottom: max(5rem, env(safe-area-inset-bottom));
	z-index: var(--z-index-popover);
}

.toc-static {
	position: static;
	width: 100%;

	.toc-popover {
		position: static;
		width: 100%;
		max-height: none;
		border: 0;
		box-shadow: none;
		background: transparent;
		backdrop-filter: none;
		transform: none;
	}

	.toc-header {
		padding-inline: 0.5rem;

		nav {
			display: flex;
		}
	}

	.toc-body {
		max-height: calc(100dvh - 8rem);
		padding-inline: 0;
	}
}

.toc-button {
	display: grid;
	place-items: center;
	width: 3rem;
	height: 3rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--box-shadow-1);
	background: var(--ld-bg-blur);
	backdrop-filter: blur(0.8rem);
	font-size: 1.35rem;
	color: var(--c-text);
	transition: background-color 0.2s, border-color 0.2s, color 0.2s;
	cursor: pointer;

	&:hover,
	&[aria-expanded="true"] {
		border-color: var(--c-primary-soft);
		background-color: var(--c-bg-a80);
		color: var(--c-primary);
	}
}

.toc-popover {
	position: absolute;
	overflow: hidden;
	inset-inline-end: 0;
	bottom: calc(100% + 0.75rem);
	width: min(24rem, calc(100vw - 2rem));
	max-height: min(70vh, 32rem);
	border: 1px solid var(--c-border);
	box-shadow: var(--box-shadow-1), var(--box-shadow-3);
	background: var(--ld-bg-blur);
	backdrop-filter: blur(1rem);
	transform-origin: bottom right;
}

.toc-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.75rem 0.9rem;
	border-bottom: 1px solid var(--c-border);

	h2 {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--c-text);
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	a,
	button {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 50%;
		background: transparent;
		font: inherit;
		color: var(--c-text-2);
		transition: all 0.2s;
		cursor: pointer;

		&:hover {
			background: var(--c-bg-soft);
			color: var(--c-text);
		}
	}
}

.toc-body {
	overflow: auto;
	max-height: calc(min(70vh, 32rem) - 3.6rem);
	padding: 0.7rem;
}

.toc {
	position: relative;

	&::before {
		content: "";
		position: absolute;
		inset: 0.3rem;
		width: 3px;
		border-radius: 1rem;
		background-color: var(--c-bg-soft);
	}
}

ol {
	padding-inline-start: 0.8rem;
}

li {
	opacity: 0.6;
	font-size: 0.94em;
	color: var(--c-text);
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.94;
	}

	&.has-active, &.active {
		opacity: 1;
		font-size: 1em;
	}

	&.active::before {
		content: "";
		position: absolute;
		inset-inline-start: 0.3rem;
		margin: 0.2rem 0;
		padding: 0.6rem 1.5px;
		border-radius: 1rem;
		background-color: var(--c-primary);
	}

	> a {
		display: block;
		overflow: hidden;
		padding: 0.2em 0.5em;
		border-radius: 0.5em;
		white-space: nowrap;
		text-overflow: ellipsis;
		transition: all 0.2s;

		&:hover {
			background-color: var(--c-bg-soft);
		}
	}
}

.no-toc {
	padding: 1em;
	text-align: center;
	color: var(--c-text-3);
}

.toc-pop-enter-active,
.toc-pop-leave-active {
	transition: opacity 0.18s, transform 0.18s;
}

.toc-pop-enter-from,
.toc-pop-leave-to {
	opacity: 0;
	transform: translateY(0.5rem) scale(0.97);
}
</style>
