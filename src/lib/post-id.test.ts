import { describe, expect, test } from 'bun:test';

import { allocatePostId, createBlogEntryId, createPostId, normalizePostId } from './post-id';

describe('createPostId', () => {
  test('按标题与日期生成固定的 8 位十六进制', () => {
    expect(createPostId('Markdown 语法', '2026-05-19T00:00:00+08:00')).toBe('0346b25d');
    expect(createPostId('Sonder 快速开始', '2026-07-05T08:13:22.188Z')).toBe('89bf75ce');
  });
});

describe('createBlogEntryId', () => {
  test('合法 postid 直接作为内容 ID', () => {
    expect(createBlogEntryId('post.md', 'fb5d4736')).toBe('fb5d4736');
  });

  test('缺失或非法 postid 使用不会与合法 ID 冲突的占位值', () => {
    expect(createBlogEntryId('nested\\post.md', undefined)).toBe('__invalid__/nested/post.md');
    expect(createBlogEntryId('post.md', 'tags')).toBe('__invalid__/post.md');
  });
});

describe('normalizePostId', () => {
  test('接受 v1 允许的字母、数字、下划线与连字符', () => {
    expect(normalizePostId('abc-123')).toBe('abc-123');
    expect(normalizePostId('abc_123')).toBe('abc_123');
    expect(normalizePostId('  MyPost  ')).toBe('MyPost');
  });

  test('把非负安全整数规范化为字符串', () => {
    expect(normalizePostId(12345678)).toBe('12345678');
    expect(normalizePostId(0)).toBe('0');
  });

  test('拒绝非法格式与保留字', () => {
    expect(normalizePostId('')).toBeUndefined();
    expect(normalizePostId('a/b')).toBeUndefined();
    expect(normalizePostId('中文')).toBeUndefined();
    expect(normalizePostId('a b')).toBeUndefined();
    expect(normalizePostId(-1)).toBeUndefined();
    expect(normalizePostId(1.5)).toBeUndefined();
    expect(normalizePostId(Number.MAX_SAFE_INTEGER + 1)).toBeUndefined();
    expect(normalizePostId('tags')).toBeUndefined();
    expect(normalizePostId('Archives')).toBeUndefined();
  });
});

describe('allocatePostId', () => {
  test('碰撞时递增数值', () => {
    expect(allocatePostId('0346b25d', new Set(['0346b25d']))).toBe('0346b25e');
    expect(allocatePostId('0346b25d', new Set(['0346b25d', '0346b25e']))).toBe('0346b25f');
  });

  test('只接受调用方规范化后的小写集合', () => {
    expect(allocatePostId('0346b25d', new Set(['0346b25d']))).toBe('0346b25e');
  });

  test('溢出后回绕到 0', () => {
    expect(allocatePostId('ffffffff', new Set(['ffffffff']))).toBe('00000000');
  });
});
