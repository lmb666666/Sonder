<script setup lang="ts">
import type { ArticleProps } from '~/types/article'
import Autoplay from 'embla-carousel-autoplay'
import emblaCarouselVue from 'embla-carousel-vue'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { Temporal } from 'temporal-polyfill'

const props = defineProps<{
	/** 进入精选位的文章 / Articles featured in the spotlight */
	list: ArticleProps[]
	/** 全站文章池，用于速览统计与随机阅读 / All posts, powering the overview stats and random reading */
	pool: ArticleProps[]
}>()

const appConfig = useAppConfig()
const fallbackCover = appConfig.ui.article.fallbackCover
const reducedMotion = usePreferredReducedMotion()

const showAside = computed(() => appConfig.ui.slide.aside.enabled)

const autoplay = Autoplay({ delay: appConfig.ui.slide.autoplayDelay, playOnInit: false, stopOnInteraction: false, stopOnMouseEnter: true })
const [carouselEl, carouselApi] = emblaCarouselVue({
	containScroll: false,
	loop: props.list.length > 1,
	skipSnaps: true,
}, [
	autoplay,
	WheelGesturesPlugin(),
])

const selectedIndex = ref(0)
watch(carouselApi, (api) => {
	if (!api)
		return
	const sync = () => {
		selectedIndex.value = api.selectedScrollSnap()
	}
	sync()
	api.on('select', sync)
	api.on('reInit', sync)
})

onMounted(() => {
	if (reducedMotion.value !== 'reduce' && props.list.length > 1)
		autoplay.play()
	rollRandom()
})

watch(reducedMotion, (preference) => {
	if (preference === 'reduce' || props.list.length < 2)
		autoplay.stop()
	else
		autoplay.play()
})

function coverOf(article: ArticleProps) {
	return article.image || fallbackCover
}

function goTo(index: number) {
	autoplay.stop()
	carouselApi.value?.scrollTo(index)
}

function scrollPrev() {
	autoplay.stop()
	carouselApi.value?.scrollPrev()
}

function scrollNext() {
	autoplay.stop()
	carouselApi.value?.scrollNext()
}

// 鼠标横向滚动 / Shift + 纵向滚轮事件
useEventListener(carouselEl, 'wheel', (e) => {
	const isHorizontalGesture = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)
	if (!isHorizontalGesture)
		return

	e.preventDefault()
	e.stopPropagation()

	const delta = e.deltaX + (e.shiftKey ? e.deltaY : 0)
	if (Math.abs(delta) < 80)
		return
	delta > 0 ? scrollNext() : scrollPrev()
}, { passive: false })

// 站点速览统计 / Site overview stats
const stats = computed(() => {
	const pool = props.pool
	return {
		posts: pool.length,
		categories: new Set(pool.flatMap(article => article.categories ?? [])).size,
		words: pool.reduce((sum, article) => sum + (article.readingTime?.words ?? 0), 0),
	}
})

// 写作节奏：近 12 个月每月发文数 / Writing rhythm: posts per month over the last 12 months
const rhythm = computed(() => {
	// 以站点时区的当前月为终点（timeZone 只在 blog.config 里，经 toZonedTemporal 取） / Anchor on the current month in the site timezone
	const current = toZonedTemporal(Temporal.Now.instant().toString()).toPlainDate().toPlainYearMonth()
	const months = Array.from({ length: 12 }, (_, index) => current.subtract({ months: 11 - index }))
	const counts = new Map<string, number>()
	for (const article of props.pool) {
		if (!article.date)
			continue
		try {
			const month = toZonedTemporal(article.date).toPlainDate().toPlainYearMonth().toString()
			counts.set(month, (counts.get(month) ?? 0) + 1)
		}
		catch {
			// 日期格式异常的文章不计入节奏 / Posts with an unparsable date are left out
		}
	}

	const bars = months.map(month => ({ key: month.toString(), label: `${month.month}月`, count: counts.get(month.toString()) ?? 0 }))
	const max = Math.max(1, ...bars.map(bar => bar.count))
	return {
		total: bars.reduce((sum, bar) => sum + bar.count, 0),
		max,
		first: bars[0]?.label,
		bars: bars.map(bar => ({ ...bar, heat: Number((bar.count / max).toFixed(3)) })),
	}
})

