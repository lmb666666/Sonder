<script setup lang="ts">
import type { MetingPlaylist, MetingPlaylistTrack } from '~/composables/useMetingSong'
import type { HobbyPlaylist } from '~/types/hobby'
import { getSafeNavigationUrl } from '#shared/utils/link'
import { findActiveLyricIndex, formatAudioDuration, parseLrc } from '~/utils/audio'

const props = defineProps<{
	playlist: HobbyPlaylist
}>()

type PlayerState = 'unconfigured' | 'loading' | 'invalid' | 'error' | 'empty' | 'ready'
type PlayerSource = MetingPlaylist['source']

const appConfig = useAppConfig()
const metingApis = computed(() => appConfig.features.music.metingApis)
const hasEndpoints = computed(() => metingApis.value.length > 0)
const playlistUrl = computed(() => getSafeNavigationUrl(props.playlist.url))
const parsedSource = computed(() => playlistUrl.value ? parseMetingPlaylistUrl(playlistUrl.value) : undefined)
const playlistTitle = computed(() => props.playlist.title?.trim() || '歌单')
const playlistDesc = computed(() => props.playlist.description?.trim() || '')
const state = ref<PlayerState>(hasEndpoints.value ? 'loading' : 'unconfigured')
const source = ref<PlayerSource>()
const tracks = ref<MetingPlaylistTrack[]>([])
const currentIndex = ref(0)
const currentTrack = computed(() => tracks.value[currentIndex.value])
const audioSrc = computed(() => currentTrack.value?.url || '')
const sourceLabel = computed(() => {
	const server = (source.value ?? parsedSource.value)?.server
	if (server === 'tencent')
		return 'QQ 音乐'
	if (server === 'netease')
		return '网易云音乐'
	return '歌单来源'
})

let playlistController: AbortController | undefined
let lyricsController: AbortController | undefined

const audioEl = useTemplateRef<HTMLAudioElement>('audio')
const progressEl = useTemplateRef<HTMLElement>('progress')
const lyricsViewport = useTemplateRef<HTMLElement>('lyricsViewport')
const trackListEl = useTemplateRef<HTMLElement>('trackList')

const isPlaying = ref(false)
const isLoading = ref(false)
const isDragging = ref(false)
const isTrackError = ref(false)
const currentTime = ref(0)
const duration = ref(Number.NaN)
const buffered = ref(0)
const volume = ref(0.8)
const muted = ref(false)
const speedIndex = ref(0)
const sideTab = ref<'none' | 'queue' | 'lyrics'>('none')
const showLyrics = computed(() => sideTab.value === 'lyrics')
const lyricsText = ref('')
const lyricsCache = new Map<string, string>()

const SPEEDS = [1, 1.25, 1.5, 2]
const VOLUME_KEY = 'meting:player:volume'
const MUTED_KEY = 'meting:player:muted'

const speed = computed(() => SPEEDS[speedIndex.value] ?? SPEEDS[0]!)
const lyrics = computed(() => parseLrc(lyricsText.value))
const activeLyricIndex = computed(() => findActiveLyricIndex(lyrics.value, currentTime.value))
const activeLyric = computed(() => activeLyricIndex.value >= 0 ? lyrics.value[activeLyricIndex.value]?.text ?? '' : '')

const playedPct = computed(() => {
	if (!Number.isFinite(duration.value) || duration.value <= 0)
		return '0%'
	return `${Math.min(currentTime.value / duration.value * 100, 100)}%`
})
const bufferedPct = computed(() => `${Math.min(buffered.value, 100)}%`)
const ariaMax = computed(() => Number.isFinite(duration.value) ? Math.round(duration.value) : 0)
const playIcon = computed(() => {
	if (isLoading.value && isPlaying.value)
		return 'tabler:loader-2'
	return isPlaying.value ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'
})
const volumeIcon = computed(() => (muted.value || volume.value === 0) ? 'tabler:volume-off' : 'tabler:volume')

