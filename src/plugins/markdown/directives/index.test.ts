import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { MdastNode } from './handlers.js';
import remarkSonderDirectives from './index.js';

// 断网桩：::music 的 Meting 预取在测试里必须走降级路径，保证断言确定性
const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => Promise.reject(new Error('offline test'))) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const transformer = remarkSonderDirectives();
const fakeFile = { message() {} } as unknown as Parameters<
  ReturnType<typeof remarkSonderDirectives>
>[1];

async function run(children: MdastNode[]): Promise<MdastNode[]> {
  const tree = { type: 'root', children } as MdastNode;
  await transformer(tree, fakeFile);
  return tree.children ?? [];
}

function paragraph(value: string): MdastNode {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function text(value: string): MdastNode {
  return { type: 'text', value };
}

function container(
  name: string,
  attributes: Record<string, string | true> = {},
  children: MdastNode[] = [],
): MdastNode {
  return { type: 'containerDirective', name, attributes, children };
}

function leaf(name: string, attributes: Record<string, string | true> = {}): MdastNode {
  return { type: 'leafDirective', name, attributes, children: [] };
}

function inline(
  name: string,
  children: MdastNode[],
  attributes: Record<string, string | true> = {},
): MdastNode {
  return { type: 'textDirective', name, attributes, children };
}

function labelled(title: string): MdastNode {
  return { type: 'paragraph', data: { directiveLabel: true }, children: [text(title)] };
}

describe('提醒块容器（复用 callout 渲染）', () => {
  test(':::note 输出 aside.callout', async () => {
    const [node] = await run([container('note', {}, [labelled('自定义标题'), paragraph('内容')])]);

    expect(node.data?.hName).toBe('aside');
    expect(node.data?.hProperties?.className).toContain('callout');
    expect(node.data?.hProperties?.className).toContain('callout-note');
  });

  test('别名与未知类型回退', async () => {
    const [warn] = await run([container('caution', {}, [paragraph('内容')])]);
    expect(warn.data?.hProperties?.className).toContain('callout-warning');

    // 未知容器名不属于提醒块家族：展开内容并警告（拼写错误要醒目）
    const children = [paragraph('内容')];
    expect(await run([container('mystery', {}, children)])).toEqual(children);
  });

  test('{foldable} 折叠为 details', async () => {
    const [node] = await run([container('note', { foldable: true }, [paragraph('内容')])]);
    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.className).toContain('is-collapsible');
  });
});

describe('details / grid 容器', () => {
  test(':::details[标题]{open} 输出 details[open]', async () => {
    const [node] = await run([
      container('details', { open: true }, [labelled('点我展开'), paragraph('内容')]),
    ]);

    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.open).toBe(true);
    const summary = node.children?.[0];
    expect(summary?.data?.hName).toBe('summary');
    expect(summary?.data?.hProperties?.className).toContain('sd-details-summary');
  });

  test(':::details 缺标题降级为普通内容', async () => {
    const children = [paragraph('内容')];
    expect(await run([container('details', {}, children)])).toEqual(children);
  });

  test(':::grid 输出网格容器', async () => {
    const [node] = await run([container('grid', {}, [paragraph('图一')])]);
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-grid');
  });
});

