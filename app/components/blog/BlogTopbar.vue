<script setup lang="ts">
const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
</script>

<template>
<header id="blog-topbar" class="mobile-only">
	<UtilLink to="/" class="topbar-brand">
		<NuxtImg :src="appConfig.header.logo" class="topbar-avatar" alt="" />
		<span class="topbar-title">{{ appConfig.title }}</span>
	</UtilLink>

	<div class="topbar-actions">
		<button
			v-if="appConfig.features.search.enabled"
			class="topbar-btn"
			:class="{ active: layoutStore.state === 'search' }"
			aria-label="搜索"
			@click="layoutStore.toggle('search')"
		>
			<Icon name="tabler:search" />
		</button>

		<button
			class="topbar-btn"
			:class="{ active: layoutStore.state === 'sidebar' }"
			aria-label="切换菜单"
			:aria-expanded="layoutStore.state === 'sidebar'"
			aria-controls="blog-sidebar"
			@click="layoutStore.toggle('sidebar')"
		>
			<Icon class="rtl-flip" :name="layoutStore.state === 'sidebar' ? 'tabler:x' : 'tabler:menu-2'" />
		</button>
	</div>
</header>
</template>

<style lang="scss" scoped>
#blog-topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--sp-2);
	position: fixed;
	inset-block-start: calc(env(safe-area-inset-top) + 0.75rem);
	inset-inline: 0.75rem;

	// 内容区高 3.5rem（box-sizing: border-box 全局生效）
	height: 3.5rem;
	padding-inline: var(--sp-3);
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background-color: var(--c-bg-a80);
	-webkit-backdrop-filter: blur(0.5rem); /* stylelint-disable-line property-no-vendor-prefix */
	backdrop-filter: blur(0.5rem);

	// 低于 --z-index-popover(100)，让抽屉与遮罩盖在其上
	z-index: 90;
}

.topbar-brand {
	display: inline-flex;
	align-items: center;
	gap: var(--sp-2);
	min-width: 0;
	min-height: 2.75rem;
	color: var(--c-text);
	user-select: none;

	&:hover .topbar-title {
		color: var(--c-primary);
	}
}

.topbar-avatar {
	flex-shrink: 0;
	width: 2rem;
	height: 2rem;
	border-radius: var(--radius-full);
	box-shadow: var(--shadow-card);
	object-fit: cover;
}

.topbar-title {
	overflow: hidden;
	font-family: var(--font-creative);
	font-size: 1.15rem;
	font-weight: 700;
	letter-spacing: 0.01em;
	line-height: 1;
	white-space: nowrap;
	text-overflow: ellipsis;
	transition: color 0.2s;
}

.topbar-actions {
	display: flex;
	align-items: center;
	gap: var(--sp-2);
}

.topbar-btn {
	display: flex;
	align-items: center;
	justify-content: center;

	// 保证移动端可点击热区 ≥ 44px（a11y）
	min-width: 2.75rem;
	min-height: 2.75rem;
	border-radius: var(--radius-full);
	font-size: 1.5rem;
	color: var(--c-text-2);
	transition: background-color 0.2s, color 0.2s;

	> .iconify {
		transition: transform 0.2s ease;
	}

	&:hover {
		background-color: var(--c-bg-soft);
		color: var(--c-primary);
	}

	&:active > .iconify {
		transform: scale(0.85);
	}

	&.active {
		background-color: var(--ld-bg-active);
		color: var(--c-primary);
	}
}

// 尊重用户的减少动效偏好，关闭缩放过渡
@media (prefers-reduced-motion: reduce) {
	.topbar-btn > .iconify {
		transition: none;
	}

	.topbar-btn:active > .iconify {
		transform: none;
	}
}
</style>