async function load(force = false) {
	playlistController?.abort()
	lyricsController?.abort()
	audioEl.value?.pause()
	source.value = undefined
	tracks.value = []
	currentIndex.value = 0
	currentTime.value = 0
	duration.value = Number.NaN
	buffered.value = 0
	lyricsText.value = ''
	isPlaying.value = false
	isLoading.value = false
	isDragging.value = false
	isTrackError.value = false

	if (!hasEndpoints.value) {
		state.value = 'unconfigured'
		return
	}
	if (!playlistUrl.value || !parseMetingPlaylistUrl(playlistUrl.value)) {
		state.value = 'invalid'
		return
	}

	state.value = 'loading'
	const controller = new AbortController()
	playlistController = controller
	const result = await resolveMetingPlaylist(props.playlist.url, {
		signal: controller.signal,
		metingApis: metingApis.value,
		force,
	})
	if (controller.signal.aborted || playlistController !== controller)
		return
	if (!result) {
		state.value = 'error'
		return
	}

	source.value = result.source
	tracks.value = result.tracks
	currentIndex.value = 0
	state.value = result.tracks.length ? 'ready' : 'empty'
}

async function playCurrent() {
	const audio = audioEl.value
	if (!audio || !audioSrc.value)
		return

	if (isTrackError.value) {
		isTrackError.value = false
		isLoading.value = true
		audio.load()
	}

	try {
		await audio.play()
	}
	catch (error) {
		if ((error as DOMException)?.name === 'AbortError')
			return
		isLoading.value = false
		// 浏览器的自动播放拦截不是歌曲错误
		if ((error as DOMException)?.name !== 'NotAllowedError')
			isTrackError.value = true
	}
}

async function togglePlay() {
	const audio = audioEl.value
	if (!audio)
		return
	if (audio.paused)
		await playCurrent()
	else
		audio.pause()
}

function switchTrack(index: number, autoplay = false) {
	if (!tracks.value.length)
		return
	currentIndex.value = (index + tracks.value.length) % tracks.value.length
	if (autoplay)
		nextTick(playCurrent)
}

function nextTrack(forcePlay = false) {
	const audio = audioEl.value
	const wasPlaying = audio ? !audio.paused : false
	if (audio)
		audio.currentTime = 0
	switchTrack(currentIndex.value + 1, forcePlay || wasPlaying)
}

function prevTrack(forcePlay = false) {
	const audio = audioEl.value
	const wasPlaying = audio ? !audio.paused : false
	if (audio)
		audio.currentTime = 0
	switchTrack(currentIndex.value - 1, forcePlay || wasPlaying)
}

function onPlay() {
	document.querySelectorAll('audio').forEach((element) => {
		if (element !== audioEl.value)
			element.pause()
	})
	isPlaying.value = true
	isLoading.value = false
	isTrackError.value = false
}

function onPause() {
	isPlaying.value = false
	isLoading.value = false
}

function onTimeUpdate() {
	const audio = audioEl.value
	if (audio)
		currentTime.value = audio.currentTime
}

function onLoadedMetadata() {
	const audio = audioEl.value
	if (!audio)
		return
	duration.value = audio.duration
	audio.volume = volume.value
	audio.muted = muted.value
	audio.playbackRate = speed.value
}

function onProgress() {
	const audio = audioEl.value
	if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
		return
	const end = audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0
	buffered.value = end / audio.duration * 100
}

function onAudioError() {
	if (!audioSrc.value)
		return
	isTrackError.value = true
	isPlaying.value = false
	isLoading.value = false
}

function seekFromPointer(event: PointerEvent) {
	const el = progressEl.value
	const audio = audioEl.value
	if (!el || !audio || !Number.isFinite(duration.value) || duration.value <= 0)
		return
	const rect = el.getBoundingClientRect()
	const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
	audio.currentTime = ratio * duration.value
	currentTime.value = audio.currentTime
}

function onProgressPointerDown(event: PointerEvent) {
	isDragging.value = true
	seekFromPointer(event)
	;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onProgressPointerMove(event: PointerEvent) {
	if (isDragging.value)
		seekFromPointer(event)
}

function onProgressPointerUp() {
	isDragging.value = false
}

function onProgressKeydown(event: KeyboardEvent) {
	const audio = audioEl.value
	if (!audio)
		return
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
		event.preventDefault()
		const delta = event.key === 'ArrowRight' ? 5 : -5
		audio.currentTime = Math.min(Math.max(audio.currentTime + delta, 0), duration.value || 0)
	}
}

