import type { defineConfig } from 'astro/config';

type AstroUserConfig = Parameters<typeof defineConfig>[0];
type AstroMarkdownConfig = NonNullable<AstroUserConfig['markdown']>;

export type MathRenderer = 'katex' | 'mathjax';

export interface SonderPluginContext {
  mathRenderer: MathRenderer;
}

export interface SonderAstroPluginConfig {
  integrations?: NonNullable<AstroUserConfig['integrations']>;
  remarkPlugins?: NonNullable<AstroMarkdownConfig['remarkPlugins']>;
  rehypePlugins?: NonNullable<AstroMarkdownConfig['rehypePlugins']>;
}

export interface SonderPlugin {
  name: string;
  enabled?: boolean;
  astro?: SonderAstroPluginConfig | ((context: SonderPluginContext) => SonderAstroPluginConfig);
}
