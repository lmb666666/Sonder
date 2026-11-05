import { describe, expect, test } from 'bun:test';

import { validateApplicationUrlValue } from './friend-application';

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
