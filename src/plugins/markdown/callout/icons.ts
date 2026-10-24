type HastElement = {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children?: Array<HastElement | { type: 'text'; value: string }>;
};

const iconPaths: Record<string, string[]> = {
  bug: [
    'M8 2l1.88 1.88',
    'M14.12 3.88L16 2',
    'M9 7.13v-1a3 3 0 0 1 6 0v1',
    'M4 13h3',
    'M17 13h3',
    'M6 20l1.5-1.5',
    'M16.5 18.5L18 20',
    'M12 20a5 5 0 0 0 5-5v-4a5 5 0 0 0-10 0v4a5 5 0 0 0 5 5Z',
  ],
  check: ['M20 6 9 17l-5-5'],
  'circle-check': ['M9 12l2 2 4-4', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  'circle-help': [
    'M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4',
    'M12 17h.01',
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  ],
  'clipboard-list': [
    'M9 5h6',
    'M9 12h6',
    'M9 16h6',
    'M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2Z',
    'M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2',
  ],
  flame: ['M8.5 14.5A4.5 4.5 0 0 0 13 19a4 4 0 0 0 4-4c0-4-4-6-4-12-5 3-7 7-4.5 11.5Z'],
  info: ['M12 16v-4', 'M12 8h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  pencil: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'M15 5l4 4'],
  quote: ['M3 21c3 0 7-1 7-8V5H3v8h4c0 4-2 6-4 8Z', 'M14 21c3 0 7-1 7-8V5h-7v8h4c0 4-2 6-4 8Z'],
  'triangle-alert': [
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8Z'],
};

export function createIcon(icon: string): HastElement {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: ['callout-icon'],
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      focusable: 'false',
    },
    children: (iconPaths[icon] ?? iconPaths.pencil).map((d) => ({
      type: 'element',
      tagName: 'path',
      properties: { d },
      children: [],
    })),
  };
}