function cycleSpeed() {
	speedIndex.value = (speedIndex.value + 1) % SPEEDS.length
}

function toggleMute() {
	muted.value = !muted.value
}

async function loadLyrics() {
	lyricsController?.abort()
	lyricsText.value = ''
	const raw = currentTrack.value?.lrc
	if (!raw)
		return
	if (raw.includes('[')) {
		lyricsText.value = raw
		return
	}
	const cached = lyricsCache.get(raw)
	if (cached !== undefined) {
		lyricsText.value = cached
		return
	}

	const controller = new AbortController()
	lyricsController = controller
	const text = await resolveAudioLyrics(raw, { signal: controller.signal })
	if (controller.signal.aborted || lyricsController !== controller || !text)
		return
	lyricsCache.set(raw, text)
	lyricsText.value = text
}

function scrollLyrics() {
	const viewport = lyricsViewport.value
	const line = viewport?.querySelector<HTMLElement>('.lyric-line.active')
	if (!viewport || !line)
		return
	const viewportRect = viewport.getBoundingClientRect()
	const lineRect = line.getBoundingClientRect()
	const top = viewport.scrollTop + lineRect.top - viewportRect.top - (viewport.clientHeight - lineRect.height) / 2
	viewport.scrollTo({ top: Math.max(top, 0), behavior: 'auto' })
}

function toggleSide(tab: 'queue' | 'lyrics') {
	if (sideTab.value === tab) {
		sideTab.value = 'none'
		return
	}
	sideTab.value = tab
	if (tab === 'lyrics' && !lyricsText.value)
		loadLyrics()
	nextTick(tab === 'lyrics' ? scrollLyrics : scrollCurrentRow)
}

function scrollCurrentRow() {
	const list = trackListEl.value
	const row = list?.querySelector<HTMLElement>('.queue-row.is-current')
	if (!list || !row)
		return
	const listRect = list.getBoundingClientRect()
	const rowRect = row.getBoundingClientRect()
	const top = list.scrollTop + rowRect.top - listRect.top - (list.clientHeight - rowRect.height) / 2
	list.scrollTo({ top: Math.max(top, 0), behavior: 'auto' })
}

function restoreVolume() {
	try {
		const stored = Number(localStorage.getItem(VOLUME_KEY))
		if (Number.isFinite(stored) && stored >= 0 && stored <= 1)
			volume.value = stored
		muted.value = localStorage.getItem(MUTED_KEY) === '1'
	}
	catch {
		// 忽略存储不可用
	}
}

watch(audioSrc, () => {
	currentTime.value = 0
	duration.value = Number.NaN
	buffered.value = 0
	isTrackError.value = false
	lyricsText.value = ''
	loadLyrics()
})

watch(currentIndex, () => {
	nextTick(scrollCurrentRow)
})

watch(activeLyricIndex, () => {
	if (showLyrics.value)
		nextTick(scrollLyrics)
})

watch([volume, muted], () => {
	const audio = audioEl.value
	if (audio) {
		audio.volume = volume.value
		audio.muted = muted.value
	}
	try {
		localStorage.setItem(VOLUME_KEY, String(volume.value))
		localStorage.setItem(MUTED_KEY, muted.value ? '1' : '0')
	}
	catch {
		// 忽略存储不可用
	}
})

watch(speed, (value) => {
	const audio = audioEl.value
	if (audio)
		audio.playbackRate = value
})

watch(() => props.playlist.url, () => {
	if (import.meta.client)
		load()
})

onMounted(() => {
	restoreVolume()
	if (hasEndpoints.value)
		load()
})

onBeforeUnmount(() => {
	playlistController?.abort()
	lyricsController?.abort()
	const audio = audioEl.value
	if (audio) {
		audio.pause()
		audio.removeAttribute('src')
		audio.load()
	}
})
</script>

