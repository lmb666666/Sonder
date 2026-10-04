<script setup lang="ts">
import { getSafeImageUrl, getSafeNavigationUrl } from '#shared/utils/link'

const layoutStore = useLayoutStore()
const appConfig = useAppConfig()
const circleConfig = appConfig.features.circle
layoutStore.setAside([])

if (!circleConfig.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}

useSeoMeta({
	title: circleConfig.title,
	description: circleConfig.description,
})

interface ArticleItem {
	id: string
	title: string
	link: string
	author: string
	created: string
	avatar: string
}

interface StatsData {
	friends_num: number
	article_num: number
	active_num: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function getText(value: unknown) {
	return typeof value === 'string' ? value : ''
}

function getCount(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const allArticles = ref<ArticleItem[]>([])
const displayCount = ref(circleConfig.pageSize)
const isLoading = ref(circleConfig.enabled)
const hasError = ref(false)
const randomArticle = ref<ArticleItem | null>(null)
const selectedAuthor = ref('')
const selectedAuthorAvatar = ref('')
const showAuthorModal = ref(false)
const stats = ref<StatsData>({ friends_num: 0, article_num: 0, active_num: 0 })

const pageSize = circleConfig.pageSize

const displayedArticles = computed(() => allArticles.value.slice(0, displayCount.value))
const hasMore = computed(() => allArticles.value.length > displayCount.value)

const authorArticles = computed(() =>
	allArticles.value.filter(a => a.author === selectedAuthor.value).slice(0, 10),
)

function formatDate(dateStr: string) {
	if (!dateStr)
		return ''
	try {
		return toZdtLocaleString(dateStr, 'date').replace(/\//g, '-')
	}
	catch {
		return dateStr
	}
}

function refreshRandomArticle() {
	if (allArticles.value.length > 0) {
		const idx = Math.floor(Math.random() * allArticles.value.length)
		randomArticle.value = allArticles.value[idx] ?? null
	}
}

function loadMore() {
	displayCount.value += pageSize
}

function openAuthorModal(author: string, avatar: string) {
	selectedAuthor.value = author
	selectedAuthorAvatar.value = avatar
	showAuthorModal.value = true
}

function closeAuthorModal() {
	showAuthorModal.value = false
}

async function fetchData() {
	if (!circleConfig.enabled)
		return

	try {
		isLoading.value = true
		hasError.value = false
		const apiRoot = circleConfig.apiUrl.endsWith('/') ? circleConfig.apiUrl : `${circleConfig.apiUrl}/`
		const res = await fetch(new URL('all.json', apiRoot))
		if (!res.ok)
			throw new Error(`HTTP ${res.status}`)
		const data: unknown = await res.json()
		if (!isRecord(data))
			throw new TypeError('Invalid friend circle response')

		const remoteStats = isRecord(data.statistical_data) ? data.statistical_data : {}
		stats.value = {
			friends_num: getCount(remoteStats.friends_num),
			article_num: getCount(remoteStats.article_num),
			active_num: getCount(remoteStats.active_num),
		}

		const remoteArticles = Array.isArray(data.article_data) ? data.article_data : []
		allArticles.value = remoteArticles.flatMap((value, i) => {
			if (!isRecord(value))
				return []
			const link = getSafeNavigationUrl(value.link)
			if (!link)
				return []
			return [{
				id: `${link}-${i}`,
				title: getText(value.title),
				link,
				author: getText(value.author),
				created: getText(value.created),
				avatar: getSafeImageUrl(value.avatar) ?? '',
			}]
		})

		refreshRandomArticle()
	}
	catch (e) {
		console.error('朋友圈数据加载失败:', e)
		hasError.value = true
	}
	finally {
		isLoading.value = false
	}
}

onMounted(() => {
	if (circleConfig.enabled)
		fetchData()
})
</script>

<template>
<ZError v-if="!circleConfig.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<div v-else class="circle-page proper-height">
	<!-- Header -->
	<ZPageHeader
		icon="tabler:planet"
		:title="circleConfig.title"
		:description="circleConfig.description"
		:background="circleConfig.background ?? appConfig.ui.article.fallbackCover"
	>
		<template v-if="circleConfig.enabled" #stats>
			<div class="circle-stats">
				<div class="circle-stat">
					<Icon name="tabler:users" class="circle-stat-icon" />
					<strong>{{ stats.friends_num }}</strong>
					<span>位朋友</span>
				</div>
				<div class="circle-stat-divider" />
				<div class="circle-stat">
					<Icon name="tabler:file-text" class="circle-stat-icon" />
					<strong>{{ stats.article_num }}</strong>
					<span>篇</span>
				</div>
				<div class="circle-stat-divider" />
				<div class="circle-stat">
					<Icon name="tabler:flame" class="circle-stat-icon" />
					<strong>{{ stats.active_num }}</strong>
					<span>活跃</span>
				</div>
			</div>
		</template>

		<template v-if="circleConfig.enabled && circleConfig.showPoweredBy" #powered>
			<p class="circle-bottom-powered">
				Powered by Friend-Circle-Lite
			</p>
		</template>
	</ZPageHeader>
	<!-- Loading -->
	<div v-if="circleConfig.enabled && isLoading" class="circle-status">
		<Icon name="tabler:loader-2" class="circle-status-icon circle-spin" />
		<p>正在获取朋友们的动态...</p>
	</div>

	<!-- Error -->
	<div v-else-if="circleConfig.enabled && hasError" class="circle-status">
		<Icon name="tabler:exclamation-circle" class="circle-status-icon" />
		<p>加载失败了</p>
		<button class="circle-status-retry" @click="fetchData">
			重试
		</button>
	</div>

	<!-- Empty -->
	<div v-else-if="circleConfig.enabled && allArticles.length === 0" class="circle-status">
		<Icon name="tabler:mood-empty" class="circle-status-icon" />
		<p>还没有文章，稍后再来看看吧</p>
	</div>

	<!-- Content -->
	<template v-else-if="circleConfig.enabled">
		<!-- Random Article -->
		<div v-if="randomArticle" class="circle-random card">
			<div class="circle-random-head">
				<span class="circle-random-label">🎲 随机发现</span>
				<button class="circle-random-refresh" title="换一篇" @click="refreshRandomArticle">
					<Icon name="tabler:refresh" class="circle-refresh-icon" />
				</button>
			</div>

			<UtilLink :to="randomArticle!.link" class="circle-random-body">
				<button class="circle-item-avatar" @click.prevent="openAuthorModal(randomArticle!.author, randomArticle!.avatar)">
					<NuxtImg v-if="randomArticle!.avatar" :src="randomArticle!.avatar" :alt="randomArticle!.author" loading="lazy" densities="1x" />
				</button>
				<span class="circle-item-author">{{ randomArticle!.author }}</span>
				<span class="circle-item-title">{{ randomArticle!.title }}</span>
				<span class="circle-item-date">{{ formatDate(randomArticle!.created) }}</span>
			</UtilLink>
		</div>

		<!-- Article List -->
		<div class="circle-list">
			<UtilLink
				v-for="(article, index) in displayedArticles"
				:key="article.id"
				:to="article.link"
				class="circle-item gradient-card"
				:style="{ animationDelay: `${(index % pageSize) * 0.03}s` }"
			>
				<button class="circle-item-avatar" @click.prevent="openAuthorModal(article.author, article.avatar)">
					<NuxtImg v-if="article.avatar" :src="article.avatar" :alt="article.author" loading="lazy" densities="1x" />
				</button>
				<span class="circle-item-author">{{ article.author }}</span>
				<span class="circle-item-title">{{ article.title }}</span>
				<span class="circle-item-date">{{ formatDate(article.created) }}</span>
			</UtilLink>

			<div v-if="hasMore" class="circle-load-more">
				<button class="circle-load-more-btn card" @click="loadMore">
					加载更多
				</button>
			</div>
		</div>
	</template>

	<!-- Author Modal -->
	<Transition name="modal">
		<div
			v-if="circleConfig.enabled && showAuthorModal"
			class="circle-modal-overlay"
			@click.self="closeAuthorModal"
		>
			<div class="circle-modal card">
				<div class="circle-modal-header">
					<NuxtImg
						v-if="selectedAuthorAvatar"
						:src="selectedAuthorAvatar"
						:alt="selectedAuthor"
						class="circle-modal-avatar"
						loading="lazy"
						densities="1x"
					/>
					<h3 class="circle-modal-name">
						{{ selectedAuthor }}
					</h3>
					<button class="circle-modal-close" @click="closeAuthorModal">
						<Icon name="tabler:x" />
					</button>
				</div>

				<div class="circle-modal-timeline">
					<div
						v-for="(article, index) in authorArticles"
						:key="article.id"
						class="circle-modal-item"
						:style="{ animationDelay: `${0.1 + index * 0.05}s` }"
					>
						<div class="circle-modal-dot" />
						<span class="circle-modal-date">{{ formatDate(article.created) }}</span>
						<UtilLink :to="article.link" class="circle-modal-article-title">
							{{ article.title }}
						</UtilLink>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</div>
</template>

<style lang="scss" scoped>
@use "@/assets/css/stats" as stats;

.circle-page {
	max-width: 52rem;
	margin: 0 auto;
	padding: 2rem 1.5rem;
}

// --- Stats ---
.circle-stats {
	@include stats.stats;
}

.circle-stat {
	@include stats.stat;
}

.circle-stat-icon {
	@include stats.stat-icon;
}

.circle-stat-divider {
	@include stats.stat-divider;
}

.circle-bottom-powered {
	margin: 0;
}

// --- Status ---
.circle-status {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.8rem;
	padding: 4rem 1rem;
	font-size: 0.9rem;
	color: var(--c-text-3);

	p {
		margin: 0;
	}
}

.circle-status-icon {
	opacity: 0.25;
	font-size: 2.5rem;
}

.circle-spin {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.circle-status-retry {
	padding: 0.4rem 1.2rem;
	border: 1px solid var(--c-border);
	border-radius: 0.4rem;
	background: var(--c-bg-2);
	font-size: 0.85rem;
	color: var(--c-text-2);
	cursor: pointer;

	&:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}
}

// --- Random Article ---
.circle-random {
	margin-bottom: 1rem;
	padding: 0.6rem 1rem;
	border-inline-start: 3px solid var(--c-primary);
	background: var(--c-bg-1);
	animation: float-in 0.4s 0.15s ease both;
}

.circle-random-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.circle-random-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--c-primary);
}

.circle-random-refresh {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.8rem;
	height: 1.8rem;
	border: none;
	border-radius: 0.4rem;
	background: transparent;
	color: var(--c-text-3);
	transition: all 0.2s;
	cursor: pointer;

	&:hover {
		background: var(--c-bg-2);
		color: var(--c-primary);

		.circle-refresh-icon {
			transform: rotate(120deg);
		}
	}
}

.circle-refresh-icon {
	transition: transform 0.3s ease;
}

.circle-random-body {
	display: flex;
	align-items: center;
	gap: 0.6rem;
}

// --- Article Items ---
.circle-item {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	height: 2.8rem;
	margin-bottom: 0.4rem;
	padding: 0 0.8rem;
	border-radius: 0.5rem;
	box-shadow: 0 0 0 1px var(--c-bg-soft);
	animation: float-in 0.3s var(--delay) ease backwards;

	&:hover .circle-item-title {
		color: var(--c-text-1);
	}
}

.circle-item-avatar {
	flex-shrink: 0;
	overflow: hidden;
	opacity: 0.85;
	width: 2rem;
	height: 2rem;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: transparent;
	transition: opacity 0.2s, transform 0.2s;
	cursor: pointer;

	&:hover {
		opacity: 1;
		transform: scale(1.08);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.circle-item-author {
	flex-shrink: 0;
	font-size: 0.85rem;
	color: var(--c-text-3);
}

.circle-item-title {
	flex: 1;
	overflow: hidden;
	font-size: 0.9375rem;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-2);
	transition: color 0.2s;
}

.circle-item-date {
	flex-shrink: 0;
	font-family: var(--font-monospace);
	font-size: 0.75rem;
	color: var(--c-text-3);
}

// --- List ---
.circle-list {
	animation: float-in 0.3s 0.2s ease backwards;
}

.circle-load-more {
	display: flex;
	justify-content: center;
	margin: 1.2rem 0;
}

.circle-load-more-btn {
	padding: 0.5rem 2rem;
	border: none;
	background: var(--ld-bg-card);
	font-size: 0.85rem;
	color: var(--c-text-2);
	transition: color 0.2s;
	cursor: pointer;

	&:hover {
		color: var(--c-primary);
	}
}

// --- Modal ---
.circle-modal-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
	position: fixed;
	inset: 0;
	background: rgb(0 0 0 / 30%);
	backdrop-filter: blur(4px);
	z-index: 100;
}

.circle-modal {
	overflow-y: auto;
	width: 90%;
	max-width: 28rem;
	max-height: 80vh;
	padding: 1.2rem;
}

.circle-modal-header {
	display: flex;
	align-items: center;
	gap: 0.8rem;
	margin-bottom: 1rem;
	padding-bottom: 1rem;
	border-bottom: 1px solid var(--c-border);
}

.circle-modal-avatar {
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 50%;
	object-fit: cover;
}

.circle-modal-name {
	flex: 1;
	font-size: 1rem;
	color: var(--c-text-1);
}

.circle-modal-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	border: none;
	border-radius: 0.4rem;
	background: transparent;
	color: var(--c-text-3);
	cursor: pointer;

