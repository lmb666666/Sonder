<script setup lang="ts">
import type { HobbyGroup } from '~/types/hobby'
import { getHobbyItemKey } from '#shared/utils/hobby'

defineProps<{
	group: HobbyGroup
}>()
</script>

<template>
<div class="hobby-grid">
	<HobbyCard
		v-for="(item, index) in group.items"
		:key="`${getHobbyItemKey(item)}-${index}`"
		:item="item"
		:icon="group.icon"
		:style="getFixedDelay(index * 0.04)"
	/>
</div>
</template>

<style lang="scss" scoped>
.hobby-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, var(--hobby-card-width, 12rem));
	justify-content: start;
	gap: var(--sp-3);
}

@media (max-width: $breakpoint-mobile) {
	.hobby-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
}
</style>
