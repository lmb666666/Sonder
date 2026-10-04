<script setup lang="ts">
import type { MetingSong } from '@/composables/useMetingSong'
import { getSafeNavigationUrl } from '#shared/utils/link'
import { decideAudioLyrics, decideAudioSource, resolveAudioLyrics, resolveMetingSong } from '@/composables/useMetingSong'

const props = defineProps<{
	/** 音频直链；与 songUrl 同时提供时优先使用此项 */
	src?: string
	/** 网易云、QQ 音乐或酷狗歌曲页链接 */
	songUrl?: string
	/** 可选曲名，缺省时显示默认标题 */
	title?: string
	/** 可选作者 */
	artist?: string
	/** 可选封面图，缺省时显示音乐图标占位 */
	cover?: string
	/** 可选 LRC 歌词 */
	lrc?: string
}>()

const sourceDecision = computed(() => decideAudioSource(props.src, props.songUrl))
const appConfig = useAppConfig()
const metingStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const metingTrack = ref<MetingSong | undefined>()
let metingController: AbortController | undefined
const manualLyrics = ref('')
let lyricsController: AbortController | undefined

async function resolveMetingSource() {
	metingController?.abort()
	metingTrack.value = undefined
	if (sourceDecision.value.mode !== 'meting') {
		metingStatus.value = 'idle'
		return
	}

	const controller = new AbortController()
	metingController = controller
	metingStatus.value = 'loading'
	const track = await resolveMetingSong(sourceDecision.value.songUrl, { signal: controller.signal, metingApis: appConfig.features.music.metingApis })
	if (controller.signal.aborted || metingController !== controller)
		return
	metingTrack.value = track
	metingStatus.value = track ? 'ready' : 'error'
}

watch(() => sourceDecision.value.mode === 'meting' ? sourceDecision.value.songUrl : '', () => {
	if (import.meta.client)
		resolveMetingSource()
})

async function resolveManualLyrics() {
	lyricsController?.abort()
	manualLyrics.value = ''
	if (sourceDecision.value.mode !== 'manual')
		return

	const source = decideAudioLyrics(props.lrc)
	if (source.mode !== 'external')
		return

	const controller = new AbortController()
	lyricsController = controller
	const lyrics = await resolveAudioLyrics(source.url, { signal: controller.signal })
	if (controller.signal.aborted || lyricsController !== controller)
		return
	manualLyrics.value = lyrics
}

function sourceIdentity() {
	const source = sourceDecision.value
	if (source.mode === 'manual')
		return source.src
	if (source.mode === 'meting')
		return source.songUrl
	return ''
}

watch(() => [sourceDecision.value.mode, sourceIdentity(), props.lrc], () => {
	if (import.meta.client)
		resolveManualLyrics()
})

const audioSrc = computed(() => sourceDecision.value.mode === 'manual' ? sourceDecision.value.src : metingTrack.value?.url || '')
const audioTitle = computed(() => sourceDecision.value.mode === 'meting' ? metingTrack.value?.title : props.title)
const audioArtist = computed(() => sourceDecision.value.mode === 'meting' ? metingTrack.value?.artist : props.artist)
const audioCover = computed(() => sourceDecision.value.mode === 'meting' ? metingTrack.value?.cover : props.cover)
const audioLrc = computed(() => sourceDecision.value.mode === 'meting' ? metingTrack.value?.lyrics : manualLyrics.value)
const sourceError = computed(() => sourceDecision.value.mode === 'meting' && metingStatus.value === 'error')
const sourceFallbackUrl = computed(() => sourceDecision.value.mode === 'meting' ? getSafeNavigationUrl(sourceDecision.value.songUrl) : undefined)
const isMetingLoading = computed(() => sourceDecision.value.mode === 'meting' && metingStatus.value !== 'ready' && !sourceError.value)

