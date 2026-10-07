<script setup lang="ts">
import type { ArticleOrderType } from '~/types/article'

defineProps<{
	categories?: (string | undefined)[]
	secretDelay?: string
}>()

const orderMap: Record<ArticleOrderType, string> = {
	date: '创建日期',
	updated: '更新日期',
}

const category = defineModel<string>('category')
const sortOrder = defineModel<ArticleOrderType>('sortOrder', { default: 'date' })
const isAscending = defineModel<boolean>('isAscending')

function toggleOrder() {
	const orderKeys = Object.keys(orderMap) as ArticleOrderType[]
	sortOrder.value = orderKeys[(orderKeys.indexOf(sortOrder.value) + 1) % orderKeys.length] || 'date'
}

function toggleDirection() {
	isAscending.value = !isAscending.value
}
</script>

<template>
<div class="order-toggle" :style="{ '--secret-delay': secretDelay }">
	<slot />

	<ZDropdown trigger="focusin" tabindex="0">
		<button :disabled="!categories">
			<Icon :name="getCategoryIcon(category)" />
			<span class="order-text">{{ category ?? '全部分类' }}</span>
		</button>

		<template #content="{ hide }">
			<button :class="{ active: !category }" @click="hide(), category = undefined">
				<Icon :name="getCategoryIcon()" />
				<span>全部分类</span>
			</button>

			<button v-for="item in categories" :key="item" :class="{ active: item === category }" @click="hide(), category = item">
				<Icon :name="getCategoryIcon(item)" />
				<span>{{ item }}</span>
			</button>
		</template>
	</ZDropdown>

	<span class="sort-controls">
		<button :aria-label="isAscending ? '切换为降序' : '切换为升序'" @click="toggleDirection">
			<Icon name="tabler:arrows-sort" class="toggle-direction" :class="{ ascending: isAscending }" />
			<span class="order-text">{{ isAscending ? '升序' : '降序' }}</span>
		</button>

		<button aria-label="切换排序字段" @click="toggleOrder">
			<Icon name="tabler:sort-descending" />
			<span class="order-text">{{ orderMap[sortOrder] || sortOrder }}</span>
		</button>
	</span>
</div>
</template>

<style lang="scss" scoped>
.order-toggle {
	// 无占位内容时按钮整体靠右，与博客页占位容器 auto margin 撑出的效果一致
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.35rem;
	color: var(--c-text-2);

	// 分类按钮与右侧两个按钮统一为 flex 布局，消除行内基线造成的垂直错位
	.dropdown {
		display: flex;
	}

	:deep(button), :deep(a) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		white-space: nowrap;
		color: inherit;
		transition: color 0.2s;

		&:hover {
			color: var(--c-primary);
		}
	}

	.sort-controls {
		display: inline-flex;
		align-items: center;
		gap: inherit;
	}

	.toggle-direction {
		display: inline-block;
		transition: transform 0.2s;

		&.ascending {
			transform: scaleY(-1);
		}
	}
}

:deep(.secret-container) {
	margin-inline-end: auto;
}
</style>
