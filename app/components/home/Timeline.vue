<script setup lang="ts">
defineProps<{
	items: Array<{
		period: string
		title: string
		description: string
		current?: boolean
	}>
}>()
</script>

<template>
<div class="timeline">
	<div
		v-for="item in items"
		:key="`${item.period}-${item.title}`"
		class="timeline-item"
		:class="{ current: item.current }"
	>
		<span class="timeline-item-date">{{ item.period }}</span>
		<div class="timeline-item-content">
			<strong>{{ item.title }}</strong>
			<span>{{ item.description }}</span>
		</div>
	</div>
</div>
</template>

<style lang="scss" scoped>
.timeline {
	position: relative;
	width: 100%;
	padding-inline-start: 0.75rem;

	&::before {
		content: "";
		position: absolute;
		inset-block: 0.5em 0;
		inset-inline-start: 0;
		width: 2px;
		background-color: var(--c-border);
	}
}

.timeline-item {
	display: grid;
	grid-template-columns: 7rem minmax(0, 1fr);
	align-items: start;
	gap: 1rem;
	position: relative;
	padding: 0.55rem 0;

	&::before {
		content: "";
		position: absolute;
		inset-block-start: 0.9rem;
		inset-inline-start: -0.75rem;
		width: 0.5rem;
		height: 0.5rem;
		border: 2px solid var(--c-bg-1);
		border-radius: var(--radius-full);
		background-color: var(--c-primary);
		transform: translateX(-50%);
	}

	&.current::before {
		background-color: var(--c-primary);
	}
}

.timeline-item-date {
	font-size: var(--fs-xs);
	line-height: 1.5;
	color: var(--c-text-2);
}

.timeline-item-content {
	display: grid;
	gap: var(--sp-1);

	strong {
		font-size: var(--fs-sm);
		color: var(--c-text-1);
	}

	span {
		font-size: var(--fs-sm);
		line-height: 1.5;
		color: var(--c-text-2);
	}
}

@media (max-width: $breakpoint-phone) {
	.timeline-item {
		grid-template-columns: 1fr;
		gap: var(--sp-1);
	}
}
</style>
