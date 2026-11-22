import { writeFileSync } from 'node:fs';

import { allocatePostId, createPostId, normalizePostId } from '../src/lib/post-id';
import {
  getRawFrontmatterValue,
  hasPostIdField,
  insertPostId,
  readPostFiles,
  type PostFile,
} from './post-files';

function resolvePostDate(post: PostFile): string {
  const raw = getRawFrontmatterValue(post.frontmatterSource, 'date');
  if (raw) return raw;

  const value = post.frontmatter.date;
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? '' : String(value);
}

function main() {
  const posts = readPostFiles();
  const used = new Set<string>();
  const missing: PostFile[] = [];
  const failures: string[] = [];

  for (const post of posts) {
    const rawPostid = post.frontmatter.postid;

    if (rawPostid === undefined && !hasPostIdField(post.frontmatterSource)) {
      missing.push(post);
      continue;
    }

    const postid = normalizePostId(rawPostid);
    if (!postid) {
      failures.push(`${post.relativePath}: postid 非法: ${String(rawPostid)}`);
      continue;
    }

    const key = postid.toLowerCase();
    if (used.has(key)) {
      failures.push(`${post.relativePath}: postid 重复: ${postid}`);
      continue;
    }

    used.add(key);
  }

  for (const post of missing) {
    const title = String(post.frontmatter.title ?? '').trim();
    const date = resolvePostDate(post).trim();

    if (!title) failures.push(`${post.relativePath}: 缺少 title，无法生成 postid`);
    if (!date) failures.push(`${post.relativePath}: 缺少 date，无法生成 postid`);
  }

  if (failures.length > 0) {
    console.error(`✗ 无法回填 postid：${failures.length} 项问题`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  if (missing.length === 0) {
    console.log(`✓ 所有文章已有 postid（${posts.length} 篇）。`);
    return;
  }

  for (const post of missing) {
    const title = String(post.frontmatter.title ?? '').trim();
    const date = resolvePostDate(post).trim();
    const postid = allocatePostId(createPostId(title, date), used);

    writeFileSync(post.file, insertPostId(post.source, postid), 'utf8');
    used.add(postid.toLowerCase());
    console.log(`${post.relativePath} -> ${postid}`);
  }

  console.log(`✓ 已为 ${missing.length} 篇文章生成 postid。`);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
