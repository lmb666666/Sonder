#!/usr/bin/env ts-node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import feeds, { myFeed } from '../app/feeds'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputPath = path.resolve(__dirname, '../public/friend.json')

try {
	const friends: [string, string, string][] = []

	for (const group of feeds) {
		for (const entry of group.entries) {
			if (entry === myFeed)
				continue

			const name = entry.title || entry.sitenick || entry.author
			friends.push([name, entry.link, entry.avatar])
		}
	}

	const publicDir = path.resolve(__dirname, '../public')
	if (!fs.existsSync(publicDir))
		fs.mkdirSync(publicDir, { recursive: true })

	fs.writeFileSync(outputPath, JSON.stringify({ friends }, null, 2), 'utf-8')
	console.log(`✅ 成功生成 ${friends.length} 条友链: ${outputPath}`)
}
catch (error) {
	console.error('❌ 生成失败:', error instanceof Error ? error.message : String(error))
	process.exit(1)
}