	&:hover {
		background: var(--c-bg-2);
	}
}

.circle-modal-timeline {
	position: relative;
	padding-left: 0.25rem;
}

.circle-modal-item {
	position: relative;
	margin-bottom: 1rem;
	padding-left: 1.5rem;
	animation: float-in 0.3s var(--delay) backwards;

	&:last-child {
		margin-bottom: 0;
	}
}

.circle-modal-dot {
	position: absolute;
	top: 0.45rem;
	left: 0;
	width: 0.55rem;
	height: 0.55rem;
	border-radius: 50%;
	background: var(--c-text-3);
	transform: translateX(-50%);
	z-index: 1;

	.circle-modal-item:not(:last-child) & {
		&::after {
			content: "";
			position: absolute;
			top: 0.55rem;
			bottom: -1rem;
			left: 50%;
			width: 1.5px;
			background: var(--c-bg-soft);
			transform: translateX(-50%);
		}
	}
}

.circle-modal-date {
	display: block;
	margin-bottom: 0.2rem;
	font-family: var(--font-monospace);
	font-size: 0.75rem;
	color: var(--c-text-3);
}

.circle-modal-article-title {
	font-size: 0.85rem;
	line-height: 1.4;
	color: var(--c-text-1);
}

// --- Transition ---
.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s ease;

	.circle-modal {
		transition: transform 0.2s ease;
	}
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;

	.circle-modal {
		transform: translateY(-1rem);
	}
}

// --- Responsive ---
@media (max-width: $breakpoint-phone) {
	.circle-page {
		padding: 1.5rem 0.8rem 1rem;
	}

	.circle-stat-divider {
		margin: 0 0.3rem;
	}

	.circle-item {
		gap: 0.5rem;
		height: auto;
		padding: 0.5rem 0.7rem;
	}

	.circle-item-avatar {
		width: 1.8rem;
		height: 1.8rem;
	}

	.circle-item-author {
		font-size: 0.8rem;
	}

	.circle-item-title {
		font-size: 0.85rem;
	}
}
</style>
