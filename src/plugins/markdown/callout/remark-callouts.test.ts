import { describe, expect, test } from 'bun:test';

import remarkCallouts, { parseCalloutMarker } from './remark-callouts';

describe('parseCalloutMarker', () => {
  test('parses Obsidian callout markers', () => {
    expect(parseCalloutMarker('[!tip]')).toEqual({ rawType: 'tip' });
    expect(parseCalloutMarker('[!tip] Title\nBody')).toEqual({
      rawType: 'tip',
      title: 'Title',
    });
    expect(parseCalloutMarker('[!faq]- Collapsed FAQ')).toEqual({
      rawType: 'faq',
      fold: '-',
      title: 'Collapsed FAQ',
    });
    expect(parseCalloutMarker('[!warning]+ Expanded warning')).toEqual({
      rawType: 'warning',
      fold: '+',
      title: 'Expanded warning',
    });
  });
});

describe('remarkCallouts', () => {
  test('turns a callout blockquote into an aside', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '[!tip] Remember this' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Callout body.' }],
            },
          ],
        },
      ],
    };

    remarkCallouts()(tree);

    const callout = tree.children[0];
    expect(callout.data?.hName).toBe('aside');
    expect(callout.data?.hProperties?.className).toContain('callout-tip');
    expect(callout.children[0].data?.hName).toBe('div');
    expect(callout.children[0].data?.hChildren?.[1].children?.[0].value).toBe('Remember this');
  });

  test('keeps body text when the marker and body share a paragraph', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '[!tip] Remember this\nCallout body.' }],
            },
          ],
        },
      ],
    };

    remarkCallouts()(tree);

    const callout = tree.children[0];
    expect(callout.data?.hName).toBe('aside');
    expect(callout.data?.hProperties?.className).toContain('callout-tip');
    expect(callout.children[1].children?.[0].value).toBe('Callout body.');
  });

  test('turns a foldable callout blockquote into details', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '[!faq]- Details' }],
            },
          ],
        },
      ],
    };

    remarkCallouts()(tree);

    const callout = tree.children[0];
    expect(callout.data?.hName).toBe('details');
    expect(callout.data?.hProperties?.open).toBeUndefined();
    expect(callout.data?.hProperties?.dataCallout).toBe('question');
    expect(callout.children[0].data?.hName).toBe('summary');
  });
});