describe('tabs 容器', () => {
  test('::::tabs 消费 :::tab 子指令', async () => {
    const [node] = await run([
      container('tabs', {}, [
        container('tab', {}, [labelled('标题一'), paragraph('内容一')]),
        container('tab', {}, [labelled('标题二'), paragraph('内容二')]),
      ]),
    ]);

    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-tabs');

    const head = node.children?.[0];
    const buttons = head?.data?.hChildren ?? [];
    expect(buttons).toHaveLength(2);
    expect((buttons[0] as { children: Array<{ value: string }> }).children[0].value).toBe('标题一');

    const panels = node.children?.slice(1) ?? [];
    expect(panels).toHaveLength(2);
    expect(panels[0]?.data?.hProperties?.className).toContain('is-active');
    expect(panels[1]?.data?.hProperties?.hidden).toBeUndefined();
    expect(panels[0]?.children?.[0]?.data?.hProperties?.className).toContain('sd-tab-panel-title');
  });

  test('空 tabs 降级为普通内容', async () => {
    const children = [paragraph('内容')];
    expect(await run([container('tabs', {}, children)])).toEqual(children);
  });

  test('tabs 的按钮与面板有可访问关联', async () => {
    const [node] = await run([
      container('tabs', {}, [
        container('tab', {}, [labelled('一'), paragraph('内容一')]),
        container('tab', {}, [labelled('二'), paragraph('内容二')]),
      ]),
    ]);
    const buttons = node.children?.[0]?.data?.hChildren ?? [];
    const first = buttons[0] as { properties: Record<string, unknown> };
    const second = buttons[1] as { properties: Record<string, unknown> };
    const panels = node.children?.slice(1) ?? [];

    expect(first.properties.ariaControls).toEqual([panels[0]?.data?.hProperties?.id]);
    expect(second.properties.ariaControls).toEqual([panels[1]?.data?.hProperties?.id]);
    expect(panels[0]?.data?.hProperties?.['aria-labelledby']).toBe(first.properties.id);
  });

  test('tabs 的非 tab 内容保留在标签页之后', async () => {
    const extra = paragraph('额外内容');
    const nodes = await run([
      container('tabs', {}, [container('tab', {}, [labelled('一'), paragraph('内容一')]), extra]),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toBe(extra);
  });
});

describe('columns / timeline（layouts 迁移）', () => {
  test('花括号属性输出分栏样式', async () => {
    const [node] = await run([
      container('columns', { cols: '2', ratio: '1:2' }, [
        container('column', {}, [paragraph('左')]),
        container('column', {}, [paragraph('右')]),
      ]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('markdown-columns-2');
    expect(node.data?.hProperties?.style).toBe(
      '--markdown-layout-column-template: minmax(0, 1fr) minmax(0, 2fr);',
    );
  });

  test('无效 cols 属性按实际分栏数渲染', async () => {
    const [node] = await run([
      container('columns', { cols: '3' }, [
        container('column', {}, [paragraph('左')]),
        container('column', {}, [paragraph('右')]),
      ]),
    ]);

    expect(node.data?.hProperties?.className).toContain('markdown-columns-2');
  });

  test(':::timeline 的 event 日期属性', async () => {
    const [node] = await run([
      container('timeline', {}, [container('event', { date: '2026-10-31' }, [paragraph('发布')])]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.dataTimelineDirection).toBe('vertical');
    const list = node.children?.[0];
    const event = list?.children?.[0];
    expect(event?.data?.hProperties?.dataTimelineDate).toBe('2026-10-31');
  });

  test(':::timeline 第一个 event 前的内容不被丢弃', async () => {
    const preamble = paragraph('时间线说明');
    const nodes = await run([
      container('timeline', {}, [
        preamble,
        container('event', { date: '2026-10-31' }, [paragraph('发布')]),
      ]),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toBe(preamble);
  });
});

describe('排版容器（构建期结构化）', () => {
  test(':::poetry 拆分标题/作者/脚注', async () => {
    const [node] = await run([
      container('poetry', { footer: '—— 匿名' }, [
        labelled('俳句一则|示例作者'),
        paragraph('旧博客沉去'),
      ]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('poetry');
    const [title, author, content, footer] = node.children ?? [];
    expect(title?.data?.hProperties?.className).toContain('poetry-title');
    expect(author?.data?.hProperties?.className).toContain('poetry-meta');
    expect(content?.data?.hProperties?.className).toContain('poetry-content');
    expect(footer?.data?.hProperties?.className).toContain('poetry-meta');
  });

  test(':::chat 构建期结构化 dt/dd', async () => {
    const [node] = await run([
      container('chat', {}, [
        paragraph('{.我}'),
        paragraph('博客重写用什么模板？'),
        paragraph('{:对方撤回了一条消息}'),
      ]),
    ]);

    expect(node.data?.hName).toBe('dl');
    expect(node.data?.hProperties?.className).toContain('chat');
    const [dt1, dd1, dt2] = node.children ?? [];
    expect(dt1?.data?.hName).toBe('dt');
    expect(dt1?.data?.hProperties?.className).toContain('chat-myself');
    expect(dd1?.data?.hName).toBe('dd');
    expect(dd1?.data?.hProperties?.className).toContain('chat-body');
    expect(dt2?.data?.hProperties?.className).toContain('chat-system');
  });

  test(':::chat 段内软换行也能拆署名', async () => {
    const [node] = await run([
      container('chat', {}, [{ type: 'paragraph', children: [text('{朋友}\nSonder 收编完成。')] }]),
    ]);
    const [dt, dd] = node.children ?? [];
    expect(dt?.data?.hProperties?.className).toContain('chat-caption');
    expect(dd?.data?.hProperties?.className).toContain('chat-body');
  });

  test(':::carousel 每个子项包装为幻灯片并注入控制按钮', async () => {
    const [node] = await run([
      container('carousel', { aspect: '16 / 9' }, [paragraph('![封面](/images/a.png)')]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('sonder-carousel');
    expect(node.data?.hProperties?.style).toBe('--carousel-aspect-ratio:16 / 9');
    const [track, controls] = node.children ?? [];
    expect(track?.data?.hProperties?.className).toContain('sonder-carousel__track');
    const slide = track?.children?.[0];
    expect(slide?.data?.hProperties?.['data-carousel-slide']).toBe('');
    expect(controls?.data?.hChildren).toHaveLength(2);
  });

  test(':::media-shelf 消费 :::media-item 子指令', async () => {
    const [node] = await run([
      container('media-shelf', { columns: '3' }, [
        container('media-item', { type: 'book', title: '书名', creator: '作者', rating: '4' }, [
          {
            type: 'paragraph',
            children: [{ type: 'image', url: '../../assets/cover.png', alt: '书名' }],
          },
        ]),
      ]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('sonder-media-shelf');
    expect(node.data?.hProperties?.style).toBe('--media-shelf-columns:3');
    const item = node.children?.[0];
    expect(item?.data?.hProperties?.className).toContain('sonder-media-shelf__item');
    const [cover, content] = item?.children ?? [];
    expect(cover?.data?.hProperties?.className).toContain('sonder-media-shelf__cover');
    expect(cover?.children?.[0]?.type).toBe('image');
    expect(content?.data?.hChildren).toBeDefined();
  });
});

describe('叶子指令', () => {
  test('::github-card 渲染预取数据卡片', async () => {
    const [node] = await run([leaf('github-card', { repo: 'CuteLeaf/Firefly' })]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    expect(node.data?.hProperties?.href).toBe('https://github.com/CuteLeaf/Firefly');
    const desc = (node.data?.hChildren?.[1] as any)?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toContain(
      'Astro blog theme',
    );
  });

  test('::github-card 未知仓库降级', async () => {
    const [node] = await run([leaf('github-card', { repo: 'unknown/unknown' })]);
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    const desc = (node.data?.hChildren?.[1] as any)?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toBe('GitHub 仓库');
  });

  test('::github-card 缺 repo 属性时跳过', async () => {
    expect(await run([leaf('github-card', {})])).toEqual([]);
  });

  test('::bilibili 渲染 iframe', async () => {
    const [node] = await run([leaf('bilibili', { bvid: 'BV1xx411c7mD' })]);

    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-embed');
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=0&danmaku=0',
    );
  });

  test('::bilibili 无效 bvid 时跳过', async () => {
    expect(await run([leaf('bilibili', { bvid: 'invalid' })])).toEqual([]);
  });

  test('::music 单曲：Meting 失败降级为官方外链播放器', async () => {
    // 测试环境 stub 掉 fetch（见文件底部 beforeAll）：Meting 不可用 → outchain iframe
    const [node] = await run([leaf('music', { type: 'song', id: '28560087' })]);
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-embed');
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toContain(
      'type=2&id=28560087',
    );
  });

  test('::music 歌单：Meting 失败降级为官方外链播放器', async () => {
    const [node] = await run([leaf('music', { id: '7294439968' })]);
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-embed');
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toContain(
      'type=0&id=7294439968',
    );
  });

  test('::bilibili {nano} 切换小窗播放器', async () => {
    const [node] = await run([leaf('bilibili', { bvid: 'BV1xx411c7mD', nano: true })]);
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toBe(
      'https://www.bilibili.com/blackboard/newplayer.html?bvid=BV1xx411c7mD',
    );
  });

  test('::video 直链视频输出 video 元素', async () => {
    const [node] = await run([
      leaf('video', { src: '/media/demo.mp4', poster: '/media/demo.jpg' }),
    ]);
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-video');
    const video = node.data?.hChildren?.[0] as {
      tagName: string;
      properties: Record<string, unknown>;
    };
    expect(video.tagName).toBe('video');
    expect(video.properties.src).toBe('/media/demo.mp4');
    expect(video.properties.poster).toBe('/media/demo.jpg');
  });

  test('::video 缺 src 时跳过', async () => {
    expect(await run([leaf('video', {})])).toEqual([]);
  });

  test('::douyin 竖屏默认、{wide} 切横屏并带 zoom 因子', async () => {
    const [portrait] = await run([leaf('douyin', { vid: '7301234567890123456' })]);
    expect(portrait.data?.hProperties?.style).toBe('aspect-ratio:27 / 56');
    expect(portrait.data?.hProperties?.['data-sd-video-zoom']).toBe('0.0031');
    const iframe = portrait.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toBe(
      'https://open.douyin.com/player/video?vid=7301234567890123456',
    );

    const [landscape] = await run([leaf('douyin', { vid: '7301234567890123456', wide: true })]);
    expect(landscape.data?.hProperties?.style).toBe('aspect-ratio:1198 / 731');
    expect(landscape.data?.hProperties?.['data-sd-video-zoom']).toBe('0.00134');
  });

  test('::tiktok 输出 embed v3 播放器', async () => {
    const [node] = await run([leaf('tiktok', { id: '7367543893026422146' })]);
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toBe(
      'https://www.tiktok.com/embed/v3/7367543893026422146',
    );
  });

  test('::douyin / ::tiktok 缺属性时跳过', async () => {
    expect(await run([leaf('douyin', {})])).toEqual([]);
    expect(await run([leaf('tiktok', { id: 'abc' })])).toEqual([]);
  });

  test('::music 元数据不可用时降级为链接卡片', async () => {
    const [node] = await run([leaf('music', { server: 'tencent', type: 'song', id: '001abc' })]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-link-card');
    expect(node.data?.hProperties?.href).toBe('https://y.qq.com/n/ryqq/songDetail/001abc');
  });

  test('::music 电台直接走官方外链（无 Meting 解析）', async () => {
    const [node] = await run([leaf('music', { type: 'radio', id: '797632409' })]);
    const iframe = node.data?.hChildren?.[0] as unknown as {
      properties: { src: string; title: string; style: string };
    };
    expect(iframe.properties.src).toContain('type=19&id=797632409');
    expect(iframe.properties.title).toBe('网易云音乐播放器');
    expect(iframe.properties.style).toContain('height:');
  });

  test('::music{url} 直贴链接：hash 路由与查询参数均可识别', async () => {
    const [hashStyle] = await run([
      leaf('music', { url: 'https://music.163.com/#/song?id=28560087' }),
    ]);
    expect(hashStyle.data?.hName).toBe('div');
    const iframe = hashStyle.data?.hChildren?.[0];
    expect((iframe as unknown as { properties: { src: string } }).properties.src).toContain(
      'type=2&id=28560087',
    );

    const [queryStyle] = await run([
      leaf('music', { url: 'https://music.163.com/playlist?id=7294439968' }),
    ]);
    expect(queryStyle.data?.hName).toBe('div');
    const playlistFrame = queryStyle.data?.hChildren?.[0];
    expect((playlistFrame as unknown as { properties: { src: string } }).properties.src).toContain(
      'type=0&id=7294439968',
    );
  });

  test('::music 非网易链接与缺属性时跳过', async () => {
    expect(await run([leaf('music', { url: 'https://example.com/song?id=1' })])).toEqual([]);
    expect(await run([leaf('music', {})])).toEqual([]);
  });

  test('::music 生成 Spotify 官方 embed 播放器', async () => {
    const [node] = await run([
      leaf('music', {
        provider: 'spotify',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      }),
    ]);

    expect(node.data?.hName).toBe('figure');
    expect(node.data?.hProperties?.className).toContain('sonder-audio-player');
    const embed = node.data?.hChildren?.[1];
    expect((embed as unknown as { properties: { src: string } }).properties.src).toBe(
      'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
    );
  });

  test('::music 非法 provider 跳过', async () => {
    expect(await run([leaf('music', { provider: 'example', url: 'https://example.com' })])).toEqual(
      [],
    );
  });

  test('::friend-circle 输出头部、初始动态与数据脚本', async () => {
    const [node] = await run([leaf('friend-circle', { src: 'demo', limit: '2' })]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('friend-circle');
    const [header, posts, script] = node.data?.hChildren ?? [];
    expect((header as { tagName: string }).tagName).toBe('header');
    expect(
      ((posts as { children: unknown[] }).children as Array<{ tagName: string }>)[0].tagName,
    ).toBe('article');
    expect((script as { tagName: string }).tagName).toBe('script');
  });

  test('::friend-link-card 输出卡片网格', async () => {
    const [node] = await run([leaf('friend-link-card', { src: 'demo', columns: '3' })]);
    expect(node.data?.hName).toBe('div');
    // 同名标签的 wrapHast 会合并外层 region，hChildren[0] 即卡片网格
    const list = node.data?.hChildren?.[0] as { properties: Record<string, unknown> };
    expect(list.properties.style).toBe('--friend-link-columns:3');
  });

  test('::friend-link-application 输出表单骨架与配置', async () => {
    const [node] = await run([leaf('friend-link-application', { repository: 'lmb666666/Sonder' })]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.className).toContain('friend-link-application');
    const script = node.data?.hChildren?.[1] as { children: Array<{ value: string }> };
    expect(script.children[0].value).toContain('https://github.com/lmb666666/Sonder/issues/new');
  });

  test('::friend-link-application 缺 repository 时跳过', async () => {
    expect(await run([leaf('friend-link-application', {})])).toEqual([]);
  });

  test('::link-card 渲染链接卡', async () => {
    const [node] = await run([
      leaf('link-card', { href: 'https://example.com', title: '示例', description: '说明' }),
    ]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-link-card');
    expect(node.data?.hProperties?.href).toBe('https://example.com');
  });

  test('::link 缺 href 时跳过', async () => {
    expect(await run([leaf('link-card', { title: '示例' })])).toEqual([]);
  });
});

describe('行内指令', () => {
  test(':badge 保留行内 Markdown', async () => {
    const [node] = await run([inline('badge', [{ type: 'strong', children: [text('新')] }])]);

    expect(node.data?.hName).toBe('span');
    expect(node.data?.hProperties?.className).toContain('sd-badge');
    expect(node.children?.[0]?.type).toBe('strong');
  });

  test(':badge{href} 渲染为链接', async () => {
    const [node] = await run([inline('badge', [text('Sonder')], { href: 'https://example.com' })]);
    expect(node.data?.hName).toBe('a');
  });

  test(':key / :spoiler / :span', async () => {
    const [kbd] = await run([inline('key', [text('Ctrl')])]);
    expect(kbd.data?.hName).toBe('kbd');
    expect(kbd.data?.hProperties?.['data-key']).toBe('Ctrl');

    const [combo] = await run([inline('key', [text('K')], { cmd: true })]);
    expect(combo.data?.hProperties?.['data-mods']).toBe('cmd');

    const [blur] = await run([inline('spoiler', [text('剧透')])]);
    expect(blur.data?.hProperties?.className).toContain('sd-blur');

    const [span] = await run([inline('span', [text('红字')], { color: '#c0392b' })]);
    expect(span.data?.hProperties?.style).toBe('color:#c0392b');
  });
});

describe('P1 扩展：按钮组 / 本地音频 / 剧透点击', () => {
  test(':::btns 输出按钮组容器与布局类', async () => {
    const [node] = await run([
      container('btns', { layout: 'grid-3' }, [paragraph(':btn[A]{href="https://a.example"}')]),
    ]);

    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-btns');
    expect(node.data?.hProperties?.className).toContain('sd-btns--grid-3');
  });

  test(':::btns 未知布局回退为 flex 流式', async () => {
    const [node] = await run([container('btns', { layout: 'masonry' }, [paragraph('x')])]);
    expect(node.data?.hProperties?.className).toContain('sd-btns');
    expect(node.data?.hProperties?.className).not.toContain('sd-btns--masonry');
  });

  test('::audio 传递 size 与 theme', async () => {
    const [node] = await run([
      leaf('audio', { src: '/media/podcast.mp3', size: 'wide', theme: 'midnight' }),
    ]);

    expect(node.data?.hProperties?.className).toContain('sonder-audio-player--wide');
    expect(node.data?.hProperties?.style).toContain('--music-surface-light');
  });

  test('::audio {src} 走原生音频播放器', async () => {
    const [node] = await run([
      leaf('audio', { src: '/media/podcast.mp3', title: '播客', artist: '主播' }),
    ]);

    expect(node.data?.hName).toBe('figure');
    expect(node.data?.hProperties?.className).toContain('sonder-audio-player');
    const body = JSON.stringify(node.data?.hChildren?.[0]);
    // hastscript 会把 data-* 属性转为驼峰（序列化时还原为 data-audio）
    expect(body).toContain('dataAudio');
    expect(body).toContain('/media/podcast.mp3');
    // 单曲不出现歌单折叠区
    expect(body).not.toContain('sonder-audio-player__playlist');
  });

  test('::music {provider+url} 仍走官方 embed', async () => {
    const [node] = await run([
      leaf('music', {
        provider: 'spotify',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      }),
    ]);
    expect(node.data?.hName).toBe('figure');
    const embed = node.data?.hChildren?.[1];
    expect((embed as unknown as { properties: { src: string } }).properties.src).toContain(
      'open.spotify.com/embed',
    );
  });

  test(':spoiler 输出可切换按钮语义', async () => {
    const [node] = await run([inline('spoiler', [text('剧透')])]);
    expect(node.data?.hProperties?.role).toBe('button');
    expect(node.data?.hProperties?.['aria-pressed']).toBe('false');
  });
});

describe('真实 Markdown 解析（裸旗标归一化）', () => {
  /** 走完整 remark 管线：程序化构造节点会掩盖裸属性解析差异 */
  async function runMd(md: string): Promise<MdastNode[]> {
    const { unified } = await import('unified');
    const { default: remarkParse } = await import('remark-parse');
    const { default: remarkDirective } = await import('remark-directive');
    const proc = unified().use(remarkParse).use(remarkDirective).use(remarkSonderDirectives);
    const tree = proc.parse(md) as MdastNode;
    await transformer(tree, fakeFile);
    return tree.children ?? [];
  }

  test('{open} 裸旗标让折叠面板默认展开', async () => {
    const [node] = await runMd(':::details[点我展开]{open}\n内容\n:::\n');
    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.open).toBe(true);
  });

  test('{open=true} 同样让折叠面板默认展开', async () => {
    const [node] = await runMd(':::details[点我展开]{open=true}\n内容\n:::\n');
    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.open).toBe(true);
  });

  test('富文本 label 不会被 details 误判为缺标题', async () => {
    const [node] = await runMd(':::details[**粗体标题**]{open}\n内容\n:::\n');
    expect(node.data?.hName).toBe('details');
    const summary = node.children?.[0];
    expect(summary?.data?.hName).toBe('summary');
  });

  test('未知叶子指令保留指令名而不是静默消失', async () => {
    const [node] = await runMd('::mystery{foo="bar"}\n');
    expect(node.children?.[0]?.value).toBe('::mystery');
  });

  test(':::column[标题] 的 label 不进入正文', async () => {
    const [node] = await runMd('::::columns\n:::column[标题]\n内容\n:::\n::::\n');
    const column = node.children?.[0];
    const texts = (column?.children ?? [])
      .flatMap((child) => child.children ?? [])
      .map((child) => child.value)
      .filter(Boolean);
    expect(texts).not.toContain('标题');
  });

  test('{square} 裸旗标取消徽标圆角', async () => {
    const [paragraph] = await runMd(':badge[方形]{img="https://x/y.png" square}\n');
    const node = paragraph.children?.[0];
    expect(node?.data?.hProperties?.className).not.toContain('is-round');
  });

  test('{foldable} 裸旗标折叠提醒块', async () => {
    const [node] = await runMd(':::note[可折叠]{foldable}\n内容\n:::\n');
    expect(node.data?.hName).toBe('details');
  });

  test('{media} 裸旗标标记媒体栏', async () => {
    const [node] = await runMd('::::columns\n:::column{media}\n![图](/images/a.png)\n:::\n::::\n');
    const column = node.children?.[0];
    expect(column?.data?.hProperties?.className).toContain('is-media');
  });
});

describe('回归：近期修复的结构契约', () => {
  test(':::carousel 输出 data-track（wheel 脚本依赖，缺失则按钮失效）', async () => {
    const [node] = await run([container('carousel', {}, [paragraph('x')])]);
    const track = node.children?.[0];
    expect(track?.data?.hProperties?.['data-track']).toBe('');
  });

  test(':::media-shelf 封面图不被锚点/样式压扁（图节点保留在 figure 内）', async () => {
    const [node] = await run([
      container('media-shelf', {}, [
        container('media-item', { type: 'book', title: 't', creator: 'c' }, [
          { type: 'paragraph', children: [{ type: 'image', url: '/a.png', alt: 'a' }] },
        ]),
      ]),
    ]);
    const item = node.children?.[0];
    const cover = item?.children?.[0];
    expect(cover?.data?.hProperties?.className).toContain('sonder-media-shelf__cover');
    expect(cover?.children?.[0]?.type).toBe('image');
  });

  test(':::media-shelf 支持链接包裹封面、href、note 与非法列数回退', async () => {
    const image = { type: 'image', url: '/a.png', alt: 'a' };
    const [node] = await run([
      container('media-shelf', { columns: '-2' }, [
        container(
          'media-item',
          { type: 'book', title: 't', creator: 'c', href: 'https://example.com', note: '短评' },
          [
            {
              type: 'paragraph',
              children: [{ type: 'link', url: 'https://example.com', children: [image] }],
            },
          ],
        ),
      ]),
    ]);

    expect(node.data?.hProperties?.style).toBe('--media-shelf-columns:4');
    const item = node.children?.[0];
    expect(item?.data?.hName).toBe('a');
    expect(item?.data?.hProperties?.href).toBe('https://example.com');
    expect(item?.children?.[0]?.children?.[0]?.type).toBe('image');
    expect(JSON.stringify(item?.children?.[1]?.data?.hChildren)).toContain('短评');
  });

  test(':::media-shelf 链接包裹封面可作为链接目标', async () => {
    const [node] = await run([
      container('media-shelf', {}, [
        container('media-item', { type: 'book', title: 't', creator: 'c' }, [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                url: 'https://linked.example',
                children: [{ type: 'image', url: '/a.png', alt: 'a' }],
              },
            ],
          },
        ]),
      ]),
    ]);

    const item = node.children?.[0];
    expect(item?.data?.hName).toBe('a');
    expect(item?.data?.hProperties?.href).toBe('https://linked.example');
  });

  test(':::music-score 优先读取围栏代码块内的 ABC（裸文本会被冒号解析撕碎）', async () => {
    const abc = 'X:1\nT:测试\nK:C\n"1"C D E F|';
    const [node] = await run([container('music-score', {}, [{ type: 'code', value: abc }])]);
    // hast 属性名在 mdast/hast 里是 camelCase，序列化时还原为 data-*
    const pre = (node.data?.hChildren ?? []).find(
      (child) => (child as { tagName?: string }).tagName === 'pre',
    ) as { children?: Array<{ value: string }> } | undefined;
    expect(pre?.children?.[0]?.value).toBe(abc);
    expect(JSON.stringify(node.data?.hChildren)).toContain('music-score-source');
  });

  test('::friend-link-card 简介用 CSS 定义的 __bio 类名', async () => {
    const [node] = await run([
      leaf('friend-link-card', { name: 'N', url: 'https://e.com', bio: '简介' }),
    ]);
    const html = JSON.stringify(node.data?.hChildren?.[0]);
    expect(html).toContain('friend-link-card__bio');
    expect(html).not.toContain('friend-link-card__description');
  });

  test('::friend-link-application 预览块不带 <code>（避免被 Expressive Code 劫持）', async () => {
    const [node] = await run([leaf('friend-link-application', { repository: 'a/b' })]);
    const html = JSON.stringify(node.data?.hChildren?.[0]);
    // 预览块必须是 <pre data-application-preview>，且不能含 <code>（否则被 Expressive Code 劫持）
    expect(html).toContain('dataApplicationPreview');
    expect(html).not.toContain('"tagName":"code"');
  });
});

describe('未知指令与嵌套', () => {
  test('未知行内指令保留原文', async () => {
    const [node] = await run([inline('foo', [text('bar')])]);
    expect(node).toEqual(text(':foo[bar]'));
  });

  test('未知容器展开为普通内容', async () => {
    const children = [paragraph('内容')];
    expect(await run([container('foo', {}, children)])).toEqual(children);
  });

  test('嵌套：分栏内的提醒块正常渲染', async () => {
    const [section] = await run([
      container('columns', {}, [
        container('column', {}, [container('note', {}, [paragraph('栏内提醒')])]),
      ]),
    ]);

    const column = section.children?.[0];
    const callout = column?.children?.[0];
    expect(callout?.data?.hProperties?.className).toContain('callout-note');
  });

  test('嵌套：tabs 内的代码与提醒', async () => {
    const [node] = await run([
      container('tabs', {}, [
        container('tab', {}, [labelled('标签'), container('note', {}, [paragraph('标签页内容')])]),
      ]),
    ]);

    const panel = node.children?.[1];
    expect(JSON.stringify(panel)).toContain('callout-note');
  });
});

describe('::music 统一分发', () => {
  const metingApi = 'https://meting.test/?server=:server&type=:type&id=:id';

  async function runMusic(children: MdastNode[], response: 'audio' | 'html'): Promise<MdastNode[]> {
    const realFetch = globalThis.fetch;
    const audioUrl =
      response === 'audio' ? 'https://cdn.test/audio-ok.mp3' : 'https://cdn.test/audio-qq.mp3';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('https://meting.test/')) {
        return new Response(
          JSON.stringify([
            {
              name: '示例曲目',
              artist: '示例歌手',
              url: audioUrl,
              pic: 'https://cdn.test/pic.jpg',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url === audioUrl) {
        return new Response('', {
          status: 200,
          headers: { 'content-type': response === 'audio' ? 'audio/mpeg' : 'text/html' },
        });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      const transformer = remarkSonderDirectives({ metingApi });
      const tree = { type: 'root', children } as MdastNode;
      await transformer(tree, fakeFile);
      return tree.children ?? [];
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  test('网易云音频可用时渲染原生播放器', async () => {
    const [node] = await runMusic(
      [leaf('music', { url: 'https://music.163.com/song?id=28560087' })],
      'audio',
    );
    expect(node.data?.hName).toBe('figure');
    expect(node.data?.hProperties?.className).toContain('sonder-audio-player');
  });

  test('QQ 只有元数据时渲染曲目卡片', async () => {
    const [node] = await runMusic(
      [leaf('music', { url: 'https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV' })],
      'html',
    );
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-music-card');
  });
});