const SPEEDS = [1, 1.25, 1.5, 2]
const displayTitle = computed(() => audioTitle.value?.trim() || '未命名音频')
const displayArtist = computed(() => audioArtist.value?.trim() || '无作者')
const lyrics = computed(() => {
	const lines: { time: number, text: string }[] = []
	for (const line of (audioLrc.value || '').split(/\r?\n/)) {
		const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)]
		const text = line.replace(/(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/g, '').trim()
		if (!text || /^(?:作词作曲|作詞作曲|作词|作詞|作曲|编曲|編曲|演唱|歌手|词曲|詞曲|制作人|製作人|制作|製作|填词|填詞|lyricist|lyrics by|composer|music by|arranger|arranged by|vocal(?:s|ist)?|singer|artist|producer|produced by)(?:\s*[:：-]|\s*$)/i.test(text))
			continue
		for (const match of matches) {
			const fraction = match[3] ? Number(`0.${match[3]}`) : 0
			lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text })
		}
	}
	return lines.sort((a, b) => a.time - b.time)
})

const audioEl = useTemplateRef<HTMLAudioElement>('audio')
const progressTrack = useTemplateRef<HTMLElement>('track')
const lyricsViewport = useTemplateRef<HTMLElement>('lyricsViewport')

const isPlaying = ref(false)
const isLoading = ref(false)
const isDragging = ref(false)
const isError = ref(false)
const currentTime = ref(0)
const duration = ref(Number.NaN)
const buffered = ref(0)
const speedIndex = ref(0)

const speed = computed(() => SPEEDS[speedIndex.value] ?? SPEEDS[0]!)
const activeLyricIndex = computed(() => {
	let index = -1
	for (let i = 0; i < lyrics.value.length && lyrics.value[i]!.time <= currentTime.value; i++)
		index = i
	return index
})
// 动态切换的图标强制 svg 模式：CSS 模式的类样式仅服务端生成，客户端切到未渲染过的类会丢 mask 导致图标消失
const stateIcon = computed(() => {
	if (isLoading.value)
		return 'tabler:loader-2'
	return isPlaying.value ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'
})

const playedPct = computed(() => {
	if (!Number.isFinite(duration.value) || duration.value <= 0)
		return '0%'
	return `${Math.min(currentTime.value / duration.value * 100, 100)}%`
})
const ariaMax = computed(() => Number.isFinite(duration.value) ? Math.round(duration.value) : 0)

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0)
		return '00:00'
	const s = Math.floor(seconds % 60).toString().padStart(2, '0')
	const mm = (Math.floor(seconds / 60) % 60).toString().padStart(2, '0')
	const h = Math.floor(seconds / 3600)
	if (h > 0)
		return `${h}:${mm}:${s}`
	return `${mm}:${s}`
}

// --- 播放控制 ---
async function togglePlay() {
	const audio = audioEl.value
	if (!audio)
		return

	if (isError.value) {
		// 错误后重试：重新加载再播放
		isError.value = false
		isLoading.value = true
		audio.load()
	}

	try {
		if (audio.paused)
			await audio.play()
		else
			audio.pause()
	}
	catch (e) {
		if ((e as DOMException)?.name !== 'AbortError') {
			isError.value = true
			isLoading.value = false
			isPlaying.value = false
		}
	}
}

function onPlay() {
	// 同页多实例互斥：开始播放前暂停上一个实例
	if (activeAudioEl && activeAudioEl !== audioEl.value)
		activeAudioEl.pause()
	activeAudioEl = audioEl.value ?? null
	isPlaying.value = true
	isLoading.value = false
	isError.value = false
}

function onPause() {
	isPlaying.value = false
	isLoading.value = false
}

function onEnded() {
	isPlaying.value = false
	currentTime.value = 0
	const audio = audioEl.value
	if (audio)
		audio.currentTime = 0
}

function onTimeUpdate() {
	const audio = audioEl.value
	if (audio)
		currentTime.value = audio.currentTime
}

