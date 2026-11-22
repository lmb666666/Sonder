import { describe, expect, test } from 'bun:test';

import { renderMomentSpecial, type MomentSpecialLabels } from './moment-special';
import type { MomentItem } from './moments';

const labels: MomentSpecialLabels = {
  github: 'GitHub 项目',
  website: '网站',
  music: '音乐',
  location: '位置',
  video: '视频',
  tweet: '推文',
};

const item = (patch: Partial<MomentItem>): MomentItem => ({
  id: 'm',
  content: '',
  date: '2026-10-24T12:00:00+08:00',
  ...patch,
});

describe('renderMomentSpecial', () => {
  test('网站复用 sd-link-card，并用域名补描述', () => {
    const html = renderMomentSpecial(
      item({
        extension: {
          type: 'website',
          title: 'SearXNG',
          url: 'https://search.liang.one/',
        },
      }),
      labels,
    );
    expect(html).toContain('class="sd-link-card"');
    expect(html).toContain('href="https://search.liang.one/"');
    expect(html).toContain('search.liang.one');
  });

  test('GitHub 复用 sd-github-card 与 owner 头像', () => {
    const html = renderMomentSpecial(
      item({
        extension: {
          type: 'github',
          title: 'moeru-ai/airi',
          description: 'https://github.com/moeru-ai/airi',
          url: 'https://github.com/moeru-ai/airi',
        },
      }),
      labels,
    );
    expect(html).toContain('class="sd-github-card"');
    expect(html).toContain('https://github.com/moeru-ai.png?size=64');
    expect(html).toContain('moeru-ai/airi');
  });

  test('音乐输出可升级的 fallback 卡与歌曲 URL', () => {
    const html = renderMomentSpecial(
      item({
        extension: {
          type: 'music',
          title: '网易云音乐',
          url: 'https://music.163.com/#/song?id=36668690',
        },
      }),
      labels,
    );
    expect(html).toContain('data-moment-music');
    expect(html).toContain('data-song-url="https://music.163.com/#/song?id=36668690"');
    expect(html).toContain('class="sd-link-card"');
  });

  test('位置有坐标时输出高德链接卡', () => {
    const html = renderMomentSpecial(
      item({
        extension: {
          type: 'location',
          title: '老城区',
          description: '31.23°, 121.47°',
          url: 'https://uri.amap.com/marker?position=121.47,31.23&name=x',
        },
      }),
      labels,
    );
    expect(html).toContain('class="sd-link-card"');
    expect(html).toContain('uri.amap.com/marker');
    expect(html).toContain('31.23');
  });

  test('B 站复用 sd-embed，抖音复用 sd-video 与 zoom', () => {
    const bilibili = renderMomentSpecial(
      item({ video: { provider: 'bilibili', id: 'BV1GJ411x7h7' } }),
      labels,
    );
    expect(bilibili).toContain('class="sd-embed"');
    expect(bilibili).toContain('data-sd-provider="bilibili"');
    expect(bilibili).toContain('player.bilibili.com');

    const douyin = renderMomentSpecial(
      item({ video: { provider: 'douyin', id: '7301234567890123456' } }),
      labels,
    );
    expect(douyin).toContain('class="sd-video"');
    expect(douyin).toContain('data-sd-video-zoom="0.0031"');
    expect(douyin).toContain('aspect-ratio:27 / 56');
  });

  test('标题与 URL 都转义', () => {
    const html = renderMomentSpecial(
      item({
        extension: {
          type: 'website',
          title: '<script>alert(1)</script>',
          url: 'https://example.com/',
        },
      }),
      labels,
    );
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
