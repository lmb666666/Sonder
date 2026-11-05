import { describe, expect, test } from 'bun:test';

import { absoluteUrl, withBase } from './url';

describe('withBase', () => {
  test('站内路径保持根路径', () => {
    expect(withBase('/blog/')).toBe('/blog/');
    expect(withBase('blog/')).toBe('/blog/');
    expect(withBase('')).toBe('/');
  });

  test('外部链接与锚点不处理', () => {
    expect(withBase('https://example.com/a')).toBe('https://example.com/a');
    expect(withBase('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(withBase('#section')).toBe('#section');
  });
});

describe('absoluteUrl', () => {
  test('拼接 origin', () => {
    expect(absoluteUrl('/blog/', 'https://example.com')).toBe('https://example.com/blog/');
    expect(absoluteUrl('https://cdn.example.com/a.png', 'https://example.com')).toBe(
      'https://cdn.example.com/a.png',
    );
  });
});