watch(activeLyricIndex, async (index) => {
	if (index < 0)
		return
	await nextTick()
	const viewport = lyricsViewport.value
	const activeLine = viewport?.querySelector<HTMLElement>('[aria-current="true"]')
	if (!viewport || !activeLine)
		return
	viewport.scrollTo({
		top: activeLine.offsetTop - viewport.offsetTop - viewport.clientHeight / 2 + activeLine.clientHeight / 2,
		behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
	})
})

watch(() => [audioSrc.value, audioLrc.value], async () => {
	await nextTick()
	lyricsViewport.value?.scrollTo({ top: 0, behavior: 'instant' })
}, { immediate: true })

watch(audioSrc, async () => {
	clearAudioElement(audioEl.value)
	isError.value = false
	isLoading.value = false
	isPlaying.value = false
	duration.value = Number.NaN
	currentTime.value = 0
	buffered.value = 0
	await nextTick()
	syncPlaybackRate()
})

function onLoadedMetadata() {
	const audio = audioEl.value
	if (!audio)
		return
	syncPlaybackRate(audio)
	duration.value = audio.duration
	isLoading.value = false
}

function onProgress() {
	const audio = audioEl.value
	if (!audio || !audio.buffered.length || !Number.isFinite(duration.value) || duration.value <= 0)
		return
	buffered.value = audio.buffered.end(audio.buffered.length - 1) / duration.value * 100
}

function onError() {
	isError.value = true
	isLoading.value = false
	isPlaying.value = false
}

function syncPlaybackRate(audio = audioEl.value) {
	if (audio)
		audio.playbackRate = speed.value
}

function clearAudioElement(audio: HTMLAudioElement | null) {
	if (!audio)
		return
	audio.pause()
	audio.removeAttribute('src')
	audio.load()
	if (activeAudioEl === audio)
		activeAudioEl = null
}

// --- 进度条：点击 / 拖拽 / 键盘 seek ---
function seekTo(time: number) {
	const audio = audioEl.value
	if (!audio || !Number.isFinite(duration.value) || duration.value <= 0 || !Number.isFinite(time))
		return
	const clamped = Math.min(Math.max(time, 0), duration.value)
	audio.currentTime = clamped
	currentTime.value = clamped
}

function seekFromEvent(e: PointerEvent) {
	const track = progressTrack.value
	if (!track)
		return
	const rect = track.getBoundingClientRect()
	seekTo((e.clientX - rect.left) / rect.width * duration.value)
}

function onTrackPointerDown(e: PointerEvent) {
	isDragging.value = true
	// 先完成 seek，再尝试指针捕获：捕获失败不应影响 seek
	seekFromEvent(e)
	try {
		progressTrack.value?.setPointerCapture(e.pointerId)
	}
	catch {
		// 合成事件或指针已失效时捕获失败，忽略
	}
}

function onTrackPointerMove(e: PointerEvent) {
	if (isDragging.value)
		seekFromEvent(e)
}

function onTrackPointerUp(e: PointerEvent) {
	isDragging.value = false
	try {
		progressTrack.value?.releasePointerCapture(e.pointerId)
	}
	catch {
		// 未成功捕获时释放会抛错，忽略
	}
}

function onTrackKeydown(e: KeyboardEvent) {
	const audio = audioEl.value
	if (!audio)
		return
	if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
		seekTo(audio.currentTime + (e.key === 'ArrowLeft' ? -5 : 5))
		e.preventDefault()
	}
}

// --- 倍速 ---
function cycleSpeed() {
	speedIndex.value = (speedIndex.value + 1) % SPEEDS.length
	syncPlaybackRate()
}

onBeforeUnmount(() => {
	metingController?.abort()
	lyricsController?.abort()
	clearAudioElement(audioEl.value)
})

onMounted(() => syncPlaybackRate())
onMounted(resolveMetingSource)
onMounted(resolveManualLyrics)
</script>

<script lang="ts">
// 模块级状态：记录当前正在播放的实例，实现同页互斥播放
let activeAudioEl: HTMLAudioElement | null = null
</script>

