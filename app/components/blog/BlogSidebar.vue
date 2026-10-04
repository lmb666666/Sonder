<script setup lang="ts">
const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
const searchStore = useSearchStore()
const { asideWidgets } = storeToRefs(layoutStore)
const { widgets } = useWidgets(asideWidgets)

const { text } = useTextSelection()
const debouncedSelection = refDebounced(text)

// 仅在移动布局（下拉面板形态）下同步 aria-hidden，避免桌面端侧边栏被误标记
const isMobileLayout = useMediaQuery('(max-width: 768px)')
</script>

<template>
<BlogMask
	:show="layoutStore.state === 'sidebar'"
	class="mobile-only"
	@click="layoutStore.close()"
/>

<!-- 半宽屏及以上始终静态显示，无法用 Transition 包裹；移动端下拉动画由下方 CSS class 过渡实现 -->
<aside id="blog-sidebar" :aria-hidden="layoutStore.state !== 'sidebar' && isMobileLayout ? 'true' : undefined" :class="{ show: layoutStore.state === 'sidebar' }">
	<BlogHeader class="sidebar-header" to="/" />

	<nav class="sidebar-nav scrollcheck-y">
		<div v-if="appConfig.features.search.enabled" class="search-btn sidebar-nav-item gradient-card" @click="layoutStore.toggle('search')">
			<Icon name="tabler:search" />
			<span class="nav-text">{{ debouncedSelection || searchStore.word || '搜索' }}</span>
			<Key class="keycut" code="K" cmd prevent @press="layoutStore.toggle('search')" />
		</div>

		<template v-for="(group, groupIndex) in appConfig.nav" :key="groupIndex">
			<h3 v-if="group.title">
				{{ group.title }}
			</h3>

			<menu>
				<li v-for="(item, itemIndex) in group.items" :key="itemIndex">
					<UtilLink :to="item.url" class="sidebar-nav-item">
						<Icon :name="item.icon" />
						<span class="nav-text">{{ item.text }}</span>
						<Icon v-if="isExtLink(item.url)" class="external-tip" name="tabler:arrow-up-right" />
					</UtilLink>
				</li>
			</menu>
		</template>
	</nav>

	<section v-if="appConfig.ui.sidebar.blogInfo.enabled || widgets.length" class="sidebar-widgets scrollcheck-y" aria-label="辅助信息">
		<WidgetBlogInfo v-if="appConfig.ui.sidebar.blogInfo.enabled" />

		<TransitionGroup name="float-in">
			<!-- 更换页面时相同 key 的组件不会更新 -->
			<component :is="widget.comp" v-for="widget in widgets" :key="widget.name" />
		</TransitionGroup>
	</section>

	<footer
		class="sidebar-footer"
	>
		<BlogThemeToggle v-if="appConfig.ui.sidebar.themeToggle" />
	</footer>
</aside>
</template>

<style lang="scss" scoped>
#blog-sidebar {
	display: flex;
	flex-direction: column;
	color: var(--c-text-2);

	&:hover {
		color: currentcolor;
	}

	@media (max-width: $breakpoint-mobile) {
		// 锚定于悬浮顶栏（safe-area + 0.75rem 上边距 + 3.5rem 高）下方 0.5rem 处，两侧与其对齐
		position: fixed;
		visibility: hidden;
		overflow: hidden;
		opacity: 0;
		inset-block-start: calc(env(safe-area-inset-top) + 4.75rem);
		inset-inline: 0.75rem;
		width: auto;
		max-height: calc(100dvh - env(safe-area-inset-top) - 5.5rem);
		border: 1px solid var(--c-border);
		border-radius: var(--radius);
		background-color: var(--c-bg-a80);
		-webkit-backdrop-filter: blur(0.75rem); /* stylelint-disable-line property-no-vendor-prefix */
		backdrop-filter: blur(0.75rem);
		color: currentcolor;
		transform: translateY(-0.5rem) scale(0.98);
		transition: transform 0.2s ease, opacity 0.2s ease, visibility 0s 0.2s;
		pointer-events: none;
		z-index: var(--z-index-popover);

		&.show {
			visibility: visible;
			opacity: 1;
			box-shadow: var(--shadow-float);
			transform: none;
			transition: transform 0.2s ease, opacity 0.2s ease;
			pointer-events: auto;
		}
	}
}

