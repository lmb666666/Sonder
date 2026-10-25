export interface SonderPluginContext {
  [key: string]: unknown;
}

export interface SonderAstroPluginConfig {
  integrations?: any[];
  remarkPlugins?: any[];
  rehypePlugins?: any[];
}

export interface SonderPlugin {
  name: string;
  enabled?: boolean;
  astro?: SonderAstroPluginConfig | ((context: SonderPluginContext) => SonderAstroPluginConfig);
}

export interface CalloutPluginOptions {
  enabled?: boolean;
}
