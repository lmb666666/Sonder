<script setup lang="ts">
import { orderBy } from 'es-toolkit/array'
import { getRecommendedArticles } from '#shared/utils/article'
import ZField from '~/components/home/Field.vue'
import HeroButton from '~/components/home/HeroButton.vue'
import ZTimeline from '~/components/home/Timeline.vue'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

if (!appConfig.pages.home.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}

useSeoMeta({
	title: '',
	description: appConfig.description,
	ogImage: appConfig.author.avatar,
})

const { data: listRaw } = await useAsyncData(
	'posts:home',
	async () => appConfig.home.mode === 'articles'
		? (await getArticleIndexOptions()).map(article => ({ ...article, draft: false }))
		: [],
	{
		default: () => [],
		getCachedData: (key, app, ctx) =>
			(ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook')
				? undefined
				: (app.payload.data[key] ?? app.static.data[key]),
	},
)
const { listSorted, isAscending, sortOrder } = useArticleSort(listRaw, { bindDirectionQuery: 'asc', bindOrderQuery: 'sort' })
const { category, categories, listCategorized } = useCategory(listSorted, { bindQuery: 'category' })
const { page, totalPages, listPaged } = usePagination(listCategorized, { bindQuery: 'page' })
watch(category, () => {
	page.value = 1
})
const listRecommended = computed(() => orderBy(
	getRecommendedArticles(listRaw.value),
	['recommend', 'date'],
	['desc'],
))
useSeoMeta({
	title: () => appConfig.home.mode === 'articles' && page.value > 1 ? `${appConfig.pages.blog.title} - 第${page.value}页` : '',
})

// 问候语解析：按 \n 分行，{name} 占位在渲染时高亮为作者名 / Parse the greeting: lines split by \n, {name} placeholders highlighted with the author name
const greetingLines = computed(() =>
	appConfig.home.hero.greeting.split('\n').map(line => line.split('{name}')),
)

// 位置句式解析：{country}/{city} 占位替换并加粗 / Parse the location sentence: {country}/{city} placeholders substituted and bolded
const locationSegments = computed(() =>
	appConfig.home.location.text
		.split(/(\{country\}|\{city\})/)
		.filter(Boolean)
		.map(part => ({
			text: part === '{country}' ? appConfig.home.location.country : part === '{city}' ? appConfig.home.location.city : part,
			strong: part === '{country}' || part === '{city}',
		})),
)
</script>

<template>
<ZError v-if="!appConfig.pages.home.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<template v-else>
	<template v-if="appConfig.home.mode === 'articles'">
		<UtilHydrateSafe>
			<PostSlide v-if="appConfig.ui.slide.enabled && listRecommended.length && page === 1 && !category" :list="listRecommended" />
			<div class="post-list">
				<PostOrderToggle v-model:is-ascending="isAscending" v-model:sort-order="sortOrder" v-model:category="category" :categories />
				<TransitionGroup tag="div" class="article-grid proper-height" name="float-in">
					<PostArticle v-for="article, index in listPaged" :key="article.path" v-bind="article" :to="article.path" :use-updated="sortOrder === 'updated'" :style="getFixedDelay(index * 0.05)" />
				</TransitionGroup>
				<ZPagination v-model="page" sticky avoid :total-pages="totalPages" />
			</div>
		</UtilHydrateSafe>
	</template>
	<template v-else>
		<div class="home-page">
			<div v-if="appConfig.home.sections.hero" class="home-hero-section">
				<div v-if="appConfig.home.hero.watermark" class="home-watermark" aria-hidden="true">
					{{ appConfig.home.hero.watermark }}
				</div>

				<div class="home-hero wrapper">
					<ZField class="home-hero-field" label-tag="div">
						<template #label>
							<span class="home-hero-label" aria-hidden="true">{{ appConfig.home.hero.greetingEmoji }}</span>
						</template>
						<h1 class="home-hero-title">
							<template v-for="(line, lineIndex) in greetingLines" :key="lineIndex">
								<br v-if="lineIndex">
								<template v-for="(segment, segmentIndex) in line" :key="segmentIndex">
									<mark v-if="segmentIndex">{{ appConfig.author.name }}</mark>{{ segment }}
								</template>
							</template>
						</h1>
						<p class="desc">
							{{ appConfig.subtitle }}
						</p>
						<div class="home-hero-buttons">
							<HeroButton
								v-if="appConfig.home.hero.button.enabled"
								:icon="appConfig.home.hero.button.icon"
								:to="appConfig.home.hero.button.url"
								:text="appConfig.home.hero.button.text"
								primary
							/>
							<HeroButton
								v-for="link in appConfig.home.socialLinks"
								:key="link.name"
								:icon="link.icon"
								:to="link.url"
								:text="link.name"
							/>
						</div>
					</ZField>
				</div>
			</div>

			<div class="home-details">
				<ZField v-if="appConfig.home.sections.profile" id="profile" class="home-detail-field home-profile-field">
					<template #label>
						<span class="home-profile-label">
							<Icon name="material-symbols:person" aria-hidden="true" />
							<span>{{ appConfig.home.sectionTitles.profile }}</span>
						</span>
					</template>
					<div class="home-profile-content">
						<div class="home-profile-summary">
							<div class="home-profile-summary-main">
								<p class="home-intro-bio">
									{{ appConfig.home.aboutBio }}
								</p>
								<div class="home-tags">
									<span v-for="tag in appConfig.home.tags" :key="tag">{{ tag }}</span>
								</div>
							</div>
						</div>
						<div class="home-profile-surface">
							<div class="home-location-surface">
								<NuxtImg class="home-map-image home-map-light" :src="appConfig.home.location.mapLight" alt="" loading="lazy" />
								<NuxtImg class="home-map-image home-map-dark" :src="appConfig.home.location.mapDark" alt="" loading="lazy" />
								<p>
									<template v-for="(segment, index) in locationSegments" :key="index">
										<strong v-if="segment.strong">{{ segment.text }}</strong>
										<template v-else>
											{{ segment.text }}
										</template>
									</template>
								</p>
							</div>
							<div class="home-mbti-surface">
								<NuxtImg :src="appConfig.home.mbti.image" alt="" loading="lazy" />
								<div>
									<p class="home-mbti-heading">
										<strong>{{ appConfig.home.mbti.type }}</strong>
										<span>{{ appConfig.home.mbti.label }}</span>
									</p>
									<p class="home-mbti-quote">
										"{{ appConfig.home.mbti.quote }}"
									</p>
									<UtilLink :to="appConfig.home.mbti.link">
										{{ appConfig.home.mbti.linkText }}
									</UtilLink>
								</div>
							</div>
						</div>
					</div>
				</ZField>

				<ZField v-if="appConfig.home.sections.career" id="career" class="home-detail-field" :label="appConfig.home.sectionTitles.career">
					<ZTimeline :items="appConfig.home.career" />
				</ZField>

				<ZField v-if="appConfig.home.sections.skills" id="skills" class="home-detail-field" :label="appConfig.home.sectionTitles.skills">
					<div class="home-skills-list">
						<div v-for="skill in appConfig.home.skills" :key="skill.name" class="home-skill-item">
							<div class="home-skill-header">
								<span>{{ skill.name }}</span>
								<span>{{ skill.percent }}%</span>
							</div>
							<div class="home-skill-bar">
								<div :style="{ width: `${skill.percent}%` }" />
							</div>
						</div>
					</div>
				</ZField>

				<ZField v-if="appConfig.home.sections.sponsors && appConfig.features.sponsors.enabled" id="sponsor" class="home-detail-field">
					<template #label>
						<span class="home-sponsor-label">
							<Icon name="material-symbols:favorite" aria-hidden="true" />
							<span>{{ appConfig.home.sectionTitles.sponsors }}</span>
						</span>
					</template>
					<p>{{ appConfig.home.sponsorUsage }}</p>
					<div class="home-sponsor-methods">
						<figure v-for="method in appConfig.home.sponsorMethods" :key="method.name">
							<h3>{{ method.name }}</h3>
							<NuxtImg :src="method.qrCode" :alt="method.description" loading="lazy" :class="{ 'has-white-background': method.whiteBackground }" />
							<figcaption>{{ method.description }}</figcaption>
						</figure>
					</div>
					<div v-if="appConfig.home.sponsors.length" class="home-sponsors-title">
						<Icon name="material-symbols:emoji-people-rounded" />
						<span>赞助者</span>
					</div>
					<div v-if="appConfig.home.sponsors.length" class="home-sponsors-list">
						<div v-for="sponsor in appConfig.home.sponsors" :key="sponsor.name">
							<span>{{ sponsor.name }}</span>
							<strong>{{ sponsor.amount }}</strong>
							<time>{{ sponsor.date }}</time>
						</div>
					</div>
				</ZField>
			</div>
		</div>
	</template>
</template>
</template>

<style lang="scss" scoped>
.home-page {
	position: relative;
	width: 100%;
	max-width: 76rem;
	padding: 1rem 1rem 4rem;
	isolation: isolate;
}

.post-list {
	margin: var(--sp-4);
}

.article-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-content: start;
	align-items: stretch;
	gap: var(--sp-4);
	margin: var(--sp-4) 0;

	> :deep(.article-card) {
		height: 100%;
		margin: 0;
	}

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;
	}
}

