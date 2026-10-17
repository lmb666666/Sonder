import type { HobbyItem } from '../../../shared/types/hobby'
import type { HobbySyncResult } from '../utils'
import process from 'node:process'
import { fetchJson, formatSteamPlaytime, readEnvInt } from '../utils'

interface SteamGame {
	appid: number
	name?: string
	playtime_forever: number
	rtime_last_played?: number
}

interface SteamOwnedGamesResponse {
	response?: {
		game_count?: number
		games?: SteamGame[]
	}
}

interface SteamVanityResponse {
	response?: {
		success?: number
		steamid?: string
		message?: string
	}
}

async function resolveSteamId(key: string, input: string) {
	if (/^\d{17}$/.test(input))
		return input

	const query = new URLSearchParams({ key, vanityurl: input })
	const data = await fetchJson<SteamVanityResponse>(
		`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?${query}`,
	)
	if (data.response?.success !== 1 || !data.response.steamid)
		throw new Error(`无法解析 Steam ID：${input}`)
	return data.response.steamid
}

/** 把 Steam 拥有的游戏归一化为兴趣条目 / Normalize an owned Steam game */
export function normalizeSteamGame(game: SteamGame): HobbyItem | undefined {
	const title = game.name?.trim()
	if (!title)
		return undefined

	const lastPlayed = typeof game.rtime_last_played === 'number' && game.rtime_last_played > 0
		? new Date(game.rtime_last_played * 1000).getFullYear().toString()
		: undefined

	return {
		title,
		cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900_2x.jpg`,
		...(lastPlayed ? { year: lastPlayed } : {}),
		status: '玩过',
		progress: formatSteamPlaytime(game.playtime_forever),
		link: `https://store.steampowered.com/app/${game.appid}`,
		source: 'steam',
		sourceId: String(game.appid),
	}
}

export async function collectSteam(): Promise<HobbySyncResult> {
	const key = process.env.HOBBY_STEAM_KEY?.trim()
	const input = process.env.HOBBY_STEAM_ID?.trim()
	if (!key || !input)
		throw new Error('未配置 HOBBY_STEAM_KEY / HOBBY_STEAM_ID')

	const minMinutes = readEnvInt('HOBBY_STEAM_MIN_MINUTES', 60)
	const limit = readEnvInt('HOBBY_STEAM_LIMIT', 60)
	const steamId = await resolveSteamId(key, input)

	const query = new URLSearchParams({
		key,
		steamid: steamId,
		include_appinfo: '1',
		include_played_free_games: '1',
		format: 'json',
	})
	const data = await fetchJson<SteamOwnedGamesResponse>(
		`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${query}`,
	)
	const games = data.response?.games
	if (!Array.isArray(games))
		throw new Error('Steam 返回为空，检查个人资料与游戏详情是否公开')

	const items = games
		.filter(game => game.playtime_forever >= minMinutes)
		.sort((a, b) => b.playtime_forever - a.playtime_forever)
		.slice(0, limit)
		.flatMap((game) => {
			const item = normalizeSteamGame(game)
			return item ? [item] : []
		})

	return { key: 'game', items }
}
