import { describe, expect, test } from 'bun:test';

import { getRawFrontmatterValue, hasPostIdField, insertPostId } from './post-files';

describe('insertPostId', () => {
  test('在 date 行后插入，不重写其他 frontmatter', () => {
    const source = '---\ntitle: A\ndate: 2026-01-01\ntags: []\n---\n\nBody\n';
    expect(insertPostId(source, 'fb5d4736')).toBe(
      '---\ntitle: A\ndate: 2026-01-01\npostid: "fb5d4736"\ntags: []\n---\n\nBody\n',
    );
  });

  test('没有 date 时插入到 frontmatter 开头', () => {
    const source = '---\ntitle: A\n---\n';
    expect(insertPostId(source, 'fb5d4736')).toBe('---\npostid: "fb5d4736"\ntitle: A\n---\n');
  });

  test('保留 CRLF 并跳过已有 postid', () => {
    const source = '---\r\ntitle: A\r\ndate: 2026-01-01\r\n---\r\n';
    expect(insertPostId(source, 'fb5d4736')).toBe(
      '---\r\ntitle: A\r\ndate: 2026-01-01\r\npostid: "fb5d4736"\r\n---\r\n',
    );
    expect(insertPostId('---\npostid: old\ntitle: A\n---\n', 'new')).toBe(
      '---\npostid: old\ntitle: A\n---\n',
    );
  });
});

describe('frontmatter helpers', () => {
  test('读取带引号或行内注释的原始 date', () => {
    expect(getRawFrontmatterValue('date: "2026-01-01"', 'date')).toBe('2026-01-01');
    expect(getRawFrontmatterValue("date: '2026-01-01' # publish", 'date')).toBe('2026-01-01');
    expect(getRawFrontmatterValue('title: A', 'date')).toBeUndefined();
  });

  test('识别 postid 字段', () => {
    expect(hasPostIdField('title: A\npostid: fb5d4736')).toBe(true);
    expect(hasPostIdField('title: A')).toBe(false);
  });
});
