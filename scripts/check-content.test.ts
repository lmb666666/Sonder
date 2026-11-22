import { describe, expect, test } from 'bun:test';

import { validatePostIds } from './check-content';

describe('validatePostIds', () => {
  test('合法与数字 postid 通过', () => {
    expect(
      validatePostIds([
        { file: 'a.md', postid: 'abc-123' },
        { file: 'b.md', postid: 12345678 },
      ]),
    ).toEqual([]);
  });

  test('报告缺失、非法、保留字与重复', () => {
    const failures = validatePostIds([
      { file: 'missing.md', postid: undefined },
      { file: 'slash.md', postid: 'a/b' },
      { file: 'reserved.md', postid: 'tags' },
      { file: 'first.md', postid: 'Same' },
      { file: 'second.md', postid: 'same' },
    ]);

    expect(failures).toHaveLength(4);
    expect(failures[0]).toContain('missing.md: postid 缺失或非法');
    expect(failures[1]).toContain('slash.md: postid 缺失或非法');
    expect(failures[2]).toContain('reserved.md: postid 不能使用保留字: tags');
    expect(failures[3]).toContain('second.md: postid 重复 same，已在 first.md 使用');
  });
});
