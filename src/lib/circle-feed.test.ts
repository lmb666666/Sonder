import { describe, expect, test } from 'bun:test';

import { normalizeCircleFeed } from './circle-feed';

const feedUrl = 'https://fcl.example.com/all.json';

describe('normalizeCircleFeed', () => {
  test('兼容 Friend-Circle-Lite all.json 的 article_data / link / created', () => {
    const feed = normalizeCircleFeed(
      {
        statistical_data: { friends_num: 12, active_num: 3, article_num: 1 },
        article_data: [
          {
            title: '文章标题',
            link: 'https://example.com/post/',
            author: '示例作者',
            created: '2026-11-22 10:00:00',
            avatar: 'https://example.com/avatar.png',
            tags: ['随笔', '工具'],
          },
        ],
      },
      feedUrl,
    );

    expect(feed).toEqual({
      friends: 12,
      active: 3,
      total: 1,
      posts: [
        {
          title: '文章标题',
          url: 'https://example.com/post/',
          author: '示例作者',
          authorUrl: '',
          date: '2026-11-22 10:00:00',
          avatar: 'https://example.com/avatar.png',
          tags: ['随笔', '工具'],
        },
      ],
    });
  });

  test('相对链接按 JSON 地址解析，而不是按博客页面', () => {
    const feed = normalizeCircleFeed(
      {
        article_data: [
          {
            title: '相对路径',
            link: '/post/1',
            author: '作者',
            authorUrl: '/about',
            avatar: '/avatar/a.png',
          },
        ],
      },
      feedUrl,
    );

    expect(feed.posts[0]?.url).toBe('https://fcl.example.com/post/1');
    expect(feed.posts[0]?.authorUrl).toBe('https://fcl.example.com/about');
    expect(feed.posts[0]?.avatar).toBe('https://fcl.example.com/avatar/a.png');
  });

  test('继续兼容 posts / url / date 结构并回退统计值', () => {
    const feed = normalizeCircleFeed(
      {
        posts: [
          {
            title: '旧格式',
            url: 'https://example.com/old/',
            author: '作者',
            date: '2026-11-01',
          },
        ],
      },
      feedUrl,
    );

    expect(feed.posts[0]?.title).toBe('旧格式');
    expect(feed.posts[0]?.url).toBe('https://example.com/old/');
    expect(feed.posts[0]?.date).toBe('2026-11-01');
    expect(feed.friends).toBe(1);
    expect(feed.active).toBe(1);
    expect(feed.total).toBe(1);
  });

  test('丢弃非 http(s) 链接和缺少必填字段的条目', () => {
    const feed = normalizeCircleFeed(
      {
        article_data: [
          { title: '坏链接', link: 'javascript:alert(1)', author: '作者' },
          { title: '缺作者', link: 'https://example.com/no-author' },
          { title: '有效', link: 'https://example.com/ok', author: '作者' },
        ],
      },
      feedUrl,
    );

    expect(feed.posts.map((post) => post.title)).toEqual(['有效']);
  });

  test('响应不是对象时返回空数据', () => {
    expect(normalizeCircleFeed(null, feedUrl)).toEqual({
      posts: [],
      friends: 0,
      active: 0,
      total: 0,
    });
    expect(normalizeCircleFeed([], feedUrl)).toEqual({
      posts: [],
      friends: 0,
      active: 0,
      total: 0,
    });
  });
});
