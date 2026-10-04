<template>
<NuxtLoadingIndicator />
<NuxtRouteAnnouncer :style="{ position: 'absolute' }" />
<BlogSkipToContent />
<BlogTopbar />
<BlogSidebar />
<div id="content">
	<main id="main-content">
		<NuxtPage />
		<BlogFooter />
	</main>
</div>
<BikariyaModals />
</template>

<!-- eslint-disable-next-line vue/enforce-style-attribute -->
<style lang="scss">
#blog-root {
	display: flex;
	justify-content: center;
	gap: 1rem;
	min-width: 0;
}

#blog-sidebar {
	flex: 0 0 280px; // 防止搜索框 grow
	position: sticky;
	top: 0;
	height: 100vh;
	height: 100dvh;
	min-width: 0; // 防止搜索框撑开页面
	scrollbar-width: thin;

	@media (max-width: $breakpoint-widescreen) {
		flex-shrink: 0.2;
	}
}

#content {
	// 若设置的是 max-width，则内部 main 宽度为 fit-content，可能无法撑满
	// 此时即使设置 flex-grow，也会影响 #sidebar 无法正确 shrink
	width: $breakpoint-widescreen;
	min-width: 0; // 解决父级 flexbox 设置 justify-content: center 时溢出左侧消失的问题

	@media (max-width: $breakpoint-mobile) {
		// 避让悬浮顶栏 BlogTopbar（safe-area + 0.75rem 上边距 + 3.5rem 高 + 0.5rem 下间隙）
		padding-top: calc(3.5rem + env(safe-area-inset-top) + 1.25rem);
	}

	// 此处不建议给内容设置 padding
	> #main-content {
		flex-grow: 1; // 使较小宽度的内容占满

		// overflow: hidden; // 会使一部分元素吸顶失效

		// 使内容正确计算宽度而不横向溢出
		// 也可设置 width: 0 或者 contain: inline-size（兼容性不佳）
		min-width: 0;
	}
}
</style>
