import { resolveCalloutType } from './callout-types.js';
import { createIcon } from './icons.js';

type MdastNode = {
  type?: string;
  value?: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    hChildren?: HastNode[];
  };
  children?: MdastNode[];
};

type HastNode =
  | {
      type: 'element';
      tagName: string;
      properties?: Record<string, unknown>;
      children?: HastNode[];
    }
  | {
      type: 'text';
      value: string;
    };

type CalloutMarker = {
  rawType: string;
  fold?: '+' | '-';
  title?: string;
  bodyChildren?: MdastNode[];
};

const calloutMarkerPattern = /^\[!([^\]\s]+)\]([+-])?(?:[ \t]*([^\r\n]*))?(?:\r?\n)?/;

function parseCalloutMarker(value: string): CalloutMarker | undefined {
  const match = value.match(calloutMarkerPattern);
  if (!match) return undefined;

  const [, rawType, fold, title] = match;
  if (!rawType) return undefined;

  return {
    rawType,
    fold: fold === '+' || fold === '-' ? fold : undefined,
    title: title?.trim() || undefined,
  };
}

function extractCalloutMarker(paragraph: MdastNode): CalloutMarker | undefined {
  const firstText = paragraph.children?.[0];
  if (firstText?.type !== 'text' || typeof firstText.value !== 'string') return undefined;

  const marker = parseCalloutMarker(firstText.value);
  if (!marker) return undefined;

  const matchedLength = firstText.value.match(calloutMarkerPattern)?.[0].length ?? 0;
  const remainingText = firstText.value.slice(matchedLength).replace(/^\r?\n/, '');
  const remainingChildren = [
    ...(remainingText ? [{ ...firstText, value: remainingText }] : []),
    ...(paragraph.children ?? []).slice(1),
  ];

  return {
    ...marker,
    bodyChildren: remainingChildren.length > 0 ? remainingChildren : undefined,
  };
}

function createTitleNode(marker: CalloutMarker): MdastNode {
  const definition = resolveCalloutType(marker.rawType);
  const title = marker.title ?? definition.label;
  const titleTag = marker.fold ? 'summary' : 'div';

  return {
    type: 'paragraph',
    data: {
      hName: titleTag,
      hProperties: {
        className: ['callout-title'],
      },
      hChildren: [
        createIcon(definition.icon) as HastNode,
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['callout-title-text'],
          },
          children: [{ type: 'text', value: title }],
        },
      ],
    },
    children: [],
  };
}

function transformBlockquote(node: MdastNode) {
  if (node.type !== 'blockquote' || !Array.isArray(node.children)) return;

  const firstChild = node.children[0];

  if (firstChild?.type !== 'paragraph') return;

  const marker = extractCalloutMarker(firstChild);
  if (!marker) return;

  const definition = resolveCalloutType(marker.rawType);
  const isFoldable = Boolean(marker.fold);
  const className = [
    'callout',
    `callout-${definition.type}`,
    marker.rawType.toLowerCase() !== definition.type
      ? `callout-${marker.rawType.toLowerCase()}`
      : undefined,
    isFoldable ? 'is-collapsible' : undefined,
  ].filter(Boolean);

  node.data = {
    hName: isFoldable ? 'details' : 'aside',
    hProperties: {
      className,
      dataCallout: definition.type,
      dataCalloutOriginalType: marker.rawType.toLowerCase(),
      style: `--callout-color: ${definition.color};`,
      ...(isFoldable && marker.fold === '+' ? { open: true } : {}),
    },
  };

  node.children = [
    createTitleNode(marker),
    ...(marker.bodyChildren
      ? [
          {
            ...firstChild,
            children: marker.bodyChildren,
          },
        ]
      : []),
    ...node.children.slice(1),
  ];
}

function visit(node?: MdastNode) {
  if (!node) return;

  transformBlockquote(node);
  node.children?.forEach(visit);
}

export default function remarkCallouts() {
  return (tree: MdastNode) => {
    visit(tree);
  };
}

export { parseCalloutMarker };
