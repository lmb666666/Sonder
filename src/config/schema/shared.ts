import { z } from 'astro/zod';

export const siteUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}, z.url());

export const commentProviderSchema = z.enum(['giscus', 'utterances', 'waline', 'twikoo', 'none']);
export const mathRendererSchema = z.enum(['katex', 'mathjax']);
export const youlinModeSchema = z.enum(['build', 'client']);
export const youlinLinkSourceSchema = z.enum(['youlin', 'local']);
export const youlinApplyProviderSchema = z.enum(['auto', 'youlin', 'github', 'none']);
export const youlinDirectiveSourceSchema = z.enum(['auto', 'youlin', 'demo']);

export const paletteSchema = z.enum([
  'green-soft',
  'green-vivid',
  'rose-soft',
  'pink-soft',
  'purple-soft',
  'blue-soft',
  'orange-soft',
  'brown-soft',
]);

export const collapseStyleSchema = z.enum([
  'github',
  'collapsible-start',
  'collapsible-end',
  'collapsible-auto',
]);
export const blogCoverImageStyleSchema = z.enum(['card', 'mask']);

export const nonEmptyStringSchema = (fallback: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional().default(fallback),
  );

export const topNavLinkSchema = z.strictObject({
  label: z.string(),
  href: z.string(),
  disabled: z.boolean().optional().default(false),
});

export const homeLinkSchema = z.strictObject({
  label: z.string(),
  icon: z.string(),
  tooltip: z.string().trim(),
  copy: z.boolean(),
});

export const defaultCodeConfig = {
  lineNumbers: true,
  wrap: false,
  preserveIndent: true,
  collapseStyle: 'github',
  languageBadge: true,
  collapseLines: 15,
  previewLines: 8,
} as const;

export const defaultMarkdownConfig = {
  math: true,
  mathRenderer: 'katex',
  mermaid: true,
} satisfies {
  math: boolean;
  mathRenderer: z.infer<typeof mathRendererSchema>;
  mermaid: boolean;
};

export const defaultFontConfig = {
  en: 'Maple Mono',
  code: 'Monaco',
  zh: 'ChillRoundF',
  file: 'assets/fonts/ChillRoundFRegular.woff2',
};