<template>
<section class="hobby-player">
	<header class="player-head">
		<div class="player-heading">
			<h3 class="player-title text-creative">
				{{ playlistTitle }}
			</h3>
			<p class="player-sub">
				<UtilLink v-if="playlistUrl" :to="playlistUrl" class="player-source">
					{{ sourceLabel }}
					<Icon name="tabler:arrow-up-right" aria-hidden="true" />
				</UtilLink>
				<span v-if="playlistDesc" class="player-desc"> · {{ playlistDesc }}</span>
			</p>
		</div>
	</header>

	<div v-if="state === 'unconfigured'" class="player-state centered">
		<Icon name="tabler:music-off" class="player-state-icon" />
		<p>还没有配置 Meting 服务</p>
		<span>在 <code>blog.config.ts</code> 的 <code>features.music.metingApis</code> 填入端点后，这里就能加载歌单。</span>
	</div>

	<div v-else-if="state === 'invalid'" class="player-state centered">
		<Icon name="tabler:link-off" class="player-state-icon" />
		<p>歌单链接无法识别</p>
		<span>支持网易云与 QQ 音乐的公开歌单链接。</span>
	</div>

	<div v-else-if="state === 'loading'" class="player-state centered">
		<Icon name="tabler:loader-2" class="player-state-icon spinning" />
		<p>正在加载歌单…</p>
	</div>

	<div v-else-if="state === 'error'" class="player-state centered">
		<Icon name="tabler:alert-triangle" class="player-state-icon" />
		<p>歌单加载失败</p>
		<span>检查 Meting 端点是否可用，或稍后重试。</span>
		<button class="player-retry" type="button" @click="load(true)">
			重试
		</button>
	</div>

	<div v-else-if="state === 'empty'" class="player-state centered">
		<Icon name="tabler:mood-empty" class="player-state-icon" />
		<p>歌单里没有可播放的歌曲</p>
	</div>

	<template v-else-if="state === 'ready' && currentTrack">
		<audio
			ref="audio"
			class="player-audio"
			:src="audioSrc"
			preload="metadata"
			@play="onPlay"
			@pause="onPause"
			@ended="nextTrack(true)"
			@timeupdate="onTimeUpdate"
			@loadedmetadata="onLoadedMetadata"
			@progress="onProgress"
			@waiting="isLoading = true"
			@playing="isLoading = false"
			@error="onAudioError"
		/>

		<div class="player-body" :class="{ 'has-side': sideTab !== 'none' }">
			<div class="player-main">
				<div class="player-now">
					<div class="player-cover">
						<HobbyCover
							:src="currentTrack.cover"
							:title="currentTrack.title"
							icon="tabler:music"
							shape="square"
						/>
					</div>

					<div class="player-info">
						<p class="player-track-title text-creative">
							{{ currentTrack.title }}
						</p>
						<p class="player-artist">
							{{ currentTrack.artist || '未知歌手' }}
						</p>
						<p v-if="activeLyric && !showLyrics" class="player-lyric">
							{{ activeLyric }}
						</p>
						<p v-if="isTrackError" class="player-error">
							该曲目暂时无法播放
							<button type="button" @click="nextTrack(true)">
								下一首
							</button>
						</p>
					</div>
				</div>

				<div class="player-actions">
					<div class="player-progress-row">
						<span class="player-time">{{ formatAudioDuration(currentTime) }}</span>
						<div
							ref="progress"
							class="progress"
							:class="{ dragging: isDragging }"
							role="slider"
							tabindex="0"
							aria-label="播放进度"
							:aria-valuemin="0"
							:aria-valuemax="ariaMax"
							:aria-valuenow="Math.round(currentTime)"
							@pointerdown="onProgressPointerDown"
							@pointermove="onProgressPointerMove"
							@pointerup="onProgressPointerUp"
							@pointercancel="onProgressPointerUp"
							@keydown="onProgressKeydown"
						>
							<div class="progress-buffered" :style="{ width: bufferedPct }" />
							<div class="progress-played" :style="{ width: playedPct }" />
							<div class="progress-thumb" :style="{ left: playedPct }" />
						</div>
						<span class="player-time">{{ formatAudioDuration(duration) }}</span>
					</div>

					<div class="player-controls">
						<span class="control-group">
							<button class="ctrl-btn" type="button" aria-label="上一首" @click="prevTrack()">
								<Icon name="tabler:player-track-prev-filled" />
							</button>
							<button class="play-btn" type="button" :aria-label="isPlaying ? '暂停播放' : '开始播放'" @click="togglePlay">
								<Icon :name="playIcon" :class="{ spinning: playIcon === 'tabler:loader-2' }" />
							</button>
							<button class="ctrl-btn" type="button" aria-label="下一首" @click="nextTrack()">
								<Icon name="tabler:player-track-next-filled" />
							</button>
						</span>

						<span class="control-group">
							<button class="speed-btn" type="button" aria-label="切换播放速度" @click="cycleSpeed">
								{{ speed }}×
							</button>
							<span class="volume">
								<button class="ctrl-btn" type="button" :aria-label="muted ? '取消静音' : '静音'" @click="toggleMute">
									<Icon :name="volumeIcon" />
								</button>
								<input
									v-model.number="volume"
									class="volume-range"
									type="range"
									min="0"
									max="1"
									step="0.01"
									aria-label="音量"
								>
							</span>
						</span>
					</div>

					<div class="player-switches">
						<button
							class="switch-btn"
							type="button"
							:class="{ active: sideTab === 'queue' }"
							:aria-expanded="sideTab === 'queue'"
							@click="toggleSide('queue')"
						>
							<Icon name="tabler:list" aria-hidden="true" />
							播放列表
							<span>{{ tracks.length }}</span>
						</button>
						<button
							class="switch-btn"
							type="button"
							:class="{ active: showLyrics }"
							:aria-expanded="showLyrics"
							@click="toggleSide('lyrics')"
						>
							<Icon name="tabler:microphone" aria-hidden="true" />
							歌词
						</button>
					</div>
				</div>
			</div>

			<aside v-if="sideTab !== 'none'" class="player-side" :aria-label="showLyrics ? '歌词' : '播放列表'">
				<div class="player-side-head">
					<span>{{ showLyrics ? '歌词' : '播放列表' }}</span>
					<span v-if="!showLyrics">{{ tracks.length }} 首</span>
				</div>

				<div v-if="sideTab === 'queue'" ref="trackList" class="side-list queue-list scrollcheck-y scrollbar-hidden">
					<button
						v-for="(track, index) in tracks"
						:key="`${track.url}-${index}`"
						class="queue-row"
						:class="{ 'is-current': index === currentIndex }"
						:aria-current="index === currentIndex ? 'true' : undefined"
						type="button"
						@click="switchTrack(index, true)"
					>
						<span class="queue-index">{{ String(index + 1).padStart(2, '0') }}</span>
						<span class="queue-title">{{ track.title }}</span>
						<span class="queue-artist">{{ track.artist }}</span>
						<Icon
							v-if="index === currentIndex"
							:name="isPlaying ? 'tabler:volume' : 'tabler:player-play'"
							class="queue-state"
							aria-hidden="true"
						/>
					</button>
				</div>

				<div v-else ref="lyricsViewport" class="side-list lyrics-list scrollcheck-y scrollbar-hidden">
					<p v-for="(line, index) in lyrics" :key="index" class="lyric-line" :class="{ active: index === activeLyricIndex }">
						{{ line.text }}
					</p>
					<p v-if="!lyrics.length" class="lyric-empty">
						暂无歌词
					</p>
				</div>
			</aside>
		</div>
	</template>
