import { describe, expect, test } from 'bun:test';

import type { MdastNode } from './handlers.js';
import remarkSonderDirectives from './index.js';

const transformer = remarkSonderDirectives();
const fakeFile = { message() {} } as unknown as Parameters<
  ReturnType<typeof remarkSonderDirectives>
>[1];

function run(children: MdastNode[]): MdastNode[] {
  const tree = { type: 'root', children } as MdastNode;
  transformer(tree, fakeFile);
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
  test(':::note 输出 aside.callout', () => {
    const [node] = run([container('note', {}, [labelled('自定义标题', []), paragraph('内容')])]);

    expect(node.data?.hName).toBe('aside');
    expect(node.data?.hProperties?.className).toContain('callout');
    expect(node.data?.hProperties?.className).toContain('callout-note');
  });

  test('别名与未知类型回退', () => {
    const [warn] = run([container('caution', {}, [paragraph('内容')])]);
    expect(warn.data?.hProperties?.className).toContain('callout-warning');

    // 未知容器名不属于提醒块家族：展开内容并警告（拼写错误要醒目）
    const children = [paragraph('内容')];
    expect(run([container('mystery', {}, children)])).toEqual(children);
  });

  test('{foldable} 折叠为 details', () => {
    const [node] = run([container('note', { foldable: true }, [paragraph('内容')])]);
    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.className).toContain('is-collapsible');
  });
});

describe('details / grid 容器', () => {
  test(':::details[标题]{open} 输出 details[open]', () => {
    const [node] = run([
      container('details', { open: true }, [labelled('点我展开'), paragraph('内容')]),
    ]);

    expect(node.data?.hName).toBe('details');
    expect(node.data?.hProperties?.open).toBe(true);
    const summary = node.children?.[0];
    expect(summary?.data?.hName).toBe('summary');
    expect(summary?.data?.hProperties?.className).toContain('sd-details-summary');
  });

  test(':::details 缺标题降级为普通内容', () => {
    const children = [paragraph('内容')];
    expect(run([container('details', {}, children)])).toEqual(children);
  });

  test(':::grid 输出网格容器', () => {
    const [node] = run([container('grid', {}, [paragraph('图一')])]);
    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-grid');
  });
});

