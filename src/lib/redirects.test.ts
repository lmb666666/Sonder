import { describe, expect, test } from 'bun:test';

import { getRedirectSources, validateRedirects } from './redirects';

describe('validateRedirects', () => {
  test('空配置与合法站内/站外目标通过', () => {
    expect(validateRedirects({})).toEqual([]);
    expect(
      validateRedirects({
        '/blog/old-post': '/blog/new-post/',
        '/feed': 'https://example.com/feed.xml',
      }),
    ).toEqual([]);
  });

  test('拒绝非对象顶层与非法 source', () => {
    expect(validateRedirects(null)).toEqual(['redirects.json 顶层必须是对象']);
    expect(validateRedirects([])).toEqual(['redirects.json 顶层必须是对象']);

    const failures = validateRedirects({
      'blog/old': '/blog/new/',
      '/blog/trailing/': '/blog/new/',
      '/blog/query?x=1': '/blog/new/',
    });
    const text = failures.join('\n');
    expect(text).toContain('source 非法: blog/old');
    expect(text).toContain('source 非法: /blog/query?x=1');
    expect(text).toContain('source 不能以 / 结尾: /blog/trailing/');
  });

  test('拒绝非法 target 与 self redirect', () => {
    const failures = validateRedirects({
      '/blog/a': 'javascript:alert(1)',
      '/blog/b': '/blog/b/',
    });
    const text = failures.join('\n');
    expect(text).toContain('target 非法: /blog/a');
    expect(text).toContain('禁止 self redirect: /blog/b');
  });

  test('拒绝 source/target 首尾空白', () => {
    const failures = validateRedirects({ ' /blog/a': ' /blog/b/ ' });
    const text = failures.join('\n');
    expect(text).toContain('source 不能包含首尾空白');
    expect(text).toContain('target 不能包含首尾空白');
  });

  test('source 不能覆盖现有文章路径', () => {
    const failures = validateRedirects(
      { '/blog/My-Post': '/blog/new/' },
      new Set(['/blog/my-post']),
    );
    expect(failures).toContain('redirects.json source 与现有文章路径冲突: /blog/My-Post');
  });
});

describe('getRedirectSources', () => {
  test('返回去掉尾斜杠的 source 集合', () => {
    expect([...getRedirectSources({ '/blog/a/': '/blog/b/', '/feed': '/atom.xml' })]).toEqual([
      '/blog/a',
      '/feed',
    ]);
  });

  test('非法顶层返回空集合', () => {
    expect(getRedirectSources(null).size).toBe(0);
  });
});