</section>
</template>

<style lang="scss" scoped>
.hobby-player {
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	background: var(--surface-card);
	animation: float-in 0.3s ease backwards;
}

.player-head {
	display: flex;
	align-items: flex-start;
	padding: 0.9rem 1.1rem;
	border-bottom: 1px solid var(--c-border);
}

.player-heading {
	min-width: 0;
}

.player-title {
	font-size: 1rem;
	font-weight: 650;
	line-height: 1.25;
	color: var(--c-text-1);
}

.player-sub {
	margin-top: 0.15rem;
	font-size: var(--fs-xs);
	color: var(--c-text-3);
}

.player-source {
	color: inherit;
	transition: color 0.2s;

	&:hover {
		color: var(--c-primary);
	}

	.iconify {
		font-size: 0.85em;
	}
}

.player-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr);

	&.has-side {
		grid-template-columns: minmax(0, 2.2fr) minmax(16rem, 1fr);
	}
}

.player-main {
	min-width: 0;
	padding: 1.1rem 1.2rem;
}

.player-now {
	display: grid;
	grid-template-columns: 8rem minmax(0, 1fr);
	align-items: center;
	gap: 1.1rem;
}

.player-cover {
	overflow: hidden;
	width: 8rem;
	height: 8rem;
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow-card);
}

