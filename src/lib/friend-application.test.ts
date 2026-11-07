import { describe, expect, test } from 'bun:test';

import { buildYoulinApplicationPayload, validateApplicationUrlValue } from './friend-application';

describe('validateApplicationUrlValue', () => {
  test('空值不校验', () => {
    expect(validateApplicationUrlValue('')).toBe('empty');
    expect(validateApplicationUrlValue('   ')).toBe('empty');
  });

  test('http 与 https 通过', () => {
    expect(validateApplicationUrlValue('https://example.com')).toBe('ok');
    expect(validateApplicationUrlValue('http://example.com/blog')).toBe('ok');
  });

  test('非法 URL 与非 http(s) 协议', () => {
    expect(validateApplicationUrlValue('not a url')).toBe('invalid');
    expect(validateApplicationUrlValue('ftp://example.com')).toBe('protocol');
    expect(validateApplicationUrlValue('mailto:hello@example.com')).toBe('protocol');
  });
});

describe('buildYoulinApplicationPayload', () => {
  test('映射字段并省略空值', () => {
    expect(
      buildYoulinApplicationPayload({
        name: ' 我的博客 ',
        url: ' https://example.com/ ',
        bio: ' 记录 ',
        avatar: '',
        rss: 'https://example.com/atom.xml',
      }),
    ).toEqual({
      siteName: '我的博客',
      link: 'https://example.com/',
      desc: '记录',
      feed: 'https://example.com/atom.xml',
    });
  });

  test('带 Turnstile token', () => {
    expect(
      buildYoulinApplicationPayload(
        { name: 'A', url: 'https://a.example/', bio: '', avatar: '', rss: '' },
        ' token ',
      ),
    ).toEqual({ siteName: 'A', link: 'https://a.example/', turnstileToken: 'token' });
  });
});
