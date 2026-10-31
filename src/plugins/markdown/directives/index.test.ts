import { describe, expect, test } from 'bun:test';

import type { MdastNode } from './handlers.js';
import remarkSonderDirectives from './index.js';

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

    const panels = node.children?.slice(1);
    expect(panels).toHaveLength(2);
    expect(panels[0]?.data?.hProperties?.className).toContain('is-active');
    expect(panels[1]?.data?.hProperties?.hidden).toBe(true);
  });

  test('空 tabs 降级为普通内容', async () => {
    const children = [paragraph('内容')];
    expect(await run([container('tabs', {}, children)])).toEqual(children);
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
  test('::github 渲染预取数据卡片', async () => {
    const [node] = await run([leaf('github', { repo: 'CuteLeaf/Firefly' })]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    expect(node.data?.hProperties?.href).toBe('https://github.com/CuteLeaf/Firefly');
    const desc = node.data?.hChildren?.[1]?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toContain(
      'Astro blog theme',
    );
  });

  test('::github 未知仓库降级', async () => {
    const [node] = await run([leaf('github', { repo: 'unknown/unknown' })]);
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    const desc = node.data?.hChildren?.[1]?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toBe('GitHub 仓库');
  });

  test('::github 缺 repo 属性时跳过', async () => {
    expect(await run([leaf('github', {})])).toEqual([]);
  });

  test('::bilibili 渲染 iframe', async () => {
    const [node] = await run([leaf('bilibili', { bvid: 'BV1xx411c7mD' })]);

    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-embed');
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as { properties: { src: string } }).properties.src).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=0&danmaku=0',
    );
  });

  test('::bilibili 无效 bvid 时跳过', async () => {
    expect(await run([leaf('bilibili', { bvid: 'invalid' })])).toEqual([]);
  });

  test('::netease 单曲映射 outchain 参数', async () => {
    const [node] = await run([leaf('netease', { type: 'song', id: '28560087' })]);
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as { properties: { src: string } }).properties.src).toContain(
      'type=2&id=28560087',
    );
  });

  test('::netease 歌单输出原生播放器（有网）或链接卡片（降级）', async () => {
    const [node] = await run([leaf('netease', { id: '7294439968' })]);
    // Meting 可达 → figure 原生播放器；不可达 → a 链接卡片。两者都不能是空内容。
    expect(['figure', 'a']).toContain(node.data?.hName);
    if (node.data?.hName === 'a') {
      expect(node.data?.hProperties?.className).toContain('sd-link-card');
      expect(node.data?.hProperties?.href).toBe('https://music.163.com/#/playlist?id=7294439968');
    } else {
      expect(node.data?.hProperties?.className).toContain('sonder-music-player');
    }
  });

  test('::music-player 生成 Spotify 官方 embed 播放器', async () => {
    const [node] = await run([
      leaf('music-player', {
        provider: 'spotify',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      }),
    ]);

    expect(node.data?.hName).toBe('figure');
    expect(node.data?.hProperties?.className).toContain('sonder-music-player');
    const embed = node.data?.hChildren?.[1];
    expect((embed as { properties: { src: string } }).properties.src).toBe(
      'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
    );
  });

  test('::music-player 非法 provider 跳过', async () => {
    expect(
      await run([leaf('music-player', { provider: 'example', url: 'https://example.com' })]),
    ).toEqual([]);
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

  test('::link 渲染链接卡', async () => {
    const [node] = await run([
      leaf('link', { href: 'https://example.com', title: '示例', description: '说明' }),
    ]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-link-card');
    expect(node.data?.hProperties?.href).toBe('https://example.com');
  });

  test('::link 缺 href 时跳过', async () => {
    expect(await run([leaf('link', { title: '示例' })])).toEqual([]);
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

  test(':key / :blur / :span', async () => {
    const [kbd] = await run([inline('key', [text('Ctrl')])]);
    expect(kbd.data?.hName).toBe('kbd');
    expect(kbd.data?.hProperties?.['data-key']).toBe('Ctrl');

    const [combo] = await run([inline('key', [text('K')], { cmd: true })]);
    expect(combo.data?.hProperties?.['data-mods']).toBe('cmd');

    const [blur] = await run([inline('blur', [text('剧透')])]);
    expect(blur.data?.hProperties?.className).toContain('sd-blur');

    const [span] = await run([inline('span', [text('红字')], { color: '#c0392b' })]);
    expect(span.data?.hProperties?.style).toBe('color:#c0392b');
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
    const callout = panel?.children?.[0];
    expect(callout?.data?.hProperties?.className).toContain('callout-note');
  });
});