// 「随机阅读」的目标：挂载后开掷，之后每次悬停或聚焦再掷一次 / Random reading target: rolled on mount, re-rolled on hover or focus
const randomTarget = ref<string>()
function rollRandom() {
	const pick = props.pool[Math.floor(Math.random() * props.pool.length)]
	randomTarget.value = pick?.path
}
</script>

<template>
<section class="z-slide" :aria-label="appConfig.ui.slide.tag">
	<div class="z-slide-body" :class="{ 'has-aside': showAside }">
		<div ref="carouselEl" class="z-slide-hero" dir="ltr">
			<div class="hero-track">
				<UtilLink
					v-for="(article, index) in list"
					:key="article.path"
					class="hero-slide"
					:class="{ 'is-active': index === selectedIndex }"
					:tabindex="index === selectedIndex ? 0 : -1"
					:aria-hidden="index === selectedIndex ? undefined : 'true'"
					:title="article.description"
					:to="article.path"
				>
					<NuxtImg class="hero-cover" :src="coverOf(article)" :alt="article.title" />
					<div class="hero-mask" aria-hidden="true" />
					<div class="hero-info">
						<h3 class="hero-title text-creative">
							{{ article.title }}
						</h3>
					</div>
				</UtilLink>
			</div>

			<div class="hero-foot">
				<span class="hero-tag">
					<Icon name="tabler:star-filled" aria-hidden="true" />
					<span class="hero-tag-text">{{ appConfig.ui.slide.tag }}</span>
				</span>
				<div v-if="list.length > 1" class="hero-dots">
					<button
						v-for="(article, index) in list"
						:key="article.path"
						class="hero-dot"
						:class="{ 'is-active': index === selectedIndex }"
						type="button"
						:aria-label="`查看「${article.title}」`"
						:aria-pressed="index === selectedIndex"
						@click="goTo(index)"
					/>
				</div>
				<div v-if="list.length > 1" class="hero-arrows">
					<button class="arrow-btn" type="button" aria-label="上一篇精选" @click="scrollPrev">
						<Icon name="tabler:chevron-left" aria-hidden="true" />
					</button>
					<button class="arrow-btn" type="button" aria-label="下一篇精选" @click="scrollNext">
						<Icon name="tabler:chevron-right" aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>

		<aside v-if="showAside" class="z-slide-aside">
			<dl class="aside-stats">
				<div class="stat">
					<dt>文章</dt>
					<dd>{{ stats.posts }}</dd>
				</div>
				<div class="stat">
					<dt>分类</dt>
					<dd>{{ stats.categories }}</dd>
				</div>
				<div class="stat">
					<dt>字数</dt>
					<dd>{{ formatNumber(stats.words) }}</dd>
				</div>
			</dl>

			<!-- 写作节奏：近 12 个月每月发文数 / Writing rhythm: posts per month over the last 12 months -->
			<div class="rhythm" role="img" :aria-label="`写作节奏：近 12 个月共 ${rhythm.total} 篇，最多的一月 ${rhythm.max} 篇`">
				<div class="rhythm-head">
					<span>写作节奏</span>
					<span>近 12 个月 {{ rhythm.total }} 篇</span>
				</div>
				<div class="rhythm-bars">
					<span
						v-for="(bar, index) in rhythm.bars"
						:key="bar.key"
						class="rhythm-bar"
						:class="{ 'is-empty': !bar.count }"
						:style="{ '--heat': bar.heat, ...getFixedDelay(index * 0.04) }"
						:title="`${bar.label} · ${bar.count} 篇`"
					/>
				</div>
				<div class="rhythm-foot">
					<span>{{ rhythm.first }}</span>
					<span>本月</span>
				</div>
			</div>

			<div class="aside-actions">
				<UtilLink
					v-if="appConfig.ui.slide.aside.random"
					class="action-btn action-primary"
					:to="randomTarget"
					@mouseenter="rollRandom"
					@focus="rollRandom"
				>
					<Icon name="tabler:dice-5" aria-hidden="true" />
					随机阅读
				</UtilLink>
				<UtilLink v-if="appConfig.ui.slide.aside.rss && appConfig.feed.enabled" class="action-btn action-ghost" to="/atom.xml">
					<Icon name="tabler:rss" aria-hidden="true" />
					RSS 订阅
				</UtilLink>
			</div>
		</aside>
	</div>
</section>
</template>

