<script setup lang="ts">
import type { ArticleProps } from '~/types/article'
import Autoplay from 'embla-carousel-autoplay'
import emblaCarouselVue from 'embla-carousel-vue'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'

const props = defineProps<{ list: ArticleProps[] }>()

const appConfig = useAppConfig()
const fallbackCover = appConfig.ui.article.fallbackCover
const reducedMotion = usePreferredReducedMotion()

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

// 预取各封面主色并按封面缓存（响应式，取色完成后首屏即可生效）
const coverColors = ref<Record<string, string | undefined>>({})
const activeCoverSrc = computed(() => {
	const article = props.list[selectedIndex.value] ?? props.list[0]
	return article ? coverOf(article) : fallbackCover
})
const activeColor = computed(() => coverColors.value[activeCoverSrc.value])

onMounted(async () => {
	if (reducedMotion.value !== 'reduce' && props.list.length > 1)
		autoplay.play()

	await Promise.allSettled(props.list.map(async (article) => {
		const src = coverOf(article)
		if (typeof coverColors.value[src] === 'undefined')
			coverColors.value[src] = await getCoverThemeColor(src, appConfig.ui.article.coverProxyHosts)
	}))
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
	delta > 0 ? carouselApi.value?.scrollNext() : carouselApi.value?.scrollPrev()
}, { passive: false })

function scrollTo(index: number) {
	autoplay.stop()
	carouselApi.value?.scrollTo(index)
}

function resumeAutoplay() {
	if (reducedMotion.value !== 'reduce' && props.list.length > 1)
		autoplay.play()
}
</script>

<template>
<div class="z-slide">
	<div class="z-slide-body" :style="activeColor ? { '--list-color': activeColor } : undefined">
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

					<div class="hero-tag">
						{{ appConfig.ui.slide.tag }}
					</div>

					<div class="hero-mask" />

					<div class="hero-info">
						<h3 class="hero-title text-creative">
							{{ article.title }}
						</h3>
					</div>
				</UtilLink>
			</div>

			<div v-if="list.length > 1" class="indicators" :aria-label="appConfig.ui.slide.tag">
				<button
					v-for="(article, index) in list"
					:key="article.path"
					class="indicator"
					:class="{ active: index === selectedIndex }"
					:aria-label="`查看「${article.title}」`"
					:aria-pressed="index === selectedIndex"
					@click="scrollTo(index)"
				/>
			</div>
		</div>

		<div v-if="list.length > 1" class="z-slide-list">
			<UtilLink
				v-for="(article, index) in list"
				:key="article.path"
				class="list-item"
				:class="{ active: index === selectedIndex }"
				:aria-current="index === selectedIndex ? 'true' : undefined"
				:title="article.description"
				:to="article.path"
				@mouseenter="scrollTo(index)"
				@mouseleave="resumeAutoplay"
				@focus="scrollTo(index)"
				@blur="resumeAutoplay"
			>
				<NuxtImg class="list-thumb" :src="coverOf(article)" :alt="article.title" loading="lazy" />
				<span class="list-title">{{ article.title }}</span>
			</UtilLink>
		</div>
	</div>
</div>
</template>

<style lang="scss" scoped>
.z-slide {
	margin: var(--sp-4);
}

.z-slide-body {
	display: grid;
	grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr);
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background-color: var(--surface-card);
}

.z-slide-hero {
	position: relative;
	overflow: hidden;
	min-width: 0;
	min-height: clamp(12.5rem, 24vw, 22rem);
	cursor: grab;
	user-select: none;

	.hero-track {
		display: flex;
		position: absolute;
		inset: 0;
	}
}

.hero-slide {
	display: block;
	flex: 0 0 100%;
	position: relative;
	overflow: hidden;
	height: 100%;

	> .hero-cover {
		display: block;
		width: 100%;
		height: 100%;
		transition: transform 0.5s ease;
		will-change: transform;
		object-fit: cover;
	}

	&:hover > .hero-cover,
	&:focus-visible > .hero-cover {
		transform: scale(1.04);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: -2px;
	}

	&.is-active .hero-info {
		animation: hero-info-in 0.45s ease both;
	}
}

