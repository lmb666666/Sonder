<script setup lang="ts">
const appConfig = useAppConfig()
const feedEnabled = appConfig.feed.enabled
const opmlEnabled = appConfig.features.opml.enabled

const nav = computed(() => appConfig.footer.nav
	.map(group => ({
		...group,
		items: group.items.filter((item) => {
			if (item.url === '/atom.xml')
				return feedEnabled
			if (item.url === '/feeds.opml.xml')
				return opmlEnabled
			return true
		}),
	}))
	.filter(group => group.items.length))
</script>

<template>
<footer class="blog-footer">
	<nav class="footer-nav">
		<div v-for="(group, groupIndex) in nav" :key="groupIndex">
			<hgroup class="text-creative" v-text="group.title" />
			<menu>
				<li v-for="(item, itemIndex) in group.items" :key="itemIndex">
					<UtilLink :to="item.url">
						<img v-if="item.icon.startsWith('http')" :src="item.icon" alt="" aria-hidden="true" class="nav-icon">
						<Icon v-else :name="item.icon" aria-hidden="true" />
						<span class="nav-text">{{ item.text }}</span>
					</UtilLink>
				</li>
			</menu>
		</div>
	</nav>
	<p v-html="appConfig.footer.copyright" />
</footer>
</template>

<style lang="scss" scoped>
.blog-footer {
	margin: var(--sp-6) var(--sp-4);
	font-size: 0.9em;
	color: var(--c-text-2);

	.footer-nav {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: clamp(1rem, 4vw, 3rem);
		width: 100%;
		padding-block: 3rem;

		hgroup {
			margin: 0.5em 0;
		}

		a {
			display: flex;
			align-items: center;
			gap: 0.3em;
			width: fit-content;
			padding: 0.3em 0.5em;
			border-radius: 0.5em;
			font-size: 0.9em;
			transition: background-color 0.2s, color 0.1s;

			&:hover {
				background-color: var(--c-bg-soft);
				color: var(--c-text);
			}

			.nav-icon {
				width: 1em;
				height: 1em;
				object-fit: contain;
			}
		}
	}

	p {
		margin: 0.5em 0;
		text-align: end;
	}

	@media (max-width: $breakpoint-mobile) {
		.footer-nav {
			grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
			padding-block: 2rem;
		}

		p {
			text-align: start;
		}
	}
}
</style>
