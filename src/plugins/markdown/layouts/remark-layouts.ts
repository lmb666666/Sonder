type AttributeValue = string | true;

type LayoutMarker = {
  type: 'columns' | 'column' | 'timeline' | 'event';
  attributes: Record<string, AttributeValue>;
};

type MdastNode = {
  type?: string;
  value?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

type ParsedBlock = {
  node: MdastNode;
  nextIndex: number;
};

const openingMarkerPattern = /^:::\s*(columns|column|timeline|event)(?:\s+(.+?))?\s*$/;
const closingMarkerPattern = /^:::\s*$/;
const attributeNamePattern = /[A-Za-z][\w-]*/y;

function parseAttributes(source = ''): Record<string, AttributeValue> | undefined {
  const attributes: Record<string, AttributeValue> = {};
  let index = 0;

  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (index >= source.length) break;

    attributeNamePattern.lastIndex = index;
    const nameMatch = attributeNamePattern.exec(source);
    if (!nameMatch) return undefined;

    const name = nameMatch[0];
    index = attributeNamePattern.lastIndex;
    while (/\s/.test(source[index] ?? '')) index += 1;

    if (source[index] !== '=') {
      attributes[name] = true;
      continue;
    }

    index += 1;
    while (/\s/.test(source[index] ?? '')) index += 1;
    const quote = source[index];
    let value = '';

    const closingQuote =
      quote === '“'
        ? '”'
        : quote === '‘'
          ? '’'
          : quote === '"' || quote === "'"
            ? quote
            : undefined;

    if (closingQuote) {
      index += 1;
      const valueStart = index;
      while (index < source.length && source[index] !== closingQuote) index += 1;
      if (source[index] !== closingQuote) return undefined;
      value = source.slice(valueStart, index);
      index += 1;
    } else {
      const valueStart = index;
      while (index < source.length && !/\s/.test(source[index] ?? '')) index += 1;
      value = source.slice(valueStart, index);
      if (!value) return undefined;
    }

    attributes[name] = value;
  }

  return attributes;
}

function paragraphText(node: MdastNode): string | undefined {
  if (node.type !== 'paragraph' || !node.children?.length) return undefined;
  if (!node.children.every((child) => child.type === 'text' && typeof child.value === 'string'))
    return undefined;

  return node.children.map((child) => child.value).join('');
}

export function parseLayoutMarker(value: string): LayoutMarker | undefined {
  const match = value.match(openingMarkerPattern);
  if (!match) return undefined;

  const type = match[1] as LayoutMarker['type'];
  const attributes = parseAttributes(match[2]);
  return attributes ? { type, attributes } : undefined;
}

function readLayoutMarker(node: MdastNode): LayoutMarker | undefined {
  const value = paragraphText(node);
  return value ? parseLayoutMarker(value) : undefined;
}

function isClosingMarker(node: MdastNode): boolean {
  const value = paragraphText(node);
  return Boolean(value && closingMarkerPattern.test(value));
}

function classNames(...values: Array<string | false | undefined>): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function makeContainer(
  tagName: string,
  className: string[],
  children: MdastNode[],
  properties: Record<string, unknown> = {},
): MdastNode {
  return {
    type: 'blockquote',
    children,
    data: {
      hName: tagName,
      hProperties: {
        className,
        ...properties,
      },
    },
  };
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

function processChildren(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = [];
  let index = 0;

  while (index < children.length) {
    const marker = readLayoutMarker(children[index] ?? {});
    const block =
      marker?.type === 'columns'
        ? parseColumns(children, index, marker)
        : marker?.type === 'timeline'
          ? parseTimeline(children, index, marker)
          : undefined;

    if (block) {
      result.push(block.node);
      index = block.nextIndex;
      continue;
    }

    const child = children[index];
    if (child?.children) child.children = processChildren(child.children);
    if (child) result.push(child);
    index += 1;
  }

  return result;
}

function parseColumns(
  children: MdastNode[],
  start: number,
  marker: LayoutMarker,
): ParsedBlock | undefined {
  const columns: MdastNode[] = [];
  let index = start + 1;

  while (index < children.length) {
    if (isClosingMarker(children[index] ?? {})) {
      if (!columns.length) return undefined;
      const count = columns.length;
      const declaredCols = marker.attributes.cols;
      const declaredCount = positiveInteger(declaredCols);
      if (declaredCols !== undefined && declaredCount === undefined) return undefined;
      if (declaredCount !== undefined && declaredCount !== count) return undefined;
      const resolvedCount = declaredCount ?? count;
      const template = columnTemplate(marker.attributes.ratio, resolvedCount);
      if (!template) return undefined;
      const mobile = marker.attributes.mobile === 'media-first' ? 'media-first' : 'source';
      const hasMediaColumn = columns.some((column) =>
        (column.data?.hProperties?.className as string[] | undefined)?.includes('is-media'),
      );

      return {
        node: makeContainer(
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
        nextIndex: index + 1,
      };
    }

    const columnMarker = readLayoutMarker(children[index] ?? {});
    if (columnMarker?.type !== 'column') return undefined;

    const contentStart = index + 1;
    index = contentStart;
    while (index < children.length && !isClosingMarker(children[index] ?? {})) index += 1;
    if (index >= children.length) return undefined;

    const isMedia =
      columnMarker.attributes.media === true || columnMarker.attributes.media === 'true';
    columns.push(
      makeContainer(
        'div',
        classNames('markdown-layout-column', isMedia && 'is-media'),
        processChildren(children.slice(contentStart, index)),
        { dataMarkdownLayoutColumn: isMedia ? 'media' : 'content' },
      ),
    );
    index += 1;
  }

  return undefined;
}

function parseTimeline(
  children: MdastNode[],
  start: number,
  marker: LayoutMarker,
): ParsedBlock | undefined {
  const events: MdastNode[] = [];
  let index = start + 1;

  while (index < children.length) {
    if (isClosingMarker(children[index] ?? {})) {
      if (!events.length) return undefined;
      const direction = marker.attributes.direction === 'horizontal' ? 'horizontal' : 'vertical';
      const list = makeContainer('ol', ['markdown-timeline-list'], events);

      return {
        node: makeContainer(
          'section',
          classNames('markdown-layout', 'markdown-timeline', `is-${direction}`),
          [list],
          {
            dataMarkdownLayout: 'timeline',
            dataTimelineDirection: direction,
          },
        ),
        nextIndex: index + 1,
      };
    }

    const eventMarker = readLayoutMarker(children[index] ?? {});
    if (eventMarker?.type !== 'event') return undefined;

    const contentStart = index + 1;
    index = contentStart;
    while (index < children.length && !isClosingMarker(children[index] ?? {})) index += 1;
    if (index >= children.length) return undefined;

    const date =
      typeof eventMarker.attributes.date === 'string' ? eventMarker.attributes.date : undefined;
    events.push(
      makeContainer(
        'li',
        ['markdown-timeline-event'],
        processChildren(children.slice(contentStart, index)),
        {
          ...(date ? { dataTimelineDate: date } : {}),
        },
      ),
    );
    index += 1;
  }

  return undefined;
}

function visit(node?: MdastNode) {
  if (!node?.children) return;
  node.children = processChildren(node.children);
}

export default function remarkLayouts() {
  return (tree: MdastNode) => {
    visit(tree);
  };
}
