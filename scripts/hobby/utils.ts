import type { HobbyItem } from '../../shared/types/hobby'
import process from 'node:process'

export interface HobbySyncResult {
	key: string
	items: HobbyItem[]
}

export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export function readEnvInt(name: string, fallback: number) {
	const value = Number(process.env[name])
	return Number.isInteger(value) && value > 0 ? value : fallback
}

export function readEnvList(name: string, fallback: number[]) {
	const raw = process.env[name]?.trim()
	if (!raw)
		return fallback
	const values = raw.split(/[\s,]+/).map(Number).filter(value => Number.isInteger(value))
	return values.length ? values : fallback
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(timeoutMs),
	})
	if (!response.ok)
		throw new Error(`HTTP ${response.status} ${response.statusText}`)
	return await response.json() as T
}

export function formatSteamPlaytime(minutes: number) {
	if (minutes >= 60)
		return `${Math.round(minutes / 60)} 小时`
	return `${Math.max(minutes, 1)} 分钟`
}
