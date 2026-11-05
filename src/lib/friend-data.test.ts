import { describe, expect, test } from 'bun:test';

import { isPlaceholderFeed } from './friend-data';

describe('isPlaceholderFeed', () => {
  test('识别模板内置的 example 域名', () => {
    expect(isPlaceholderFeed('https://example.com/feed.xml')).toBe(true);
    expect(isPlaceholderFeed('https://www.example.org/feed')).toBe(true);
    expect(isPlaceholderFeed('http://example.net/atom.xml')).toBe(true);
    expect(isPlaceholderFeed('https://example.dev/feed.xml')).toBe(true);
  });

  test('真实域名与空值不误判', () => {
    expect(isPlaceholderFeed('https://example.blog/feed.xml')).toBe(false);
    expect(isPlaceholderFeed('https://notexample.com/feed.xml')).toBe(false);
    expect(isPlaceholderFeed('')).toBe(false);
    expect(isPlaceholderFeed(undefined)).toBe(false);
  });
});
