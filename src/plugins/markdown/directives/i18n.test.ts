import { describe, expect, test } from 'bun:test';

import { getDirectiveI18n, normalizeDirectiveLanguage } from './i18n';

describe('directive i18n', () => {
  test('语言归一化', () => {
    expect(normalizeDirectiveLanguage('zh-CN')).toBe('zh-CN');
    expect(normalizeDirectiveLanguage('zh-Hans')).toBe('zh-CN');
    expect(normalizeDirectiveLanguage('zh-TW')).toBe('zh-TW');
    expect(normalizeDirectiveLanguage('zh-Hant')).toBe('zh-TW');
    expect(normalizeDirectiveLanguage('en-US')).toBe('en');
    expect(normalizeDirectiveLanguage(undefined)).toBe('en');
  });

  test('友链申请、媒体状态与播放器文案跟随语言', () => {
    const en = getDirectiveI18n('en');
    const zh = getDirectiveI18n('zh-CN');

    expect(en.friendApplication.title).toBe('Apply for a friend link');
    expect(zh.friendApplication.title).toBe('申请友链');
    expect(en.mediaStatus.completed).toBe('Completed');
    expect(zh.mediaStatus.completed).toBe('已完成');
    expect(en.neteasePlayer).toContain('NetEase');
    expect(zh.neteasePlayer).toContain('网易云');
  });
});