<template>
<div class="audio-embed">
	<div v-if="isMetingLoading" class="audio-source-state" role="status">
		<Icon name="tabler:loader-2" class="audio-source-spin" />
		<span>正在解析歌曲…</span>
	</div>
	<div v-else-if="sourceError" class="audio-source-state audio-source-error" role="status">
		<Icon name="tabler:alert-triangle-filled" />
		<span>歌曲暂时无法播放</span>
		<a v-if="sourceFallbackUrl" :href="sourceFallbackUrl" target="_blank" rel="noopener noreferrer">打开原歌曲页</a>
	</div>
	<div v-else-if="!audioSrc" class="audio-source-state audio-source-error" role="status">
		<Icon name="tabler:alert-triangle-filled" />
		<span>未提供音频地址</span>
	</div>
	<template v-else>
		<audio
			ref="audio"
			class="audio-hidden"
			:src="audioSrc"
			preload="metadata"
			@play="onPlay"
			@pause="onPause"
			@ended="onEnded"
			@timeupdate="onTimeUpdate"
			@loadedmetadata="onLoadedMetadata"
			@progress="onProgress"
			@waiting="isLoading = true"
			@playing="isLoading = false"
			@error="onError"
		/>

		<template v-if="!isError">
			<button class="cover-box" :aria-label="isPlaying ? '暂停播放' : '开始播放'" @click="togglePlay">
				<img v-if="audioCover" :src="audioCover" class="cover-img" alt="" loading="lazy">
				<Icon v-else name="tabler:music" class="cover-fallback" />
				<span v-show="isPlaying" class="eq" aria-hidden="true">
					<i /><i /><i />
				</span>
			</button>

			<div class="embed-main" :class="{ 'has-empty-lyrics': !lyrics.length }">
				<div class="embed-line1">
					<div class="embed-track-info">
						<div class="embed-title" :title="displayTitle">
							{{ displayTitle }}
						</div>
						<div class="embed-artist" :title="displayArtist">
							{{ displayArtist }}
						</div>
					</div>
					<div v-if="lyrics.length" ref="lyricsViewport" class="lyrics" role="region" aria-label="歌词">
						<p
							v-for="(line, index) in lyrics"
							:key="`${line.time}-${index}`"
							class="lyrics-line"
							:aria-current="index === activeLyricIndex ? 'true' : undefined"
						>
							{{ line.text }}
						</p>
					</div>
					<div class="embed-ops">
						<button class="op-pill" :class="{ active: speed !== 1 }" aria-label="播放速度" @click="cycleSpeed">
							{{ speed }}x
						</button>
						<a class="op-icon" :href="audioSrc" download aria-label="下载音频">
							<Icon name="tabler:download" />
						</a>
					</div>
				</div>
				<div v-if="!lyrics.length" ref="lyricsViewport" class="lyrics lyrics-empty" role="region" aria-label="歌词">
					<p>无歌词</p>
				</div>
				<div class="embed-controls">
					<button class="play-btn" :class="{ playing: isPlaying }" :aria-label="isPlaying ? '暂停播放' : '开始播放'" @click="togglePlay">
						<Icon mode="svg" :name="stateIcon" :class="{ spin: isLoading }" />
					</button>
					<span class="time time-current" aria-hidden="true">{{ formatTime(currentTime) }}</span>
					<div
						ref="track"
						class="progress"
						:class="{ dragging: isDragging }"
						role="slider"
						tabindex="0"
						aria-label="播放进度"
						:aria-valuemin="0"
						:aria-valuemax="ariaMax"
						:aria-valuenow="Math.round(currentTime)"
						@pointerdown="onTrackPointerDown"
						@pointermove="onTrackPointerMove"
						@pointerup="onTrackPointerUp"
						@pointercancel="onTrackPointerUp"
						@keydown="onTrackKeydown"
					>
						<div class="progress-buffered" :style="{ width: `${buffered}%` }" />
						<div class="progress-played" :style="{ width: playedPct }" />
						<div class="progress-thumb" :style="{ left: playedPct }" />
					</div>
					<span class="time time-duration" aria-hidden="true">{{ formatTime(duration) }}</span>
				</div>
			</div>
		</template>

		<div v-else class="embed-error">
			<Icon name="tabler:alert-triangle-filled" class="error-icon" />
			<span class="error-text">音频加载失败</span>
			<a class="error-link" :href="audioSrc" download>下载音频</a>
		</div>
	</template>