.player-info {
	min-width: 0;
}

.player-track-title {
	overflow: hidden;
	font-size: 1.3rem;
	font-weight: 650;
	line-height: 1.25;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
}

.player-artist {
	margin-top: 0.15rem;
	font-size: var(--fs-sm);
	color: var(--c-text-2);
}

.player-lyric {
	overflow: hidden;
	margin-top: 0.2rem;
	font-size: var(--fs-xs);
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}

.player-error {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin-top: 0.2rem;
	font-size: var(--fs-xs);
	color: var(--c-error);

	button {
		padding: 0 0.2rem;
		border: 0;
		background: transparent;
		font-size: inherit;
		text-decoration: underline;
		color: inherit;
	}
}

.player-actions {
	margin-top: 0.8rem;
}

.player-progress-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.player-time {
	flex-shrink: 0;
	font-family: var(--font-monospace);
	font-size: 0.66rem;
	font-variant-numeric: tabular-nums;
	color: var(--c-text-3);
}

.progress {
	flex: 1;
	position: relative;
	height: 1.3rem;
	cursor: pointer;
	touch-action: none;

	&::before {
		content: "";
		position: absolute;
		inset-block: 50%;
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
		border-radius: var(--radius-full);
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.progress-buffered,
.progress-played {
	position: absolute;
	top: 50%;
	left: 0;
	height: 5px;
	border-radius: var(--radius-full);
	transform: translateY(-50%);
	transition: height 0.15s;
}

.progress-buffered {
	background: var(--c-bg-soft);
}

.progress-played {
	background: var(--c-primary);
}

.progress:hover,
.progress.dragging {
	.progress-buffered,
	.progress-played {
		height: 7px;
	}
}

.progress-thumb {
	position: absolute;
	opacity: 0;
	top: 50%;
	width: 11px;
	height: 11px;
	border: 2px solid var(--c-primary);
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

.player-controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	margin-top: 0.35rem;
}

.control-group {
	display: inline-flex;
	align-items: center;
	gap: 0.2rem;
}

.ctrl-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	font-size: 1.05rem;
	color: var(--c-text-2);
	transition: color 0.2s, background-color 0.2s;

	&:hover {
		color: var(--c-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.play-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.8rem;
	height: 2.8rem;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: var(--c-primary);
	font-size: 1.35rem;
	color: #FFF;
	transition: box-shadow 0.2s;

	&:hover {
		box-shadow: 0 4px 14px color-mix(in srgb, var(--c-primary) 40%, transparent);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 3px;
	}
}

.speed-btn {
	flex-shrink: 0;
	min-width: 2.5rem;
	padding: 0.22rem 0.45rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: transparent;
	font-family: var(--font-monospace);
	font-size: 0.66rem;
	color: var(--c-text-3);
	transition: color 0.2s, border-color 0.2s;

	&:hover {
		border-color: color-mix(in srgb, var(--c-primary) 55%, var(--c-border));
		color: var(--c-primary);
	}
}

.volume {
	display: inline-flex;
	align-items: center;
	gap: 0.1rem;
}

.volume-range {
	width: 4rem;
	accent-color: var(--c-primary);
	cursor: pointer;
}

.player-switches {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	margin-top: 0.55rem;
}

.switch-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.3rem 0.55rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: transparent;
	font-size: var(--fs-xs);
	color: var(--c-text-3);
	transition: color 0.2s, border-color 0.2s, background-color 0.2s;

	span {
		font-family: var(--font-monospace);
		font-size: 0.64rem;
		color: var(--c-text-3);
	}

	&:hover {
		border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border));
		color: var(--c-primary);
	}

	&.active {
		border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
		background: var(--c-primary-soft);
		color: var(--c-primary);

		span {
			color: var(--c-primary);
		}
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}
}

