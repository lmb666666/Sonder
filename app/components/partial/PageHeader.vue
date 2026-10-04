<script setup lang="ts">
defineProps<{
	icon: string
	title: string
	description: string
	background?: string
}>()
</script>

<template>
<header class="page-header card gradient-card" :class="{ 'has-bg': background }">
	<div v-if="background" class="page-header-bg" :style="{ backgroundImage: `url(${background})` }" />
	<div v-if="background" class="page-header-mask" />

	<div class="page-header-inner">
		<div class="page-header-top">
			<div class="page-header-icon">
				<Icon :name="icon" />
			</div>
			<h1 class="page-header-title text-creative">
				{{ title }}
			</h1>
		</div>

		<div v-if="$slots.stats" class="page-header-stats">
			<slot name="stats" />
		</div>

		<div class="page-header-bottom">
			<p class="page-header-desc">
				{{ description }}
			</p>
			<div v-if="$slots.powered" class="page-header-powered">
				<slot name="powered" />
			</div>
		</div>
	</div>
</header>
</template>

<style lang="scss" scoped>
.page-header {
	position: relative;
	overflow: hidden;
	margin-bottom: 1rem;

	// 底部 padding 收紧，使描述/来源行贴近卡片底边
	padding: 1.5rem 1.5rem 0.7rem;
	animation: float-in 0.4s ease both;
}

.page-header-bg {
	position: absolute;
	inset: 0;
	background: center / cover no-repeat;
	z-index: 0;
}

.page-header-mask {
	position: absolute;
	inset: 0;
	background: rgb(0 0 0 / 35%);
	z-index: 0;
}

// 三段式纵向布局：顶部(图标+标题) / 中部(居中统计) / 底部(左描述 右来源)
// min-height 统一各页面高度，使统计数量不同的页面外观一致
.page-header-inner {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 0.9rem;
	position: relative;
	min-height: 7rem;
	z-index: 1;
}

.page-header-top {
	display: flex;
	align-items: center;
	gap: 0.8rem;
	min-width: 0;
}

.page-header-icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: var(--radius-sm);
	background: var(--c-primary);
	font-size: 1.3rem;
	color: var(--c-bg-1);
}

.page-header-title {
	overflow: hidden;
	font-size: var(--fs-h1);
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
}

// 统计数据水平居中于头部中部
.page-header-stats {
	display: flex;
	align-items: center;
	justify-content: center;
}

// stats 内部为固定 rem，且各页面 .X-stat 规则特异性为 (0,2,1)；
// 此处多加一层 .page-header-inner 提升至 (0,3,1)，稳定放大三个页面的数字/单位/图标
.page-header-inner .page-header-stats {
	:deep(strong) {
		font-size: 2.2rem;
	}

	:deep(span) {
		font-size: 1rem;
	}

	:deep(.iconify) {
		font-size: 1.15rem;
	}
}

.page-header-bottom {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.5rem 1rem;

	// 分隔线，将上方区域与底部描述/来源行区隔
	padding-top: 0.5rem;
	border-top: 1px solid var(--c-border);
}

.page-header-desc {
	min-width: 0;
	font-size: 0.85rem;
	color: var(--c-text-3);
}

.page-header-powered {
	flex-shrink: 0;
	opacity: 0.5;
	font-size: 0.6rem;
	white-space: nowrap;
	color: var(--c-text-3);
}

.has-bg {
	padding: 1.5rem;

	.page-header-inner {
		min-height: clamp(11.5rem, 20vw, 16rem);
	}

	.page-header-icon {
		background: rgb(255 255 255 / 25%);
		color: #FFF;
	}

	.page-header-title {
		text-shadow: 0 1px 3px rgb(0 0 0 / 30%);
		color: #FFF;
	}

	.page-header-desc {
		color: rgb(255 255 255 / 80%);
	}

	.page-header-powered {
		color: rgb(255 255 255 / 70%);
	}

	.page-header-bottom {
		border-top-color: rgb(255 255 255 / 15%);
	}

	:deep(.page-header-stats) {
		strong { color: #FFF; }
		span { color: rgb(255 255 255 / 85%); }
	}
}

@media (max-width: $breakpoint-phone) {
	.page-header {
		padding: var(--sp-4) var(--sp-4) var(--sp-3);
	}

	.has-bg .page-header-inner {
		min-height: 9rem;
	}

	.page-header-inner {
		gap: 0.7rem;
		min-height: 5.5rem;
	}

	// 手机端统计适当收敛，避免在更矮的头部中过大（同样提升特异性覆盖各页面规则）
	.page-header-inner .page-header-stats {
		:deep(strong) {
			font-size: 1.7rem;
		}

		:deep(span) {
			font-size: 0.9rem;
		}
	}

	// 底部空间不足时，来源换行到描述下方，仍保持左对齐清爽
	.page-header-bottom {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.3rem;
	}
}
</style>
