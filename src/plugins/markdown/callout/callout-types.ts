export interface CalloutTypeDefinition {
  type: string;
  label: string;
  color: string;
  icon: string;
  aliases?: string[];
}

export const calloutTypes: CalloutTypeDefinition[] = [
  {
    type: 'note',
    label: 'Note',
    color: '8, 109, 221',
    icon: 'pencil',
  },
  {
    type: 'abstract',
    label: 'Abstract',
    color: '0, 191, 188',
    icon: 'clipboard-list',
    aliases: ['summary', 'tldr'],
  },
  {
    type: 'info',
    label: 'Info',
    color: '8, 109, 221',
    icon: 'info',
  },
  {
    type: 'todo',
    label: 'Todo',
    color: '8, 109, 221',
    icon: 'circle-check',
  },
  {
    type: 'tip',
    label: 'Tip',
    color: '0, 191, 188',
    icon: 'flame',
    aliases: ['hint', 'important'],
  },
  {
    type: 'success',
    label: 'Success',
    color: '8, 185, 78',
    icon: 'check',
    aliases: ['check', 'done'],
  },
  {
    type: 'question',
    label: 'Question',
    color: '236, 117, 0',
    icon: 'circle-help',
    aliases: ['help', 'faq'],
  },
  {
    type: 'warning',
    label: 'Warning',
    color: '236, 117, 0',
    icon: 'triangle-alert',
    aliases: ['caution', 'attention'],
  },
  {
    type: 'failure',
    label: 'Failure',
    color: '233, 49, 71',
    icon: 'x',
    aliases: ['fail', 'missing'],
  },
  {
    type: 'danger',
    label: 'Danger',
    color: '233, 49, 71',
    icon: 'zap',
    aliases: ['error'],
  },
  {
    type: 'bug',
    label: 'Bug',
    color: '233, 49, 71',
    icon: 'bug',
  },
  {
    type: 'example',
    label: 'Example',
    color: '120, 82, 238',
    icon: 'list',
  },
  {
    type: 'quote',
    label: 'Quote',
    color: '158, 158, 158',
    icon: 'quote',
    aliases: ['cite'],
  },
];

export const calloutTypeByAlias = new Map<string, CalloutTypeDefinition>(
  calloutTypes.flatMap((definition) => [
    [definition.type, definition],
    ...(definition.aliases ?? []).map((alias) => [alias, definition] as const),
  ]),
);

export function resolveCalloutType(type: string): CalloutTypeDefinition {
  return (
    calloutTypeByAlias.get(type.toLowerCase()) ?? {
      type: type.toLowerCase(),
      label: titleCase(type),
      color: '8, 109, 221',
      icon: 'pencil',
    }
  );
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
