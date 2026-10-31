import { describe, expect, test } from 'bun:test';

import { resolveMarkdownOptions } from './markdown-options';

describe('resolveMarkdownOptions', () => {
  test('enables the existing markdown features by default', () => {
    expect(resolveMarkdownOptions()).toEqual({
      enabled: true,
      callouts: true,
      expressiveCode: true,
      math: {
        enabled: true,
        renderer: 'katex',
      },
      layouts: true,
      directives: true,
      mermaid: true,
      responsiveTables: true,
    });
  });

  test('allows disabling individual markdown features', () => {
    expect(
      resolveMarkdownOptions({
        expressiveCode: false,
        callouts: false,
        math: false,
        layouts: false,
        directives: false,
        mermaid: false,
        responsiveTables: false,
      }),
    ).toEqual({
      enabled: true,
      callouts: false,
      expressiveCode: false,
      math: {
        enabled: false,
        renderer: 'katex',
      },
      layouts: false,
      directives: false,
      mermaid: false,
      responsiveTables: false,
    });
  });

  test('accepts a math renderer option', () => {
    expect(
      resolveMarkdownOptions({
        math: {
          renderer: 'mathjax',
        },
      }),
    ).toEqual({
      enabled: true,
      callouts: true,
      expressiveCode: true,
      math: {
        enabled: true,
        renderer: 'mathjax',
      },
      layouts: true,
      directives: true,
      mermaid: true,
      responsiveTables: true,
    });
  });
});
