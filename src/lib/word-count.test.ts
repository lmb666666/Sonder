import { describe, expect, test } from 'bun:test';

import { countWords, formatCount, readingMinutes } from './word-count';

describe('word count', () => {
  test('英文与 CJK 字符同口径统计', () => {
    expect(countWords('Hello world 你好')).toBe(4);
    expect(countWords('')).toBe(0);
  });

  test('阅读时长至少 1 分钟', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('你好')).toBe(1);
  });

  test('万级缩写跟随语言', () => {
    expect(formatCount(9999, 'zh-CN')).toBe('9999');
    expect(formatCount(12345, 'zh-CN')).toBe('1.2万');
    expect(formatCount(12345, 'zh-TW')).toBe('1.2萬');
    expect(formatCount(12000, 'en')).toBe('12K');
  });
});