</div>
</template>

<style lang="scss" scoped>
.audio-embed {
	display: grid;
	grid-template-columns: 5rem minmax(0, 1fr);
	align-items: center;
	gap: 0.75rem 1rem;
	padding: 0.9rem 1rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-md, 0.65rem);

	// 使用嵌套表面色，与文章页 / 动态卡片都保持明显对比 / Nested surface color keeps clear contrast on both article pages and moment cards
	background: var(--surface-nested);
	color: var(--c-text-1);

	.article & {
		margin: 2rem auto;
	}
}

.audio-source-state {
	display: flex;
	grid-column: 1 / -1;
	align-items: center;
	gap: 0.5rem;
	min-height: 3rem;
	padding: 0.7rem 0.85rem;
	font-size: var(--fs-sm);
	color: var(--c-text-3);
}

.audio-source-error > :first-child {
	color: var(--c-error);
}

.audio-source-state a {
	margin-left: auto;
	color: var(--c-primary);
}

.audio-source-spin {
	animation: audio-source-spin 0.9s linear infinite;
}

@keyframes audio-source-spin {
	to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
	.audio-source-spin {
		animation: none;
	}
}

.audio-hidden {
	display: none;
}

// --- 封面 ---
.cover-box {
	display: block;
	flex-shrink: 0;
	position: relative;
	overflow: hidden;
	width: 5rem;
	height: 5rem;
	padding: 0;
	border: none;
	border-radius: var(--radius-sm);
	background: var(--c-bg-soft);
	cursor: pointer;

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--c-border);
		pointer-events: none;
	}

	.cover-img {
		display: block;
		width: 100%;
		height: 100%;
		transition: transform 0.3s;
		object-fit: cover;
	}

	&:hover .cover-img {
		transform: scale(1.06);
	}

	.cover-fallback {
		position: absolute;
		top: 50%;
		left: 50%;

		// mask 图标无内容，不可用 fit-content（会塌缩为 0），需显式 1em 尺寸
		width: 1em;
		height: 1em;
		font-size: 1.8rem;
		color: var(--c-primary);
		transform: translate(-50%, -50%);
	}

	// 播放中的均衡器动画徽章
	.eq {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		position: absolute;
		right: 0.3rem;
		bottom: 0.3rem;
		width: 1.45rem;
		height: 1.15rem;
		padding: 0.24rem 0.3rem;
		border-radius: 4px;
		box-sizing: border-box;
		background: rgb(0 0 0 / 45%);

		i {
			width: 2px;
			height: 100%;
			border-radius: 1px;
			background: #FFF;
			transform-origin: bottom;
			animation: eq-bounce 0.9s ease-in-out infinite;

			&:nth-child(2) {
				animation-delay: 0.25s;
			}

			&:nth-child(3) {
				animation-delay: 0.5s;
			}
		}
	}
}

@keyframes eq-bounce {
	0%, 100% {
		transform: scaleY(0.3);
	}

	50% {
		transform: scaleY(1);
	}
}

// --- 主区域 ---
.embed-main {
	display: grid;
	grid-template-columns: minmax(7rem, 0.8fr) minmax(8rem, 1fr) auto;
	grid-template-rows: auto auto;
	gap: 0.35rem;
	width: 100%;
	min-width: 0;

	&.has-empty-lyrics {
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		grid-template-rows: auto auto;
	}
}

.lyrics {
	overflow: hidden auto;
	height: 3.4rem;
	min-width: 8rem;
	padding: 0.15rem 0;
	border: 0;
	background: transparent;
	overscroll-behavior: contain;
	scroll-behavior: smooth;
	scrollbar-width: none;
	-ms-overflow-style: none;

	&::-webkit-scrollbar {
		display: none;
	}
}