@keyframes hero-info-in {
	from {
		opacity: 0;
		transform: translateY(0.6rem);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.hero-mask {
	position: absolute;
	inset-block-end: 0;
	inset-inline: 0;
	height: clamp(4.5rem, 26%, 6.5rem);
	background-image: linear-gradient(transparent, #0008);
}

.hero-info {
	position: absolute;
	inset-block-end: 0;
	inset-inline: 0;
	padding: var(--sp-4);
	text-shadow: var(--text-shadow-black);
	color: white;
}

.hero-tag {
	position: absolute;
	inset-block-start: var(--sp-4);
	inset-inline-start: var(--sp-4);
	padding: 0.2em 0.7em;
	border-radius: var(--radius-full);
	background-color: #0006;
	font-size: var(--fs-xs);
	line-height: 1.6;
	color: white;
	z-index: 1;
}

.hero-title {
	display: -webkit-box;
	overflow: hidden;
	font-size: var(--fs-h1);
	font-weight: 700;
	-webkit-line-clamp: 2;
	line-height: var(--lh-tight);
	-webkit-box-orient: vertical;
}

.indicators {
	display: none;
	align-items: center;
	gap: var(--sp-2);
	position: absolute;
	inset-block-start: var(--sp-4);
	inset-inline-end: var(--sp-4);
}

.indicator {
	width: 0.5rem;
	height: 0.5rem;
	padding: 0;
	border-radius: var(--radius-full);
	background-color: rgb(255 255 255 / 40%);
	transition: width 0.25s ease, background-color 0.25s ease, transform 0.2s ease;

	&:hover {
		transform: scale(1.15);
	}

	&.active {
		width: 1.5rem;
		border-radius: 4px;
		background-color: rgb(255 255 255 / 90%);
	}
}

.z-slide-list {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 0;
	min-height: 0;
}

.list-item {
	display: flex;
	flex: 1;
	align-items: center;
	gap: 0.9375rem;
	min-height: 0;
	padding: var(--sp-4);
	background-color: color-mix(in srgb, var(--list-color, var(--c-primary)) 74%, var(--surface-card));
	color: white;
	transition: background-color 0.25s ease, box-shadow 0.25s ease;

	&:first-child {
		border-radius: 0 var(--radius) 0 0;
	}

	&:last-child {
		border-radius: 0 0 var(--radius);
	}

	&.active {
		background-color: var(--list-color, var(--c-primary));
	}

	&:hover,
	&:focus-visible {
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 25%);
		background-color: var(--list-color, var(--c-primary));
	}
}

.list-thumb {
	flex-shrink: 0;
	width: 2.25rem;
	aspect-ratio: 1;
	border-radius: var(--radius-sm);
	transition: transform 0.3s ease;
	object-fit: cover;

	.list-item:hover &,
	.list-item:focus-visible & {
		transform: scale(1.06);
	}
}

.list-title {
	overflow: hidden;
	font-size: var(--fs-body);
	line-height: var(--lh-tight);
	white-space: nowrap;
	text-overflow: ellipsis;
}

@media (max-width: $breakpoint-widescreen) and (min-width: 769px) {
	.list-item {
		padding: var(--sp-2) var(--sp-3);
	}
}

@media (max-width: $breakpoint-mobile) {
	.z-slide-body {
		grid-template-columns: 1fr;
		border-radius: var(--radius);
	}

	.z-slide-hero {
		height: auto;
		min-height: 0;
		aspect-ratio: 16 / 9;
	}

	.hero-title {
		font-size: var(--fs-h2);
	}

	.hero-mask {
		height: 6rem;
	}

	.indicators {
		display: flex;
	}

	.z-slide-list {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.hero-slide.is-active .hero-info {
		animation: none;
	}

	.hero-cover,
	.list-item,
	.list-thumb,
	.indicator {
		transition: none;
	}
}
</style>