<style lang="scss" scoped>
.z-slide {
	container-type: inline-size;
	margin: var(--sp-4);
}

.z-slide-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: stretch;
	gap: var(--sp-4);
	animation: float-in 0.3s ease backwards;

	&.has-aside {
		grid-template-columns: minmax(0, 2.55fr) minmax(0, 1fr);
	}
}

.z-slide-hero,
.z-slide-aside {
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background-color: var(--surface-card);
}

.z-slide-hero {
	position: relative;
	min-width: 0;

	/* 高度与右侧信息面板的内容（三格 + 写作节奏 + 两个按钮）大致齐平，避免任一侧空出一大块 */
	min-height: clamp(14rem, 20vw, 16rem);
	transition: border-color 0.2s ease;
	cursor: grab;
	user-select: none;

	&:hover,
	&:focus-within {
		border-color: color-mix(in srgb, var(--c-primary) 60%, var(--c-border));
	}
}

.hero-track {
	display: flex;
	height: 100%;
}

.hero-slide {
	display: block;
	flex: 0 0 100%;
	position: relative;
	overflow: hidden;
	height: 100%;
	min-width: 0;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: -2px;
	}
}

.hero-cover {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	transition: transform 0.6s ease;
	will-change: transform;
	object-fit: cover;
}

.hero-slide:hover .hero-cover,
.hero-slide:focus-visible .hero-cover {
	transform: scale(1.04);
}

/* 底部暗色渐变，保证标题与控制区可读 */
.hero-mask {
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, rgb(0 0 0 / 50%), rgb(0 0 0 / 15%) 38%, transparent 58%);
	pointer-events: none;
}

.hero-info {
	position: absolute;
	inset-block-end: 0;
	inset-inline: 0;
	padding: var(--sp-5);
	padding-block-end: 4.25rem;
	pointer-events: none;
}

.hero-slide.is-active .hero-title {
	animation: title-in 0.45s ease both;
}

