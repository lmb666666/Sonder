import type { GithubCardData } from './handlers.ts';
import cardData from '../../../data/github-card-data.json';

/**
 * GitHub 卡片的构建期数据。由 `bun run github-cards` 预取并提交进仓库，
 * 指令渲染只读 JSON，运行时零请求；取数失败时保留旧数据、构建不失败。
 */

export const githubCardData = cardData as Record<string, GithubCardData | undefined>;

const cards = githubCardData;

export function getGithubCardData(repo: string): GithubCardData | undefined {
  return cards[repo.toLowerCase()];
}