.player-side {
	display: flex;
	flex-direction: column;
	min-width: 0;
	border-inline-start: 1px solid var(--c-border);
	background: var(--surface-nested);
}

.player-side-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	padding: 0.55rem 0.8rem;
	border-bottom: 1px solid var(--c-border);
	font-size: var(--fs-xs);
	color: var(--c-text-3);
}

.side-list {
	flex: 1;
	position: relative;
	overflow-y: auto;
	min-height: 0;
	max-height: 13rem;
}

.queue-list {
	padding: 0.35rem 0.5rem 0.5rem;
}

.queue-row {
	display: grid;
	grid-template-columns: 2rem minmax(0, 1fr) auto auto;
	align-items: center;
	gap: 0.5rem;
	width: 100%;
	padding: 0.38rem 0.5rem;
	border: 0;
	border-radius: 0.35rem;
	background: transparent;
	text-align: start;
	color: var(--c-text-2);
	transition: background-color 0.15s, color 0.15s;

	&:hover {
		background: var(--c-bg-2);
		color: var(--c-text-1);
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: -2px;
	}

	&.is-current {
		background: var(--c-primary-soft);
		color: var(--c-primary);
	}
}

.queue-index {
	font-family: var(--font-monospace);
	font-size: 0.64rem;
	color: var(--c-text-3);
}

.queue-title {
	overflow: hidden;
	font-size: var(--fs-sm);
	white-space: nowrap;
	text-overflow: ellipsis;
}

.queue-artist {
	overflow: hidden;
	max-width: 8rem;
	font-size: var(--fs-xs);
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}

.queue-state {
	font-size: 0.72rem;
	color: var(--c-primary);
}

.lyrics-list {
	padding: 0.7rem 1rem;
	text-align: center;
}

.lyric-line {
	padding-block: 0.18rem;
	font-size: var(--fs-sm);
	line-height: 1.6;
	color: var(--c-text-3);
	transition: color 0.2s;

	&.active {
		font-size: var(--fs-body);
		color: var(--c-primary);
	}
}

.lyric-empty {
	font-size: var(--fs-sm);
	color: var(--c-text-3);
}

.player-state.centered {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	min-height: 9rem;
	padding: 2rem 1rem;
	text-align: center;

	p {
		font-size: 0.88rem;
		color: var(--c-text-1);
	}

	span {
		max-width: 28rem;
		font-size: var(--fs-xs);
		line-height: 1.6;
		color: var(--c-text-3);

		code {
			padding: 0.1em 0.3em;
			border-radius: 0.25em;
			background: var(--c-bg-2);
			font-family: var(--font-monospace);
			font-size: 0.9em;
		}
	}
}

.player-state-icon {
	font-size: 1.7rem;
	color: var(--c-text-3);
}

.player-retry {
	margin-top: 0.4rem;
	padding: 0.25rem 0.7rem;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: transparent;
	font-size: var(--fs-xs);
	color: var(--c-text-2);
	transition: color 0.2s, border-color 0.2s;

	&:hover {
		border-color: color-mix(in srgb, var(--c-primary) 55%, var(--c-border));
		color: var(--c-primary);
	}
}

.player-audio {
	display: none;
}

.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@media (max-width: $breakpoint-mobile) {
	.player-body.has-side {
		grid-template-columns: 1fr;
	}

	.player-main {
		padding: 0.9rem;
	}

	.player-now {
		grid-template-columns: 5rem minmax(0, 1fr);
		gap: 0.8rem;
	}

	.player-cover {
		width: 5rem;
		height: 5rem;
	}

	.player-track-title {
		font-size: 1.1rem;
	}

	.player-side {
		border-inline-start: 0;
		border-top: 1px solid var(--c-border);
	}

	.side-list {
		max-height: 12rem;
	}

	.queue-artist {
		display: none;
	}

	.queue-row {
		grid-template-columns: 1.8rem minmax(0, 1fr) auto;
	}

	.volume-range {
		width: 3rem;
	}

	.player-state.centered {
		min-height: 8rem;
		padding: 1.5rem 1rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.hobby-player {
		animation: none;
	}

	.play-btn {
		transition: none;
	}

	.spinning {
		animation: none;
	}
}
</style>
