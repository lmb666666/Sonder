import type { AttributeValue, ContainerContext, MdastNode } from './handlers.js';
import { asString, classNames, positionOf, textOf, unwrapLabel, wrap } from './handlers.js';

/**
 * columns / timeline 的指令渲染。
 * 输出类名与结构 layouts 插件逐字节一致，样式无缝迁移。
 */

function isDirective(node: MdastNode, name: string): boolean {
  return node.type === 'containerDirective' && node.name === name;
}

function inlineTextOf(node: MdastNode): string {
  const first = node.children?.[0];
  return first?.data?.directiveLabel ? textOf(first.children).trim() : '';
}

function positiveInteger(value: AttributeValue | undefined): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function columnTemplate(ratio: AttributeValue | undefined, count: number): string | undefined {
  if (ratio === undefined) {
    return Array.from({ length: count }, () => 'minmax(0, 1fr)').join(' ');
  }

  if (typeof ratio !== 'string') return undefined;
  const fractions = ratio.split(':').map((value) => Number(value.trim()));
  if (
    fractions.length !== count ||
    fractions.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    return undefined;
  }

  return fractions.map((fraction) => `minmax(0, ${fraction}fr)`).join(' ');
}

export function columnsHandler({ node, children, transform, file }: ContainerContext): MdastNode[] {
  if (!children.some((child) => isDirective(child, 'column'))) {
    file.message(
      ':::columns 内没有 :::column，已按普通内容渲染。',
      positionOf(node),
      'sonder-directives',
    );
    return children;
  }

  const declaredCount = positiveInteger(node.attributes?.cols);
  if (node.attributes?.cols !== undefined && declaredCount === undefined) {
    file.message(
      `:::columns 的 cols 属性无效：${String(node.attributes?.cols)}，已按实际分栏数渲染。`,
      positionOf(node),
      'sonder-directives',
    );
  }

  const columns: MdastNode[] = [];
  let current: MdastNode | undefined;

  for (const child of children) {
    if (isDirective(child, 'column')) {
      // :::column[标题] 的标签不进入正文；column 没有独立标题位。
      unwrapLabel(child);
      const isMedia = child.attributes?.media === true || child.attributes?.media === 'true';
      current = wrap(
        'div',
        classNames('markdown-layout-column', isMedia && 'is-media'),
        transform(child.children ?? [], 'column', file),
        { dataMarkdownLayoutColumn: isMedia ? 'media' : 'content' },
      );
      columns.push(current);
      continue;
    }

    // 未包进 :::column 的内容并入当前栏（第一栏之前出现则开新栏）
    if (!current) {
      current = wrap('div', ['markdown-layout-column'], [child], {
        dataMarkdownLayoutColumn: 'content',
      });
      columns.push(current);
      continue;
    }
    current.children = [...(current.children ?? []), child];
  }

  const resolvedCount = columns.length;
  const declaredRatio = asString(node.attributes?.ratio);
  let template = columnTemplate(declaredRatio, resolvedCount);
  if (declaredRatio !== undefined && !template) {
    file.message(
      `:::columns 的 ratio 属性无效：${declaredRatio}，已按实际分栏数均分。`,
      positionOf(node),
      'sonder-directives',
    );
  }
  template = template ?? columnTemplate(undefined, resolvedCount);

  const mobile = node.attributes?.mobile === 'media-first' ? 'media-first' : 'source';
  const hasMediaColumn = columns.some((column) =>
    (column.data?.hProperties?.className as string[] | undefined)?.includes('is-media'),
  );

  return [
    wrap(
      'section',
      classNames(
        'markdown-layout',
        'markdown-columns',
        `markdown-columns-${resolvedCount}`,
        mobile === 'media-first' && hasMediaColumn && 'is-media-first',
      ),
      columns,
      {
        dataMarkdownLayout: 'columns',
        style: `--markdown-layout-column-template: ${template};`,
      },
    ),
  ];
}

export function timelineHandler({
  node,
  children,
  transform,
  file,
}: ContainerContext): MdastNode[] {
  if (!children.some((child) => isDirective(child, 'event'))) {
    file.message(
      ':::timeline 内没有 :::event，已按普通内容渲染。',
      positionOf(node),
      'sonder-directives',
    );
    return children;
  }

  const events: MdastNode[] = [];
  let current: MdastNode | undefined;

  for (const child of children) {
    if (isDirective(child, 'event')) {
      // 日期：优先 {date} 属性，回退到 [日期] 标签（标签不进正文）
      const labelText = inlineTextOf(child);
      const date = asString(child.attributes?.date) ?? (labelText || undefined);
      const body = child.children?.[0]?.data?.directiveLabel
        ? (child.children ?? []).slice(1)
        : (child.children ?? []);
      current = wrap('li', ['markdown-timeline-event'], transform(body, 'event', file), {
        ...(date ? { dataTimelineDate: date } : {}),
      });
      events.push(current);
      continue;
    }

    // 未包进 :::event 的内容并入当前事件
    if (current) {
      current.children = [...(current.children ?? []), child];
    }
  }

  const direction = node.attributes?.direction === 'horizontal' ? 'horizontal' : 'vertical';
  const list = wrap('ol', ['markdown-timeline-list'], events);

  return [
    wrap('section', classNames('markdown-layout', 'markdown-timeline', `is-${direction}`), [list], {
      dataMarkdownLayout: 'timeline',
      dataTimelineDirection: direction,
    }),
  ];
}
