import { describe, expect, test } from 'bun:test';

import { buildFriendJson, isFclEnabled } from './generate-friend-json';

describe('generate-friend-json', () => {
  test('只在启用 FCL 时生成 friend.json', () => {
    expect(
      isFclEnabled({
        config: { integrations: { friends: { enable: true, provider: 'fcl' } } },
      }),
    ).toBe(true);
    expect(
      isFclEnabled({
        config: { integrations: { friends: { enable: false, provider: 'fcl' } } },
      }),
    ).toBe(false);
    expect(
      isFclEnabled({
        config: { integrations: { friends: { enable: true, provider: 'youlin' } } },
      }),
    ).toBe(false);
  });

  test('按 FCL 需要的 [name, url, avatar] 结构生成并去重', () => {
    const output = buildFriendJson({
      friends: {
        groups: [
          {
            title: '朋友',
            items: [
              { name: 'A', url: 'https://a.example.com', avatar: '/a.png' },
              { name: 'A duplicate', url: 'https://a.example.com', avatar: '/a2.png' },
              { name: 'B', url: 'https://b.example.com' },
            ],
          },
        ],
      },
    });

    expect(output).toEqual({
      friends: [
        ['A', 'https://a.example.com', '/a.png'],
        ['B', 'https://b.example.com', ''],
      ],
    });
  });
});
