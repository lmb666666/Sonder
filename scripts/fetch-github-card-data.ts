import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

/**
 * 扫描文章里的 `::github{repo="owner/repo"}` 指令，预取仓库元数据到
 * src/data/github-card-data.json（提交进仓库）。构建期指令只读 JSON，
 * 运行时零请求；取数失败时保留旧数据、以非零退出前的警告结束（构建不失败）。
 */

const contentRoot = 'src/content';
const outputFile = 'src/data/github-card-data.json';

interface GithubCardData {
  name?: string;
  description?: string;
  stars?: number;
  language?: string;
  avatarUrl?: string;
  url?: string;
}

function collectRepos(): string[] {
  const repos = new Set<string>();
  const files = glob.sync(`${contentRoot}/**/*.md`);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/::github\{\s*repo\s*=\s*["']([^"']+)["']/g)) {
      if (/^[\w.-]+\/[\w.-]+$/.test(match[1])) repos.add(match[1].toLowerCase());
    }
  }

  return [...repos].sort();
}

function readCache(): Record<string, GithubCardData> {
  if (!existsSync(outputFile)) return {};
  try {
    return JSON.parse(readFileSync(outputFile, 'utf8'));
  } catch {
    return {};
  }
}

async function fetchRepo(repo: string): Promise<GithubCardData | undefined> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sonder-github-cards',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!response.ok) {
    console.warn(`github-cards: ${repo} 取数失败（HTTP ${response.status}），保留旧数据。`);
    return undefined;
  }

  const payload = (await response.json()) as {
    name?: string;
    description?: string | null;
    stargazers_count?: number;
    language?: string | null;
    html_url?: string;
    owner?: { avatar_url?: string };
  };

  return {
    name: payload.name,
    description: payload.description ?? undefined,
    stars: payload.stargazers_count,
    language: payload.language ?? undefined,
    avatarUrl: payload.owner?.avatar_url ? `${payload.owner.avatar_url}&s=64` : undefined,
    url: payload.html_url,
  };
}

const repos = collectRepos();
const cache = readCache();
let changed = false;

for (const repo of repos) {
  if (cache[repo]?.stars !== undefined) continue;
  try {
    const data = await fetchRepo(repo);
    if (data) {
      cache[repo] = data;
      changed = true;
    }
  } catch (error) {
    console.warn(`github-cards: ${repo} 取数异常，保留旧数据。`, error);
  }
}

const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outputFile, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `github-cards: ${repos.length} 个仓库，数据已写入 ${outputFile}${changed ? '（有更新）' : '（无变化）'}`,
);
