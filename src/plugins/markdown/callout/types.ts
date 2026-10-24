export interface NavfolioPluginContext {
  [key: string]: unknown;
}

export interface NavfolioAstroPluginConfig {
  integrations?: any[];
  remarkPlugins?: any[];
  rehypePlugins?: any[];
}

export interface NavfolioPlugin {
  name: string;
  enabled?: boolean;
  astro?:
    NavfolioAstroPluginConfig | ((context: NavfolioPluginContext) => NavfolioAstroPluginConfig);
}

export interface CalloutPluginOptions {
  enabled?: boolean;
}
