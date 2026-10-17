export type HobbySource = 'bangumi' | 'steam' | 'manual'

/** 展区组件类型 / Presentation component used by a hobby group */
export type HobbyLayout = 'shelf' | 'list' | 'grid'

export interface HobbyPlaylist {
	/** 网易云 / QQ 音乐歌单链接 / NetEase or QQ Music playlist URL */
	url: string
	/** 歌单名，缺省显示「歌单」 / Playlist title */
	title?: string
	/** 歌单补充说明 / Playlist description */
	description?: string
}

export interface HobbyItem {
	/** 条目标题 */
	title: string
	/** 原名 / 外文名 */
	originalTitle?: string
	/** 作者 / 导演 / 歌手 / 开发商 */
	creator?: string
	/** 封面图，可为外链 */
	cover?: string
	/** 评分（0–10） */
	rating?: number
	/** 年份 */
	year?: string
	/** 状态：已看 / 在追 / 玩过… */
	status?: string
	/** 进度：120 小时 / 看到 EP12 */
	progress?: string
	/** 一句话短评 */
	note?: string
	/** 标签 */
	tags?: string[]
	/** 作品页链接 */
	link?: string
	/** 数据来源 */
	source?: HobbySource
	/** 平台内 ID，用于自动同步去重 */
	sourceId?: string
}

export interface HobbyGroup {
	/** 分类标识，用于自动数据挂载 */
	key: string
	/** 分类显示名 */
	name: string
	/** Iconify 图标名 */
	icon: string
	/** 分类强调色 */
	color?: string
	/** 展区描述 */
	description?: string
	/** 数量单位：部 / 本 / 款 */
	unit?: string
	/** 展示组件；缺省 shelf，有 playlist 时使用播放器 */
	layout?: HobbyLayout
	/** 屏蔽自动同步的条目：'steam:123'、来源 ID 或链接 */
	hidden?: string[]
	/** 歌单；配置后该分类只渲染播放器，items 不参与展示 / Playlist groups render only the player */
	playlist?: HobbyPlaylist
	/** 手动条目 / Manual entries */
	items: HobbyItem[]
}

export type HobbyItemMap = Record<string, HobbyItem[]>
