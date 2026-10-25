import type { SonderScaffoldTemplateContext, SonderScaffoldTemplateVariable } from './types';

const templateVariablePattern = /<%=\s*(title|slug|isoDate|date)(?:\s*\|\s*(yaml))?\s*%>/g;
const unresolvedTemplateExpressionPattern = /<%=[\s\S]*?%>/;

export function renderScaffoldTemplate(
  template: string,
  context: SonderScaffoldTemplateContext,
): string {
  const rendered = template.replace(
    templateVariablePattern,
    (_placeholder, variable: SonderScaffoldTemplateVariable, filter: 'yaml' | undefined) => {
      const value = context[variable];

      return filter === 'yaml' ? JSON.stringify(value) : value;
    },
  );

  const unresolvedExpression = rendered.match(unresolvedTemplateExpressionPattern)?.[0];

  if (unresolvedExpression) {
    throw new Error(
      `Unsupported Sonder scaffold template expression ${JSON.stringify(unresolvedExpression)}. ` +
        'Supported variables are title, slug, isoDate, and date; the only supported filter is yaml.',
    );
  }

  return rendered;
}