.lyrics-line {
	overflow-wrap: anywhere;
	margin: 0;
	padding: 0.12rem 0;
	font-size: var(--fs-sm);
	line-height: 1.55;
	color: var(--c-text-3);
}

.lyrics-line[aria-current="true"] {
	font-weight: 600;
	color: var(--c-primary);
}

.lyrics-empty {
	display: flex;
	grid-column: 2;
	grid-row: 1;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	height: 3.4rem;
	padding: 0;
	font-size: var(--fs-xs);
	text-align: center;
	color: var(--c-text-3);

	p {
		margin: 0;
	}
}

.embed-line1 {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: minmax(7rem, 0.8fr) minmax(8rem, 1fr) auto;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;

	.has-empty-lyrics & {
		display: contents;
	}
}

.embed-track-info {
	min-width: 0;

	// 无歌词时的网格定位仅桌面需要，避免泄漏进移动端布局 / The no-lyrics grid placement is desktop-only; it must not leak into the mobile layout
	@media (min-width: ($breakpoint-phone + 1px)) {
		.has-empty-lyrics & {
			grid-column: 1;
			grid-row: 1;
			align-self: center;
		}
	}
}

.embed-title {
	overflow: hidden;
	min-width: 0;
	font-size: var(--fs-sm);
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
}

.embed-artist {
	overflow-wrap: anywhere;
	margin-top: 0.12rem;
	font-size: var(--fs-xs);
	color: var(--c-text-3);
}

.embed-ops {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: 0.25rem;

	@media (min-width: ($breakpoint-phone + 1px)) {
		.has-empty-lyrics & {
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
		}
	}
}

