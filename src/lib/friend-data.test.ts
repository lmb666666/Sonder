import { describe, expect, test } from 'bun:test';

import { isPlaceholderFeed, parseFriendCircleFeed } from './friend-data';

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

describe('parseFriendCircleFeed', () => {
  test('兼容 Friend-Circle-Lite all.json 的 article_data / link / created', () => {
    const feed = parseFriendCircleFeed({
      statistical_data: { article_num: 1 },
      article_data: [
        {
          title: '文章标题',
          link: 'https://example.com/post/',
          author: '示例作者',
          created: '2026-11-22 10:00:00',
          avatar: 'https://example.com/avatar.png',
        },
      ],
    });

    expect(feed.friends).toEqual([]);
    expect(feed.posts).toEqual([
      {
        title: '文章标题',
        url: 'https://example.com/post/',
        author: '示例作者',
        date: '2026-11-22 10:00:00',
        authorUrl: '',
        avatar: 'https://example.com/avatar.png',
        tags: [],
      },
    ]);
  });

  test('继续兼容 posts / url / date 结构', () => {
    const feed = parseFriendCircleFeed({
      posts: [
        {
          title: '旧格式',
          url: 'https://example.com/old/',
          author: '作者',
          date: '2026-11-01',
        },
      ],
    });

    expect(feed.posts[0]?.title).toBe('旧格式');
    expect(feed.posts[0]?.url).toBe('https://example.com/old/');
    expect(feed.posts[0]?.date).toBe('2026-11-01');
  });
});
