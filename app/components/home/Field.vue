<script setup lang="ts">
withDefaults(defineProps<{
	label?: string
	labelTag?: string
}>(), {
	labelTag: 'h2',
})
</script>

<template>
<section class="z-field">
	<component :is="labelTag" class="z-field-label">
		<slot name="label">
			{{ label }}
		</slot>
	</component>
	<div class="z-field-content">
		<slot />
	</div>
</section>
</template>

<style lang="scss" scoped>
.z-field {
	display: grid;
	grid-template-columns: 120px minmax(0, 1fr);
	gap: 1rem 1.5rem;
	margin: 3em 0.5rem 1em;

	> .z-field-label {
		font-size: var(--fs-h3);
		font-weight: 700;
		line-height: var(--lh-tight);
		text-align: end;
	}

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;

		> .z-field-label {
			text-align: start;
		}
	}
}

.z-field-content {
	min-width: 0;

	:deep(p) {
		line-height: var(--lh-body);

		+ p {
			margin-top: var(--sp-2);
		}
	}
}
</style>