.op-pill {
	min-width: 2.75rem;
	min-height: 2.25rem;
	padding: 0 0.65rem;
	border: 0;
	border-radius: 0;
	background: transparent;
	font-size: var(--fs-xs);
	line-height: 1.4;
	color: var(--c-text-3);
	transition: none;
	cursor: pointer;
	font-variant-numeric: tabular-nums;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.op-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.7rem;
	height: 1.7rem;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	font-size: 1.05rem;
	text-decoration: none;
	color: var(--c-text-3);
	transition: none;
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

// --- 控制行：播放钮、时间与进度条 ---
.embed-controls {
	display: flex;
	grid-column: 1 / -1;
	align-items: center;
	gap: 0.55rem;
	min-width: 0;
	margin-top: 0.25rem;

	@media (min-width: ($breakpoint-phone + 1px)) {
		.has-empty-lyrics & {
			grid-row: 2;
		}
	}
}

.play-btn {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	padding: 0;
	border: none;
	border-radius: 50%;
	box-shadow: none;
	background: var(--c-primary);
	font-size: 1.3rem;
	color: #FFF;
	transition: none;
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.time {
	flex-shrink: 0;
	font-size: var(--fs-xs);
	font-variant-numeric: tabular-nums;
	color: var(--c-text-3);
}

.time-current {
	min-width: 4ch;
	text-align: right;
}

.time-duration {
	margin-left: 0;
}

.progress {
	flex: 1;
	position: relative;
	height: 1.55rem;
	min-width: 0;
	cursor: pointer;
	touch-action: none;

	&::before {
		content: "";
		position: absolute;
		top: 50%;
		right: 0;
		left: 0;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--c-border);
		transform: translateY(-50%);
		transition: height 0.15s;
	}

	&:hover::before,
	&.dragging::before {
		height: 7px;
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.progress-buffered,
.progress-played,
.progress-thumb {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
}

.progress-buffered,
.progress-played {
	left: 0;
	height: 5px;
	border-radius: var(--radius-full);
	transition: height 0.15s;
}

.progress:hover .progress-buffered,
.progress.dragging .progress-buffered,
.progress:hover .progress-played,
.progress.dragging .progress-played {
	height: 7px;
}

.progress-buffered {
	background: var(--c-bg-soft);
}

.progress-played {
	background: var(--c-primary);
}

.progress-thumb {
	opacity: 0;
	left: 0;
	width: 12px;
	height: 12px;
	border: 2.5px solid var(--c-primary);
	border-radius: 50%;
	box-shadow: var(--shadow-card);
	background: var(--c-bg-1);
	transform: translate(-50%, -50%);
	transition: opacity 0.15s;
}

.progress:hover .progress-thumb,
.progress.dragging .progress-thumb,
.progress:focus-visible .progress-thumb {
	opacity: 1;
}

// --- 错误态 ---
.embed-error {
	display: flex;
	grid-column: 1 / -1;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--fs-sm);
	color: var(--c-text-3);

	.error-icon {
		flex-shrink: 0;
		font-size: 1.2rem;
		color: var(--c-error);
	}

	.error-link {
		margin-left: auto;
		font-size: var(--fs-xs);
		color: var(--c-primary);
	}
}

.spin {
	animation: embed-spin 1s linear infinite;
}

.audio-embed :focus-visible {
	outline: 2px solid var(--c-primary);
	outline-offset: 2px;
}

@keyframes embed-spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.spin,
	.eq i {
		animation: none;
	}

	.play-btn,
	.op-pill,
	.op-icon {
		transition: none;
	}

	.play-btn:hover,
	.play-btn:active,
	.op-pill:active,
	.op-icon:active {
		transform: none;
	}

	.lyrics {
		scroll-behavior: auto;
	}
}

// --- 响应式 ---
// 移动端三区布局：左上封面、右上歌曲信息与操作、下方单行控制区，整体更扁
// Mobile three-zone layout: cover on the top-left, track info and actions on the top-right, one compact control row at the bottom
@media (max-width: $breakpoint-phone) {
	.audio-embed {
		grid-template-areas:
			"cover info ops"
			"cover lyr  lyr"
			"ctrl  ctrl ctrl";
		grid-template-columns: 3.4rem minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.4rem 0.7rem;
		min-width: 0;
		padding: 0.6rem 0.7rem;
	}

	.cover-box {
		grid-area: cover;
		align-self: center;
		width: 3.4rem;
		height: 3.4rem;
		min-width: 0;
	}

	.embed-main {
		display: contents;
		min-width: 0;
	}

	.embed-line1 {
		display: contents;
		min-width: 0;
	}

	.embed-track-info {
		grid-area: info;
		min-width: 0;
	}

	.embed-title {
		overflow: hidden;
		min-width: 0;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.embed-artist {
		overflow: hidden;
		margin-top: 0.05rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.embed-ops {
		grid-area: ops;
		place-self: start end;
		gap: 0.1rem;
	}

	.embed-main .lyrics {
		grid-area: lyr;
		width: 100%;
		height: 2.6rem;
		min-width: 0;
		padding-inline: 0.1rem;
		box-sizing: border-box;
	}

	// 无歌词时不再渲染占位块，卡片更扁 / Drop the empty-lyrics placeholder for a flatter card
	.embed-main .lyrics-empty {
		display: none;
	}

	.embed-controls {
		grid-area: ctrl;
		gap: 0.45rem;
		min-width: 0;
		margin-top: 0;
	}

	.play-btn {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		box-sizing: border-box;
		font-size: 1.15rem;
	}

	.progress {
		width: 100%;
		height: auto;
		min-width: 0;
		box-sizing: border-box;
	}

	.op-pill {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		min-width: 0;
		min-height: 0;
		padding: 0.2rem;
		border: 0;
		box-sizing: border-box;
		background: transparent;
		font-size: 0.68rem;
		line-height: 2.35rem;
	}

	.op-icon {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0.2rem;
		border: 0;
		box-sizing: border-box;
		background: transparent;
	}

	.time-current,
	.time-duration {
		font-size: 0.68rem;
	}
}
</style>