.float-in-leave-to {
	position: absolute;
}

.home-hero-section {
	position: relative;
	overflow: hidden;
	width: calc(100% + 2rem);
	min-height: calc(62svh + 3rem);
	margin-inline: -1rem;
	isolation: isolate;

	@media (max-width: $breakpoint-mobile) {
		width: calc(100% + 1rem);
		min-height: calc(59svh + 2rem);
		margin-inline: -0.5rem;
	}
}

.home-hero {
	display: grid;
	place-items: center;
	width: 100%;
	min-height: 62svh;
	max-width: 768px;
	margin: 0 auto;

	@media (max-width: $breakpoint-mobile) {
		width: calc(100% - 2.5rem);
		min-height: 59svh;
	}
}

.home-watermark {
	position: absolute;
	opacity: 0.055;
	right: clamp(0.25rem, 1vw, 0.75rem);
	bottom: -0.25rem;
	font-size: clamp(12rem, 24vw, 22rem);
	font-weight: 900;
	line-height: 1;
	color: var(--c-primary);
	pointer-events: none;
	user-select: none;
	z-index: 0;

	@media (max-width: $breakpoint-mobile) {
		opacity: 0.045;
		right: 0.25rem;
		bottom: -0.125rem;
		font-size: clamp(9rem, 46vw, 13rem);
	}
}

