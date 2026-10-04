/** 采样画布边长上限，控制取色成本 */
const SAMPLE_SIZE = 64

/** 图床无 CORS 头时通过图像代理取色（带 CORS 且可服务端缩略） */
const PROXY_BASE = 'https://images.weserv.nl/'

const cache = new Map<string, string>()

/** 取封面主色：提饱和度、压亮度，返回 hsl() 字符串；失败返回 undefined；proxyHosts 为需要代理的图床域名白名单（来自 blog.config.ts 的 ui.article.coverProxyHosts） */
export async function getCoverThemeColor(src: string, proxyHosts: string[] = []): Promise<string | undefined> {
	if (!src || !import.meta.client)
		return undefined

	const cached = cache.get(src)
	if (cached)
		return cached

	try {
		const color = await extractColor(src, proxyHosts)
		if (color)
			cache.set(src, color)
		return color
	}
	catch {
		return undefined
	}
}

function extractColor(src: string, proxyHosts: string[]): Promise<string | undefined> {
	return new Promise((resolve) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.decoding = 'async'
		img.onload = () => resolve(sampleColor(img))
		img.onerror = () => resolve(undefined)
		img.src = proxiedSrc(src, proxyHosts)
	})
}

/** 白名单内的图床改走图像代理，保证画布可读 */
function proxiedSrc(src: string, proxyHosts: string[]) {
	try {
		const host = new URL(src).hostname
		if (proxyHosts.includes(host)) {
			return `${PROXY_BASE}?url=${encodeURIComponent(src)}&w=${SAMPLE_SIZE}`
		}
	}
	catch {
		// 非标准 URL 直接使用原图
	}
	return src
}

function sampleColor(img: HTMLImageElement) {
	const canvas = document.createElement('canvas')
	const size = Math.min(SAMPLE_SIZE, Math.max(img.naturalWidth, img.naturalHeight))
	canvas.width = size
	canvas.height = size

	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx)
		return undefined

	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(img, 0, 0, size, size)

	let red = 0
	let green = 0
	let blue = 0
	let count = 0

	try {
		const { data } = ctx.getImageData(0, 0, size, size)
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i]
			const g = data[i + 1]
			const b = data[i + 2]
			const a = data[i + 3]

			if (r === undefined || g === undefined || b === undefined || a === undefined)
				continue

			// 丢弃透明、近白、近黑的像素，避免偏灰
			if (a < 128)
				continue
			if (r > 235 && g > 235 && b > 235)
				continue
			if (r < 24 && g < 24 && b < 24)
				continue

			red += r
			green += g
			blue += b
			count++
		}
	}
	catch {
		return undefined
	}

	if (!count)
		return undefined

	return rgbToHslString(red / count, green / count, blue / count)
}

/** RGB → HSL，固定饱和度/亮度以获得鲜亮的主题色 */
function rgbToHslString(r: number, g: number, b: number) {
	const red = r / 255
	const green = g / 255
	const blue = b / 255

	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const delta = max - min

	let hue = 0
	if (delta !== 0) {
		if (max === red)
			hue = ((green - blue) / delta) % 6
		else if (max === green)
			hue = (blue - red) / delta + 2
		else
			hue = (red - green) / delta + 4
	}
	hue = Math.round(hue * 60)
	if (hue < 0)
		hue += 360

	return `hsl(${hue} 75% 55%)`
}
