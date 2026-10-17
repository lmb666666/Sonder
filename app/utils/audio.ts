export interface AudioLyricLine {
	time: number
	text: string
}

const LRC_TIMESTAMP = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g
const LRC_CREDIT = /^(?:作词作曲|作詞作曲|作词|作詞|作曲|编曲|編曲|演唱|歌手|词曲|詞曲|制作人|製作人|制作|製作|填词|填詞|lyricist|lyrics by|composer|music by|arranger|arranged by|vocal(?:s|ist)?|singer|artist|producer|produced by)(?:\s*[:：-]|\s*$)/i
// 中文 LRC 常见的制作人员行，带复合角色名（混音师、弦乐编曲等） / Compound Chinese credit roles
const LRC_CREDIT_DETAIL = /^(?:录制|录音室|录音|混音助理工程师|混音师|混音|母带|和声|吉他|电贝斯|贝斯|鼓和钢琴|鼓|键盘|弦乐编曲|弦乐总监|弦乐录制|弦乐|额外编程|编程|数字编辑|制作助理|工程师|监制|出品|发行|统筹|企划)[：:]/

/** 解析 LRC 歌词，过滤制作人员行并按时间排序 */
export function parseLrc(value?: string): AudioLyricLine[] {
	const lines: AudioLyricLine[] = []
	for (const line of (value || '').split(/\r?\n/)) {
		const matches = [...line.matchAll(LRC_TIMESTAMP)]
		const text = line.replace(/(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/g, '').trim()
		if (!text || LRC_CREDIT.test(text) || LRC_CREDIT_DETAIL.test(text))
			continue
		for (const match of matches) {
			const fraction = match[3] ? Number(`0.${match[3]}`) : 0
			lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text })
		}
	}
	return lines.sort((a, b) => a.time - b.time)
}

/** 返回当前时间对应的歌词行下标，尚未开始或没有歌词时返回 -1 */
export function findActiveLyricIndex(lines: AudioLyricLine[], time: number): number {
	let index = -1
	for (let i = 0; i < lines.length && lines[i]!.time <= time; i++)
		index = i
	return index
}

/** 把秒数格式化为 mm:ss 或 h:mm:ss */
export function formatAudioDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0)
		return '00:00'
	const s = Math.floor(seconds % 60).toString().padStart(2, '0')
	const mm = (Math.floor(seconds / 60) % 60).toString().padStart(2, '0')
	const h = Math.floor(seconds / 3600)
	if (h > 0)
		return `${h}:${mm}:${s}`
	return `${mm}:${s}`
}