// 移动端下拉面板内样式见文件末尾的媒体查询块（需覆盖上方基础规则）

.sidebar-nav {
	flex: 1 1 auto;
	min-height: 0;
	padding: 0 5%;
	font-size: 0.9em;

	h3 {
		margin: 2em 0 1em 1em;
		font: inherit;
		color: var(--c-text-2);
	}

	li {
		margin: 0.5em 0;
	}
}

.sidebar-widgets {
	flex: 0 1 auto;
	max-height: min(42vh, 28rem);
	margin: 0 5%;
	padding: 0.75rem 0;
	border-top: 1px solid var(--c-border);
	font-size: 0.82em;
	color: var(--c-text-2);

	:deep(.blog-widget) {
		opacity: 1;
	}

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

	@media (max-width: $breakpoint-mobile) {
		max-height: none;
	}
}

.sidebar-nav-item {
	display: flex;
	align-items: center;
	gap: 0.5em;
	padding: 0.5em 1em;
	border-radius: var(--radius-sm);
	transition: all 0.2s;

	&:hover,
	&.router-link-active {
		background-color: var(--c-bg-soft);
		color: var(--c-text);
	}

	&.router-link-active::after {
		content: "⦁";
		width: 1em;
		text-align: center;
		color: var(--c-text-3);
	}

	> .iconify {
		font-size: 1.5em;
	}

	> .nav-text {
		flex-grow: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	> .external-tip {
		opacity: 0.5;
		font-size: 1em;
	}
}

.search-btn {
	opacity: 0.5;
	margin: 1rem 0;
	outline: 2px solid var(--c-border);
	outline-offset: -2px;
	cursor: text;
	user-select: none;

	&:hover {
		opacity: 1;
		outline-color: transparent;
		background-color: transparent;
	}
}

.sidebar-footer {
	--gap: clamp(0.5rem, 3vh, 1rem);

	display: grid;
	gap: var(--gap);
	padding: var(--gap);
	font-size: 0.8em;
	text-align: center;
	color: var(--c-text-2);
}

.float-in-leave-active {
	position: absolute;
}

// 移动端下拉面板内：隐藏品牌区（顶栏已有）与搜索胶囊（顶栏按钮为唯一入口），
// 面板贴合内容高度，导航与小组件各自滚动，footer 固定底部
// （置于文件末尾以覆盖上方基础规则）
@media (max-width: $breakpoint-mobile) {
	#blog-sidebar {
		// 覆盖 app.vue 全局 height: 100dvh，避免内容不足时底部留白
		height: auto;
	}

	// ID 前缀提升特异性：与 BlogHeader 的 .blog-header { display: flex } 同特异性时，
	// 生产 CSS 打包顺序不定会导致隐藏在真机上失效
	#blog-sidebar .sidebar-header {
		display: none;
	}

	.search-btn {
		display: none;
	}

	.sidebar-nav {
		flex: 0 1 auto;
		overflow-y: auto;
		min-height: 0;
		font-size: 1em;
		overscroll-behavior: contain;
	}

	.sidebar-widgets {
		flex: 0 1 auto;
		overflow-y: auto;
		min-height: 0;
		max-height: min(40vh, 20rem);
		overscroll-behavior: contain;
	}

	.sidebar-nav-item {
		padding: 0.65em 1em;

		// 触屏更明确的激活态：底色高亮取代 ⦁ 后缀
		&.router-link-active::after {
			content: none;
		}
	}
}
</style>
