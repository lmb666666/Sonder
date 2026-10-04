<script setup lang="ts">
const route = useRoute()

const { data: surrounds } = await useAsyncData(
	`surround:${route.path}`,
	async () => (await queryCollectionItemSurroundings('content', route.path, { fields: ['date', 'title', 'type'] })
		.order('date', 'ASC')
		.where('stem', 'LIKE', 'posts/%')
		.where('draft', '=', false)).map(post => ({
		path: String(post.path),
		title: typeof post.title === 'string' ? post.title : undefined,
		type: typeof post.type === 'string' ? post.type : undefined,
		date: typeof post.date === 'string' ? post.date : undefined,
	})),
)

const [prev = null, next = null] = surrounds.value ?? []
const appConfig = useAppConfig()

const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
	post: NonNullable<typeof surrounds.value>[number] | null
	icon: string
	fallbackIcon: string
	fallbackText: string
	alignEnd?: boolean
}>({ inheritAttrs: false })
</script>

<template>
<DefineTemplate v-slot="{ post, icon, fallbackIcon, fallbackText, alignEnd }">
	<UtilLink :to="post?.path" class="surround-link" :align-end>
		<Icon :class="{ 'rtl-flip': post }" :name="post ? icon : fallbackIcon" />
		<div class="surround-text">
			<strong class="title" :class="getPostTypeClassName(post?.type)">
				{{ post?.title || fallbackText }}
			</strong>
			<UtilDate v-if="post?.date" class="date" :date="post.date" />
		</div>
	</UtilLink>
</DefineTemplate>

<div v-if="prev || next" class="surround-post" dir="ltr">
	<ReuseTemplate
		:post="next" icon="tabler:player-track-prev-filled"
		fallback-icon="line-md:coffee-twotone-loop" :fallback-text="appConfig.ui.article.surround.nextFallback"
	/>
	<ReuseTemplate
		:post="prev" icon="tabler:player-track-next-filled"
		fallback-icon="line-md:construction-twotone" :fallback-text="appConfig.ui.article.surround.prevFallback"
		align-end
	/>
</div>
</template>

<style lang="scss" scoped>
.surround-post {
	contain: layout;
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	margin: 3rem 1rem;
}

.surround-link {
	display: flex;
	align-items: center;
	gap: 0.5em;
	transition: color 0.2s;

	&:not([href]) {
		opacity: 0.4;
		user-select: none;
	}

	&[align-end] {
		// direction: rtl 会导致末尾标点居左
		flex-direction: row-reverse;
		margin-inline-start: auto;
		text-align: end;
	}

	> .surround-text {
		text-wrap: balance;
		transition: transform 0.2s;

		> .date {
			display: block;
			opacity: 0.6;
			font-size: 0.8rem;
		}
	}

	> .iconify {
		opacity: 0.5;
		font-size: 2rem;
		transition: transform 0.2s;
	}

	&[href]:hover {
		color: var(--c-primary);

		> .surround-text {
			transform: translateX(-1em);
		}

		&[align-end] > .surround-text {
			transform: translateX(1em);
		}

		> .iconify {
			opacity: 0.2;
			transform: scale(2);
		}
	}
}
</style>
