<script setup lang="ts">
const appConfig = useAppConfig()
const momentsConfig = appConfig.features.moments

if (!momentsConfig.enabled) {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
}

const layoutStore = useLayoutStore()
layoutStore.setAside([])

useSeoMeta({
	title: momentsConfig.title,
	description: momentsConfig.description,
})

const items = ref<EchoItem[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(momentsConfig.enabled)
const hasError = ref(false)
const loadMoreError = ref(false)
const isRefreshingCache = ref(false)
const pageSize = momentsConfig.pageSize

const hasMore = computed(() => items.value.length < total.value)
const displayItems = computed(() => items.value.map(item => ({
	item,
	extensionMeta: getEchoExtensionMeta(item.extension),
	images: getEchoImages(item, momentsConfig.apiUrl),
	videoSrc: item.extension?.type === 'VIDEO' ? getEchoVideoEmbedUrl(item.extension.payload) : '',
})))
function formatTime(ts: number) {
	return toZdtLocaleString(new Date(ts * 1000).toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
}

function replyEcho(content: string, extComment?: string) {
	const input = document.querySelector('#twikoo .tk-input textarea') as HTMLTextAreaElement | null
	if (!input)
		return

	const lines: string[] = []
	if (content.trim()) {
		const short = content.trim().substring(0, 200)
		short.split('\n').forEach(l => lines.push(l))
	}
	if (extComment)
		lines.push(extComment)

	const quote = lines.map(l => `> ${l}`).join('\n')
	input.value = quote ? `${quote}\n\n` : ''
	input.dispatchEvent(new Event('input'))
	const len = input.value.length
	input.setSelectionRange(len, len)
	input.focus()

	const twikooEl = document.getElementById('twikoo')
	if (twikooEl) {
		twikooEl.scrollIntoView({ behavior: 'auto' })
	}
}

async function fetchData(isLoadMore = false, options: EchoQueryOptions = {}) {
	if (!momentsConfig.enabled)
		return

	try {
		if (!isLoadMore) {
			isLoading.value = true
			hasError.value = false
		}
		const data = await queryEchoes(page.value, pageSize, 'desc', options, momentsConfig.apiUrl)

		total.value = data.total
		loadMoreError.value = false
		if (isLoadMore) {
			items.value.push(...(data.items || []))
		}
		else {
			items.value = data.items || []
		}
	}
	catch (e) {
		console.error('动态加载失败:', e)
		if (isLoadMore) {
			page.value--
			loadMoreError.value = true
		}
		else {
			hasError.value = true
		}
	}
	finally {
		isLoading.value = false
	}
}

async function loadMore(): Promise<void> {
	page.value++
	await fetchData(true)
}

async function refreshEchoCache() {
	if (isRefreshingCache.value)
		return
	isRefreshingCache.value = true
	try {
		clearEchoCache()
		page.value = 1
		await fetchData(false, { force: true })
	}
	finally {
		isRefreshingCache.value = false
	}
}

function getExtComment(ext: EchoItem['extension']) {
	if (!ext)
		return ''
	const meta = getEchoExtensionMeta(ext)
	if (ext.type === 'MUSIC')
		return '🎵 音乐分享'
	if (ext.type === 'VIDEO')
		return `🎬 视频分享（${meta?.url || ''}）`
	if (ext.type === 'WEBSITE')
		return `🔗 链接分享（${meta?.url || ''}）`
	if (ext.type === 'GITHUBPROJ')
		return `📦 GitHub 项目（${meta?.url || ''}）`
	if (ext.type === 'LOCATION')
		return `📍 位置分享（${meta?.title || ''}）`
	if (ext.type === 'TWEET')
		return `🐦 推文分享（${meta?.url || ''}）`
	return ''
}

onMounted(() => {
	if (momentsConfig.enabled)
		fetchData()
})
</script>

<template>
<ZError v-if="!momentsConfig.enabled" icon="line-md:document-delete-twotone" title="页面未启用" />
<div v-else class="moments-page proper-height">
	<ZPageHeader
		icon="mingcute:moment-line"
		:title="momentsConfig.title"
		:description="momentsConfig.description"
		:background="momentsConfig.background ?? appConfig.ui.article.fallbackCover"
	>
		<template v-if="momentsConfig.enabled" #stats>
			<div class="moments-stats">
				<div class="moments-stat">
					<Icon name="tabler:message-2" class="moments-stat-icon" />
					<strong>{{ total }}</strong>
					<span>条动态</span>
				</div>
			</div>
		</template>
		<template v-if="momentsConfig.enabled" #powered>
			<div class="moments-bottom-powered">
				<span v-if="momentsConfig.showPoweredBy">Powered by Ech0</span>
				<button
					class="moments-cache-refresh"
					type="button"
					:disabled="isRefreshingCache || isLoading"
					@click="refreshEchoCache"
				>
					<Icon name="tabler:refresh" />
					刷新缓存
				</button>
			</div>
		</template>
	</ZPageHeader>
	<!-- Loading -->
	<div v-if="momentsConfig.enabled && isLoading" class="moments-status">
		<Icon name="tabler:loader-2" class="moments-status-icon moments-spin" />
		<p>正在获取动态...</p>
	</div>

	<!-- Error -->
	<div v-else-if="momentsConfig.enabled && hasError" class="moments-status">
		<Icon name="tabler:exclamation-circle" class="moments-status-icon" />
		<p>加载失败了</p>
		<button class="moments-status-retry" @click="fetchData()">
			重试
		</button>
	</div>

	<!-- Empty -->
	<div v-else-if="momentsConfig.enabled && items.length === 0" class="moments-status">
		<Icon name="tabler:mood-empty" class="moments-status-icon" />
		<p>还没有动态</p>
	</div>

	<!-- Content -->
	<template v-else-if="momentsConfig.enabled">
		<div class="moments-list">
			<article
				v-for="({ item, extensionMeta, images, videoSrc }, index) in displayItems"
				:key="item.id"
				class="moments-item card gradient-card"
				:style="{ animationDelay: `${index * 0.04}s` }"
			>
				<!-- Header -->
				<div class="moments-item-head">
					<NuxtImg
						class="moments-item-avatar"
						:src="appConfig.author.avatar"
						:alt="item.username"
						loading="lazy"
						densities="1x"
					/>
					<span class="moments-item-username">{{ item.username }}</span>
					<span class="moments-item-time">{{ formatTime(item.created_at) }}</span>
				</div>

				<!-- Tags -->
				<div v-if="item.tags?.length" class="moments-item-tags">
					<span v-for="tag in item.tags" :key="tag.name" class="moments-item-tag">{{ tag.name }}</span>
				</div>

				<!-- Content -->
				<div v-if="item.content" class="moments-item-content">
					{{ item.content }}
				</div>

				<!-- Files -->
				<div v-if="images.length" class="moments-item-images" :class="`is-${Math.min(images.length, 4)}`">
					<a
						v-for="(file, imageIndex) in images"
						:key="file.id || file.file_id || getEchoFileUrl(file, momentsConfig.apiUrl)"
						class="moments-item-image-link"
						:href="getEchoFileUrl(file, momentsConfig.apiUrl)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img
							class="moments-item-image"
							:src="getEchoFileUrl(file, momentsConfig.apiUrl)"
							:alt="getEchoFileAlt(file, imageIndex)"
							loading="lazy"
						>
					</a>
				</div>

				<!-- Extension: Music -->
				<div v-if="item.extension?.type === 'MUSIC'" class="moments-item-music">
					<AudioEmbed :song-url="typeof item.extension.payload?.url === 'string' ? item.extension.payload.url : ''" />
				</div>

				<!-- Extension: Video -->
				<div v-else-if="item.extension?.type === 'VIDEO' && videoSrc" class="moments-item-video">
					<iframe
						:src="videoSrc"
						:title="extensionMeta?.title || '动态视频'"
						allowfullscreen
						loading="lazy"
					/>
				</div>

				<!-- Extension: Website / GitHub / Location / Tweet / Other -->
				<div v-else-if="extensionMeta" class="moments-item-ext" :class="`is-${item.extension?.type.toLowerCase()}`">
					<UtilLink
						:to="extensionMeta.url || undefined"
						class="moments-item-ext-link"
						:class="extensionMeta.url ? 'is-link' : 'is-static'"
					>
						<span class="moments-item-ext-icon-wrap">
							<Icon :name="extensionMeta.icon" class="moments-item-ext-icon" />
						</span>
						<span class="moments-item-ext-info">
							<span class="moments-item-ext-type">
								{{ extensionMeta.label }}
							</span>
							<span class="moments-item-ext-title">
								{{ extensionMeta.title }}
							</span>
							<span v-if="extensionMeta.description" class="moments-item-ext-desc">
								{{ extensionMeta.description }}
							</span>
						</span>
						<Icon v-if="extensionMeta.url" name="tabler:external-link" class="moments-item-ext-arrow" />
					</UtilLink>
				</div>

				<!-- Bottom -->
				<div class="moments-item-foot">
					<button v-if="appConfig.features.comments.enabled" class="moments-item-reply" @click="replyEcho(item.content, getExtComment(item.extension))">
						<Icon name="tabler:message-circle" /> 评论
					</button>
				</div>
			</article>

			<div v-if="hasMore" class="moments-load-more">
				<button class="moments-load-more-btn card" @click="loadMore">
					加载更多
				</button>
			</div>

			<div v-if="loadMoreError" class="moments-load-more-error">
				<span>加载更多失败</span>
				<button class="moments-status-retry" @click="loadMoreError = false; loadMore()">
					重试
				</button>
			</div>
		</div>

		<PostComment v-if="appConfig.features.comments.enabled" />
	</template>
</div>
</template>

<style lang="scss" scoped>
@use "@/assets/css/stats" as stats;

.moments-page {
	max-width: 52rem;
	margin: 0 auto;
	padding: 2rem 1rem;
}

// --- Stats ---
.moments-stats {
	@include stats.stats;
}

.moments-stat {
	@include stats.stat;
}

.moments-stat-icon {
	@include stats.stat-icon;
}

.moments-bottom-powered {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.moments-cache-refresh {
	display: inline-flex;
	align-items: center;
	gap: 0.25em;
	padding: 0.1rem 0.45rem;
	border: 1px solid rgb(255 255 255 / 20%);
	border-radius: 999px;
	background: rgb(255 255 255 / 10%);
	font-size: 0.72rem;
	transition: background-color 0.2s, border-color 0.2s, opacity 0.2s;

	&:hover:not(:disabled) {
		border-color: rgb(255 255 255 / 35%);
		background: rgb(255 255 255 / 18%);
	}

	&:disabled {
		opacity: 0.45;
		cursor: wait;
	}
}

// --- Status ---
.moments-status {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.8rem;
	padding: 4rem 1rem;
	font-size: 0.9rem;
	color: var(--c-text-3);

	p { margin: 0; }
}

.moments-status-icon {
	opacity: 0.25;
	font-size: 2.5rem;
}

.moments-spin {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.moments-status-retry {
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

// --- List ---
.moments-list {
	animation: float-in 0.3s 0.2s ease backwards;
}

.moments-item {
	margin-bottom: 0.8rem;
	padding: 1rem;
	animation: float-in 0.35s var(--delay) ease backwards;
}

.moments-item-head {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.moments-item-avatar {
	flex-shrink: 0;
	width: 2rem;
	height: 2rem;
	border-radius: 50%;
	object-fit: cover;
}

.moments-item-username {
	font-size: 0.85rem;
	font-weight: 500;
	color: var(--c-text-1);
}

.moments-item-time {
	margin-left: auto;
	font-family: var(--font-monospace);
	font-size: 0.75rem;
	color: var(--c-text-3);
}

.moments-item-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.3rem;
	margin-top: 0.5rem;
}

.moments-item-tag {
	padding: 0.1em 0.6em;
	border-radius: 2em;
	background: var(--c-bg-2);
	font-size: 0.7rem;
	color: var(--c-text-3);
}

.moments-item-content {
	overflow-wrap: anywhere;
	margin-top: 0.5rem;
	font-size: 0.9rem;
	line-height: 1.7;
	white-space: pre-wrap;
	color: var(--c-text-1);
}

// --- Files ---
.moments-item-images {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.35rem;
	margin-top: 0.6rem;

	&.is-1 {
		display: block;
	}
}

.moments-item-image-link {
	display: block;
	overflow: hidden;
	border-radius: 0.5rem;
	background: var(--c-bg-2);
	line-height: 0;
}

.moments-item-image {
	width: 100%;
	height: 100%;
	max-height: 28rem;
	transition: transform 0.25s ease;
	object-fit: cover;

	.moments-item-image-link:hover & {
		transform: scale(1.02);
	}

	.is-1 & {
		height: auto;
		object-fit: contain;
	}

	.moments-item-images:not(.is-1) & {
		aspect-ratio: 1;
	}
}

// --- Extension ---
.moments-item-ext {
	margin-top: 0.7rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-md, 0.65rem);
	background: var(--c-bg-2);
}

.moments-item-ext-link {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
	padding: 0.8rem 0.9rem;
	border-radius: inherit;
	color: inherit;
	transition: background-color 0.2s ease, border-color 0.2s ease;

	&.is-link:hover {
		background: var(--c-bg-soft);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	&.is-static {
		cursor: default;
	}
}

.moments-item-ext-icon-wrap {
	display: grid;
	flex: 0 0 auto;
	place-items: center;
	width: 2.25rem;
	height: 2.25rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: var(--c-bg-1);
}

.moments-item-ext-icon {
	font-size: 1.15rem;
	color: var(--c-primary);
}

.moments-item-ext-info {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 0.18rem;
	min-width: 0;
}

.moments-item-ext-type {
	display: block;
	font-size: var(--fs-xs);
	font-weight: 600;
	line-height: 1;
	color: var(--c-text-3);
}

.moments-item-ext-title {
	display: block;
	overflow-wrap: anywhere;
	font-size: var(--fs-sm);
	font-weight: 600;
	line-height: 1.4;
	color: var(--c-text-1);
}

.moments-item-ext-desc {
	display: block;
	overflow-wrap: anywhere;
	font-size: var(--fs-xs);
	line-height: 1.4;
	color: var(--c-text-2);
}

.moments-item-ext-arrow {
	flex-shrink: 0;
	opacity: 0.45;
	margin-top: 0.12rem;
	font-size: 0.9rem;
	color: var(--c-text-3);
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;

	.moments-item-ext-link.is-link:hover & {
		opacity: 1;
		transform: translate(1px, -1px);
	}
}

.moments-item-music {
	margin-top: 0.6rem;
}

// --- Video ---
.moments-item-video {
	position: relative;
	overflow: hidden;
	margin-top: 0.6rem;
	padding-top: 56.25%;
	border-radius: 0.5rem;
	background: var(--c-bg-2);

	iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
	}
}

// --- Bottom ---
.moments-item-foot {
	display: flex;
	align-items: center;
	gap: 1rem;
	margin-top: 0.8rem;
	padding-top: 0.6rem;
	border-top: 1px solid var(--c-border);
}

.moments-item-reply {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0;
	border: none;
	background: transparent;
	font-size: 0.8rem;
	color: var(--c-text-3);
	transition: color 0.2s;
	cursor: pointer;

	&:hover {
		color: var(--c-primary);
	}
}

// --- Load More ---
.moments-load-more {
	display: flex;
	justify-content: center;
	margin: 1.2rem 0;
}

.moments-load-more-btn {
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

.moments-load-more-error {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.8rem;
	padding: 0.5rem 0;
	font-size: 0.85rem;
	color: var(--c-text-3);
}

// --- Responsive ---
@media (max-width: $breakpoint-phone) {
	.moments-page {
		padding: 1.5rem 0.8rem 1rem;
	}

	.moments-item {
		padding: 0.8rem;
	}

	.moments-item-ext-link {
		gap: 0.55rem;
		padding: 0.65rem;
	}

	.moments-item-ext-icon-wrap {
		width: 2rem;
		height: 2rem;
	}
}
</style>