@keyframes title-in {
	from {
		opacity: 0;
		transform: translateY(0.5rem);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.hero-title {
	display: -webkit-box;
	overflow: hidden;
	font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
	font-weight: 700;
	-webkit-line-clamp: 1;
	line-height: var(--lh-tight);
	text-shadow: var(--text-shadow-black);
	color: white;
	-webkit-box-orient: vertical;
}

/* 标签、圆点指示器与前后箭头同一行，悬浮于轮播之上，不随幻灯片切换 */
.hero-foot {
	display: flex;
	align-items: flex-end;
	gap: var(--sp-3);
	position: absolute;
	inset-block-end: var(--sp-4);
	inset-inline: var(--sp-5);
	color: white;
	pointer-events: none;
	z-index: 2;
}

.hero-tag {
	display: inline-flex;
	align-items: center;
	gap: 0.3em;
	min-width: 0;
	font-size: var(--fs-sm);
	font-weight: 600;
	text-shadow: var(--text-shadow-black);

	.iconify {
		flex-shrink: 0;
		font-size: 1em;
	}
}

.hero-tag-text {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.hero-dots {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--sp-2);
	margin-block-end: 0.2rem;
	pointer-events: auto;
}

.hero-dot {
	width: 0.5rem;
	height: 0.5rem;
	padding: 0;
	border-radius: var(--radius-full);
	background-color: rgb(255 255 255 / 40%);
	transition: width 0.25s ease, background-color 0.25s ease;
	cursor: pointer;

	&:hover {
		background-color: rgb(255 255 255 / 70%);
	}

	&.is-active {
		width: 1.5rem;
		background-color: white;
	}
}

.hero-arrows {
	display: flex;
	flex-shrink: 0;
	gap: var(--sp-2);
	margin-inline-start: auto;
	pointer-events: auto;
}

.arrow-btn {
	display: grid;
	place-items: center;
	width: 2.25rem;
	height: 2.25rem;
	padding: 0;
	border-radius: var(--radius-full);
	background-color: rgb(0 0 0 / 30%);
	backdrop-filter: blur(0.5rem);
	color: white;
	transition: background-color 0.2s ease;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background-color: rgb(0 0 0 / 50%);
	}

	.iconify {
		font-size: 1.05rem;
	}
}

.z-slide-aside {
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	gap: var(--sp-3);
	min-width: 0;
	padding: var(--sp-4);
}

/* 统计吸收上方剩余高度并在其中垂直居中，把面板的高度变化留给写作节奏之上 */
.aside-stats {
	display: grid;
	flex: 1;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	align-content: center;
	gap: var(--sp-2);
	margin: 0;
}

.stat {
	display: flex;
	flex-direction: column-reverse;
	gap: 0.125rem;
	min-width: 0;
	text-align: center;

	dd {
		margin: 0;
		font-size: var(--fs-h2);
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	dt {
		font-size: var(--fs-xs);
		color: var(--c-text-2);
	}
}

/* 写作节奏：近 12 个月每月一根柱子，颜色深浅随当月篇数 */
.rhythm {
	display: grid;
	gap: var(--sp-1);
	min-width: 0;
}

.rhythm-head,
.rhythm-foot {
	display: flex;
	justify-content: space-between;
	gap: var(--sp-2);
	font-size: var(--fs-xs);
	line-height: 1.4;
	color: var(--c-text-2);
}

.rhythm-foot {
	color: var(--c-text-3);
}

.rhythm-bars {
	display: flex;
	align-items: flex-end;
	gap: 3px;
	height: 2.5rem;
}

.rhythm-bar {
	flex: 1;
	opacity: calc(0.35 + 0.65 * var(--heat, 0));
	height: calc(0.5rem + 1.5rem * var(--heat, 0));
	min-width: 0;
	border-radius: 3px 3px 1px 1px;
	background-color: var(--c-primary);
	transform-origin: bottom;
	transition: opacity 0.2s ease, transform 0.2s ease;
	animation: rhythm-grow 0.5s ease var(--delay) backwards;

	&:hover {
		opacity: 1;
		transform: translateY(-2px);
	}

	&.is-empty {
		opacity: 1;
		height: 3px;
		background-color: var(--c-border);
	}
}

@keyframes rhythm-grow {
	from {
		transform: scaleY(0);
	}
}

.aside-actions {
	display: flex;
	flex-direction: column;
	gap: var(--sp-2);
}

.action-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4em;
	padding: 0.4rem 0.75rem;
	border: 1px solid transparent;
	border-radius: var(--radius-sm);
	font-size: var(--fs-sm);
	font-weight: 600;
	transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	cursor: pointer;

	.iconify {
		font-size: 1em;
	}
}

.action-primary {
	background-color: var(--c-primary-soft);
	color: var(--c-primary);

	&:hover,
	&:focus-visible {
		background-color: var(--c-primary);
		color: var(--c-bg);
	}
}

.action-ghost {
	border-color: var(--c-border);
	color: var(--c-text-1);

	&:hover,
	&:focus-visible {
		border-color: color-mix(in srgb, var(--c-primary) 60%, var(--c-border));
		color: var(--c-primary);
	}
}

@container (width < 1000px) {
	.hero-info {
		padding-inline: var(--sp-4);
	}

	.hero-foot {
		inset-inline: var(--sp-4);
	}
}

/* 窄卡片下隐藏速览面板，精选位占满整行 */
@container (width < 620px) {
	.z-slide-body.has-aside {
		grid-template-columns: 1fr;
	}

	.z-slide-aside {
		display: none;
	}
}

/* 手机宽度：压低高度，收紧留白 */
@container (width < 480px) {
	.z-slide-hero {
		min-height: 0;
		aspect-ratio: 16 / 9;
	}

	.hero-info {
		padding: var(--sp-4);
		padding-block-end: 3.75rem;
	}

	.hero-foot {
		gap: var(--sp-2);
		inset-block-end: var(--sp-3);
		inset-inline: var(--sp-4);
	}

	.arrow-btn {
		width: 2rem;
		height: 2rem;
	}
}

/* 信息面板变窄时缩小数字，让三格始终排在一行、长数字（如 50.00万）也不挤破格子 */
@container (width < 16.5rem) {
	.stat dd {
		font-size: var(--fs-h3);
	}
}

@container (width < 13.5rem) {
	.stat dd {
		font-size: var(--fs-sm);
	}
}

@media (prefers-reduced-motion: reduce) {
	.z-slide-body,
	.hero-slide.is-active .hero-title,
	.rhythm-bar {
		animation: none;
	}

	.hero-cover,
	.hero-dot,
	.arrow-btn,
	.rhythm-bar,
	.z-slide-hero {
		transition: none;
	}
}
</style>
