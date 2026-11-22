import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { parse } from 'yaml';

import { isPlaceholderFeed } from '../src/lib/friend-data';

interface FriendItem {
  name?: string;
  url?: string;
  avatar?: string | null;
}

interface FriendGroup {
  title?: string;
  items?: FriendItem[];
}

interface FriendsFile {
  friends?: {
    groups?: FriendGroup[];
  };
}

export function isFclEnabled(value: unknown): boolean {
  const friends = (
    value as { config?: { integrations?: { friends?: Record<string, unknown> } } } | null
  )?.config?.integrations?.friends;
  return friends?.enable === true && friends?.provider === 'fcl';
}

export function buildFriendJson(value: unknown): { friends: [string, string, string][] } {
  const groups = (value as FriendsFile | null)?.friends?.groups ?? [];
  const seen = new Set<string>();
  const friends: [string, string, string][] = [];

  for (const group of groups) {
    for (const item of group.items ?? []) {
      const name = item.name?.trim() ?? '';
      const url = item.url?.trim() ?? '';
      if (!name || !url || seen.has(url) || isPlaceholderFeed(url)) continue;
      seen.add(url);
      friends.push([name, url, item.avatar?.trim() ?? '']);
    }
  }

  return { friends };
}

function main() {
  const configPath = resolve(process.cwd(), 'site.config.toml');
  const output = resolve(process.cwd(), 'public/friend.json');
  const config = parseToml(readFileSync(configPath, 'utf8'));

  if (!isFclEnabled(config)) {
    if (existsSync(output)) unlinkSync(output);
    console.log('[friends] 未启用 FCL，跳过 friend.json。');
    return;
  }

  const input = resolve(process.cwd(), 'src/data/friends.yml');
  const data = buildFriendJson(parse(readFileSync(input, 'utf8')));

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`[friends] 已生成 public/friend.json：${data.friends.length} 条友链。`);
}

if (import.meta.main) main();
