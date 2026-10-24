import type { MathRenderer } from './types.js';

export interface MarkdownPluginMathOptions {
  enabled?: boolean;
  renderer?: MathRenderer;
}

export interface MarkdownPluginOptions {
  enabled?: boolean;
  callouts?: boolean;
  expressiveCode?: boolean;
  math?: boolean | MarkdownPluginMathOptions;
  layouts?: boolean;
  mermaid?: boolean;
  responsiveTables?: boolean;
}

export interface ResolvedMarkdownPluginOptions {
  enabled: boolean;
  callouts: boolean;
  expressiveCode: boolean;
  math: {
    enabled: boolean;
    renderer: MathRenderer;
  };
  layouts: boolean;
  mermaid: boolean;
  responsiveTables: boolean;
}

export function resolveMarkdownOptions(
  options: MarkdownPluginOptions = {},
  defaults: { mathRenderer?: MathRenderer } = {},
): ResolvedMarkdownPluginOptions {
  const mathRenderer = defaults.mathRenderer ?? 'katex';
  const mathOptions = typeof options.math === 'object' ? options.math : {};

  return {
    enabled: options.enabled ?? true,
    callouts: options.callouts ?? true,
    expressiveCode: options.expressiveCode ?? true,
    math: {
      enabled: typeof options.math === 'boolean' ? options.math : (mathOptions.enabled ?? true),
      renderer: mathOptions.renderer ?? mathRenderer,
    },
    layouts: options.layouts ?? true,
    mermaid: options.mermaid ?? true,
    responsiveTables: options.responsiveTables ?? true,
  };
}