.home-hero-field {
	grid-template-columns: 120px minmax(0, auto);
	gap: 1rem 1.5rem;
	position: relative;
	width: fit-content;
	max-width: calc(100% - 1rem);
	margin: 3em auto 1em;
	transform: translateX(-3rem);
	z-index: 1;

	:deep(.z-field-label) {
		text-align: end;
	}

	:deep(.z-field-content p) {
		line-height: 1.5;
	}

	@media (max-width: $breakpoint-mobile) {
		grid-template-columns: 1fr;
		width: auto;
		max-width: none;
		margin: 3em 0.5rem 1em;
		transform: none;

		:deep(.z-field-label) {
			text-align: start;
		}
	}
}

.home-hero-label {
	display: inline-block;
	font-size: 3rem;
}

.home-hero-title {
	font-size: 3rem;
}

mark {
	background: linear-gradient(var(--c-primary-soft), var(--c-primary-soft)) no-repeat left bottom / 100% 0.3em;
	text-decoration: none;
	color: var(--c-primary);
	transition: 0.2s;
	animation: line-spread 0.5s;

	&:hover {
		background-size: 100% 50%;
	}
}

@media (prefers-reduced-motion: reduce) {
	mark {
		animation: none;
	}
}

@keyframes line-spread {
	from {
		background-size: 0 0.3em;
	}
}

.desc {
	margin: 1rem 0;
	font-size: 1.5rem;
	color: var(--c-text-2);
}

.home-details {
	width: 100%;
	max-width: 768px;
	margin: 1rem auto 0;
}

.home-intro-bio {
	font-size: var(--fs-body);
	line-height: var(--lh-body);
	color: var(--c-text-2);
}

.home-profile-summary-main {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--sp-3) var(--sp-4);
}

.home-tags {
	display: flex;
	flex-shrink: 0;
	flex-wrap: wrap;
	gap: 0.4rem;

	span {
		padding: 0.15em 0.7em;
		border-radius: var(--radius-full);
		background-color: var(--c-bg-2);
		font-size: var(--fs-xs);
		color: var(--c-text-2);
	}
}

.home-hero-buttons {
	display: flex;
	flex-wrap: wrap;
	gap: 0.6rem;
}

.home-profile-label,
.home-sponsor-label {
	display: inline-flex;
	align-items: baseline;
	gap: 0.35rem;

	.iconify {
		font-size: 1em;
	}
}

.home-details > .home-detail-field {
	margin-top: 3em;
}

.home-profile-content {
	border-top: 1px solid var(--c-border);
}

.home-profile-summary {
	padding: var(--sp-5) 0;
}

