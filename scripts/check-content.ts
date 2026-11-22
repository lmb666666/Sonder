import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizePostId, RESERVED_POST_IDS } from '../src/lib/post-id';
import { validateRedirects } from '../src/lib/redirects';
import { readPostFiles } from './post-files';

export interface PostIdEntry {
  file: string;
  postid: unknown;
}

function postIdText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return '';
}

export function validatePostIds(entries: PostIdEntry[]): string[] {
  const failures: string[] = [];
  const positions = new Map<string, string>();

  for (const entry of entries) {
    const postid = normalizePostId(entry.postid);

    if (!postid) {
      const text = postIdText(entry.postid);
      failures.push(
        text && RESERVED_POST_IDS.has(text.toLowerCase())
          ? `${entry.file}: postid 不能使用保留字: ${text}`
          : `${entry.file}: postid 缺失或非法: ${String(entry.postid)}`,
      );
      continue;
    }

    const key = postid.toLowerCase();
    const existing = positions.get(key);
    if (existing) {
      failures.push(`${entry.file}: postid 重复 ${postid}，已在 ${existing} 使用`);
      continue;
    }

    positions.set(key, entry.file);
  }

  return failures;
}

export function checkContent() {
  const posts = readPostFiles();
  const failures = validatePostIds(
    posts.map((post) => ({ file: post.relativePath, postid: post.frontmatter.postid })),
  );

  const postIds = posts
    .map((post) => normalizePostId(post.frontmatter.postid))
    .filter((postid): postid is string => Boolean(postid));

  const redirectsPath = resolve(process.cwd(), 'redirects.json');
  let redirects: unknown = {};

  if (existsSync(redirectsPath)) {
    try {
      redirects = JSON.parse(readFileSync(redirectsPath, 'utf8'));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`redirects.json 无法解析: ${reason}`);
    }
  }

  const postPaths = new Set(postIds.map((postid) => `/blog/${postid}`));
  failures.push(...validateRedirects(redirects, postPaths));

  return {
    failures,
    postCount: posts.length,
    redirectCount:
      redirects && typeof redirects === 'object' && !Array.isArray(redirects)
        ? Object.keys(redirects).length
        : 0,
  };
}

if (import.meta.main) {
  try {
    const { failures, postCount, redirectCount } = checkContent();

    if (failures.length > 0) {
      console.error(`✗ 内容校验失败：${failures.length} 项问题`);
      for (const failure of failures) console.error(`  ${failure}`);
      process.exit(1);
    }

    console.log(`✓ 内容校验通过：${postCount} 篇文章，${redirectCount} 条重定向。`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
