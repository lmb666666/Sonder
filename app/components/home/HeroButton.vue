<script setup lang="ts">
import { UtilLink } from '#components'

export interface ButtonProps {
	icon?: string
	text?: string
	to?: string
	desc?: string
	primary?: boolean
}
defineProps<ButtonProps>()
</script>

<template>
<component :is="to ? UtilLink : 'button'" :to class="button" :class="{ primary }">
	<div class="button-main">
		<Icon v-if="icon" :name="icon" />
		<slot>{{ text }}</slot>
	</div>
	<div v-if="desc" class="button-desc">
		{{ desc }}
	</div>
</component>
</template>

<style lang="scss" scoped>
.button {
	display: inline-flex;
	align-items: center;
	padding: 0.45em 1.1em;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-full);
	background-color: var(--c-bg-1);
	font-weight: 500;
	line-height: 1.4;
	color: var(--c-text-1);
	transition: color 0.1s, background-color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
	cursor: pointer;

	&:hover {
		border-color: var(--c-primary-soft);
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}

	&:active {
		transform: translateY(0);
		filter: contrast(0.92);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	&:disabled {
		border-color: transparent;
		background-color: var(--c-bg-2);
		color: var(--c-text-3);
		cursor: not-allowed;
	}

	&.primary {
		border-color: transparent;
		box-shadow: var(--shadow-card);
		background-color: var(--c-primary);
		color: var(--c-bg);

		&:hover {
			box-shadow: var(--shadow-nav);
			background-color: var(--c-primary);
			color: var(--c-bg);
			transform: translateY(-2px);
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	.button {
		transition: color 0.1s, background-color 0.2s;

		&.primary:hover {
			transform: none;
		}
	}
}

.button-main {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.35em;
}

.button-desc {
	font-size: 0.75em;
	text-align: center;
	color: var(--c-text-2);
}
</style>