.home-profile-surface {
	display: grid;
	grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
	border-block: 1px solid var(--c-border);
}

.home-mbti-surface {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: center;
	gap: var(--sp-4);
	padding: var(--sp-4);

	> img {
		width: auto;
		height: 7rem;
		max-width: 100%;
		aspect-ratio: 143 / 200;
		border-radius: var(--radius-sm);
		object-fit: contain;
	}

	> div {
		display: grid;
		gap: var(--sp-2);
		min-width: 0;
	}

	a {
		width: fit-content;
		font-size: var(--fs-xs);
		color: var(--c-primary);
	}
}

.home-mbti-heading {
	display: flex;
	align-items: baseline;
	gap: var(--sp-2);

	strong {
		font-size: var(--fs-h2);
		color: var(--c-primary);
	}

	span {
		font-size: var(--fs-sm);
		font-weight: 600;
	}
}

.home-mbti-quote {
	font-size: var(--fs-xs);
	font-style: italic;
	line-height: 1.5;
	color: var(--c-text-2);
}

.home-location-surface {
	position: relative;
	overflow: hidden;
	min-height: 11rem;
	border-inline-end: 1px solid var(--c-border);

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, transparent 45%, var(--c-bg-a80));
		pointer-events: none;
		z-index: 1;
	}

	.home-map-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.home-map-dark {
		display: none;
	}

	p {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		padding: 0.8rem 1rem;
		font-size: var(--fs-sm);
		color: var(--c-text-2);
		z-index: 2;

		strong {
			color: var(--c-text-1);
		}
	}
}

:global(.dark) .home-location-surface {
	.home-map-light {
		display: none;
	}

	.home-map-dark {
		display: block;
	}
}

.home-skills-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.8rem 1.5rem;
}

.home-skill-header {
	display: flex;
	justify-content: space-between;
	gap: var(--sp-2);
	margin-bottom: 0.3rem;
	font-size: var(--fs-sm);

	span:last-child {
		font-weight: 600;
		color: var(--c-text-2);
	}
}

.home-skill-bar {
	overflow: hidden;
	height: 0.3rem;
	border-radius: 0.15rem;
	background-color: var(--c-border);

	> div {
		height: 100%;
		border-radius: inherit;
		background-color: var(--c-primary);
	}
}

.home-sponsor-methods {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--sp-3);
	margin-top: var(--sp-5);

	figure {
		display: grid;
		justify-items: center;
		gap: var(--sp-2);
		padding: var(--sp-3) 0;
		border-bottom: 1px solid var(--c-border);
		font-size: var(--fs-xs);
		text-align: center;
		color: var(--c-text-2);
	}

	h3 {
		font-size: var(--fs-sm);
		color: var(--c-text-1);
	}

	img {
		width: 7rem;
		aspect-ratio: 1;
		border-radius: var(--radius-sm);
		object-fit: contain;

		&.has-white-background {
			background-color: #FFF;
		}
	}
}

.home-sponsors-title {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin-top: var(--sp-5);
	padding-bottom: 0.6rem;
	border-bottom: 1px solid var(--c-border);
	font-size: var(--fs-sm);
	font-weight: 600;
}

.home-sponsors-list {
	> div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: var(--sp-3);
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--c-border);
		font-size: var(--fs-sm);
	}

	strong {
		color: var(--c-primary);
	}

	time {
		font-size: var(--fs-xs);
		color: var(--c-text-2);
	}
}

@media (max-width: $breakpoint-mobile) {
	.home-page {
		padding-inline: 0.5rem;
	}

	.home-details > .home-detail-field {
		margin-top: 2.25em;
	}

	.home-profile-summary {
		padding: var(--sp-4) 0;
	}

	.home-profile-surface {
		grid-template-columns: 1fr;
	}

	.home-location-surface {
		min-height: 0;
		aspect-ratio: 16 / 6;
		border-inline-end: 0;
		border-bottom: 1px solid var(--c-border);
	}

	.home-mbti-surface > img {
		height: 8rem;
	}

	.home-skills-list,
	.home-sponsor-methods {
		grid-template-columns: 1fr;
	}
}

@media (max-width: $breakpoint-phone) {
	.home-page {
		padding-bottom: var(--sp-6);
	}

	.home-location-surface {
		min-height: 10rem;
		aspect-ratio: auto;
	}

	.home-sponsor-methods img {
		width: 6rem;
	}

	.home-sponsors-list time {
		grid-column: 1 / -1;
	}
}
</style>