describe('tabs 容器', () => {
  test('::::tabs 消费 :::tab 子指令', () => {
    const [node] = run([
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

  test('空 tabs 降级为普通内容', () => {
    const children = [paragraph('内容')];
    expect(run([container('tabs', {}, children)])).toEqual(children);
  });
});

describe('columns / timeline（layouts 迁移）', () => {
  test('花括号属性输出分栏样式', () => {
    const [node] = run([
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

  test('无效 cols 属性按实际分栏数渲染', () => {
    const [node] = run([
      container('columns', { cols: '3' }, [
        container('column', {}, [paragraph('左')]),
        container('column', {}, [paragraph('右')]),
      ]),
    ]);

    expect(node.data?.hProperties?.className).toContain('markdown-columns-2');
  });

  test(':::timeline 的 event 日期属性', () => {
    const [node] = run([
      container('timeline', {}, [container('event', { date: '2026-10-31' }, [paragraph('发布')])]),
    ]);

    expect(node.data?.hName).toBe('section');
    expect(node.data?.hProperties?.dataTimelineDirection).toBe('vertical');
    const list = node.children?.[0];
    const event = list?.children?.[0];
    expect(event?.data?.hProperties?.dataTimelineDate).toBe('2026-10-31');
  });
});

describe('叶子指令', () => {
  test('::github 渲染预取数据卡片', () => {
    const [node] = run([leaf('github', { repo: 'CuteLeaf/Firefly' })]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    expect(node.data?.hProperties?.href).toBe('https://github.com/CuteLeaf/Firefly');
    const desc = node.data?.hChildren?.[1]?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toContain(
      'Astro blog theme',
    );
  });

  test('::github 未知仓库降级', () => {
    const [node] = run([leaf('github', { repo: 'unknown/unknown' })]);
    expect(node.data?.hProperties?.className).toContain('sd-github-card');
    const desc = node.data?.hChildren?.[1]?.children?.[1];
    expect((desc as { children: Array<{ value: string }> }).children[0].value).toBe('GitHub 仓库');
  });

  test('::github 缺 repo 属性时跳过', () => {
    expect(run([leaf('github', {})])).toEqual([]);
  });

  test('::bilibili 渲染 iframe', () => {
    const [node] = run([leaf('bilibili', { bvid: 'BV1xx411c7mD' })]);

    expect(node.data?.hName).toBe('div');
    expect(node.data?.hProperties?.className).toContain('sd-embed');
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as { properties: { src: string } }).properties.src).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=0&danmaku=0',
    );
  });

  test('::bilibili 无效 bvid 时跳过', () => {
    expect(run([leaf('bilibili', { bvid: 'invalid' })])).toEqual([]);
  });

  test('::netease 歌单映射 outchain 参数', () => {
    const [node] = run([leaf('netease', { type: 'playlist', id: '123456' })]);
    const iframe = node.data?.hChildren?.[0];
    expect((iframe as { properties: { src: string } }).properties.src).toContain(
      'type=0&id=123456',
    );
  });

  test('::link 渲染链接卡', () => {
    const [node] = run([
      leaf('link', { href: 'https://example.com', title: '示例', description: '说明' }),
    ]);

    expect(node.data?.hName).toBe('a');
    expect(node.data?.hProperties?.className).toContain('sd-link-card');
    expect(node.data?.hProperties?.href).toBe('https://example.com');
  });

  test('::link 缺 href 时跳过', () => {
    expect(run([leaf('link', { title: '示例' })])).toEqual([]);
  });
});

describe('行内指令', () => {
  test(':badge 保留行内 Markdown', () => {
    const [node] = run([inline('badge', [{ type: 'strong', children: [text('新')] }])]);

    expect(node.data?.hName).toBe('span');
    expect(node.data?.hProperties?.className).toContain('sd-badge');
    expect(node.children?.[0]?.type).toBe('strong');
  });

  test(':badge{href} 渲染为链接', () => {
    const [node] = run([inline('badge', [text('Sonder')], { href: 'https://example.com' })]);
    expect(node.data?.hName).toBe('a');
  });

  test(':key / :blur / :span', () => {
    const [kbd] = run([inline('key', [text('Ctrl')])]);
    expect(kbd.data?.hName).toBe('kbd');

    const [blur] = run([inline('blur', [text('剧透')])]);
    expect(blur.data?.hProperties?.className).toContain('sd-blur');

    const [span] = run([inline('span', [text('红字')], { color: '#c0392b' })]);
    expect(span.data?.hProperties?.style).toBe('color:#c0392b');
  });
});

describe('未知指令与嵌套', () => {
  test('未知行内指令保留原文', () => {
    const [node] = run([inline('foo', [text('bar')])]);
    expect(node).toEqual(text(':foo[bar]'));
  });

  test('未知容器展开为普通内容', () => {
    const children = [paragraph('内容')];
    expect(run([container('foo', {}, children)])).toEqual(children);
  });

  test('嵌套：分栏内的提醒块正常渲染', () => {
    const [section] = run([
      container('columns', {}, [
        container('column', {}, [container('note', {}, [paragraph('栏内提醒')])]),
      ]),
    ]);

    const column = section.children?.[0];
    const callout = column?.children?.[0];
    expect(callout?.data?.hProperties?.className).toContain('callout-note');
  });

  test('嵌套：tabs 内的代码与提醒', () => {
    const [node] = run([
      container('tabs', {}, [
        container('tab', {}, [labelled('标签'), container('note', {}, [paragraph('标签页内容')])]),
      ]),
    ]);

    const panel = node.children?.[1];
    const callout = panel?.children?.[0];
    expect(callout?.data?.hProperties?.className).toContain('callout-note');
  });
});
