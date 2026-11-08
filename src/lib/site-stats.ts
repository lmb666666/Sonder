import { countWords } from './word-count';

export interface SiteStatsPost {
  body?: string;
  data: {
    date: Date;
    updated?: Date;
    draft?: boolean;
  };
}

export interface SiteStats {
  totalWords: number;
  lastUpdatedAt: Date | null;
}

/**
 * 全站内容统计：只算已发布文章。
 * 字数与文章页同口径（包含代码块）；最后更新时间取每篇文章 max(date, updated) 的最大值。
 */
export function collectSiteStats(posts: SiteStatsPost[]): SiteStats {
  let totalWords = 0;
  let lastUpdatedAt: Date | null = null;

  for (const post of posts) {
    if (post.data.draft) continue;

    totalWords += countWords(post.body ?? '');

    const updated =
      post.data.updated && post.data.updated > post.data.date ? post.data.updated : post.data.date;
    if (!lastUpdatedAt || updated > lastUpdatedAt) {
      lastUpdatedAt = updated;
    }
  }

  return { totalWords, lastUpdatedAt };
}
