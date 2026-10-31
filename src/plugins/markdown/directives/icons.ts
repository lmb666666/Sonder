import { h } from 'hastscript';
import type { HastChild } from './handlers.js';

/**
 * 指令层需要的 lucide 图标（与 lucide-astro 同源 path 数据，行内 SVG）。
 * 仅构建期使用，样式继承 currentColor。
 */

function svg(name: string, size: number, children: HastChild[], strokeWidth = 2): HastChild {
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': strokeWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      'data-icon': name,
    },
    children,
  );
}

function paths(...specs: Array<string | HastChild>): HastChild[] {
  return specs.map((spec) => (typeof spec === 'string' ? h('path', { d: spec }) : spec));
}

export function icon(name: string, size = 16, strokeWidth = 2): HastChild {
  switch (name) {
    case 'play':
      return svg(
        'play',
        size,
        paths('M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z'),
      );
    case 'pause':
      return svg('pause', size, [
        h('rect', { x: '14', y: '3', width: '5', height: '18', rx: '1' }),
        h('rect', { x: '5', y: '3', width: '5', height: '18', rx: '1' }),
      ]);
    case 'volume':
      return svg(
        'volume-2',
        size,
        paths(
          'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
          'M16 9a5 5 0 0 1 0 6',
          'M19.364 18.364a9 9 0 0 0 0-12.728',
        ),
      );
    case 'volume-x':
      return svg('volume-x', size, [
        h('path', {
          d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
        }),
        h('line', { x1: '22', x2: '16', y1: '9', y2: '15' }),
        h('line', { x1: '16', x2: '22', y1: '9', y2: '15' }),
      ]);
    case 'list-music':
      return svg('list-music', size, [
        h('path', { d: 'M16 5H3' }),
        h('path', { d: 'M11 12H3' }),
        h('path', { d: 'M11 19H3' }),
        h('path', { d: 'M21 16V5' }),
        h('circle', { cx: '18', cy: '16', r: '3' }),
      ]);
    case 'external-link':
      return svg(
        'external-link',
        size,
        paths(
          'M15 3h6v6',
          'M10 14 21 3',
          'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
        ),
      );
    case 'arrow-right':
      return svg('arrow-right', size, paths('M5 12h14', 'm12 5 7 7-7 7'));
    case 'arrow-left':
      return svg('arrow-left', size, paths('m12 19-7-7 7-7', 'M19 12H5'));
    case 'copy':
      return svg('copy', size, [
        h('rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }),
        h('path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }),
      ]);
    case 'check':
      return svg('check', size, paths('M20 6 9 17l-5-5'));
    case 'file-json-2':
      return svg(
        'file-json-2',
        size,
        paths(
          'M14 22h4a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v6',
          'M14 2v5a1 1 0 0 0 1 1h5',
          'M5 14a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1 1 1 0 0 1 1 1v2a1 1 0 0 0 1 1',
          'M9 22a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-2a1 1 0 0 0-1-1',
        ),
        1.6,
      );
    case 'rss':
      return svg(
        'rss',
        size,
        [
          h('path', { d: 'M4 11a9 9 0 0 1 9 9' }),
          h('path', { d: 'M4 4a16 16 0 0 1 16 16' }),
          h('circle', { cx: '5', cy: '19', r: '1' }),
        ],
        1.8,
      );
    case 'refresh-cw':
      return svg(
        'refresh-cw',
        size,
        paths(
          'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
          'M21 3v5h-5',
          'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
          'M8 16H3v5',
        ),
        1.8,
      );
    case 'link':
      return svg(
        'link',
        size,
        paths(
          'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
          'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
        ),
        1.8,
      );
    case 'chevron-left':
      return svg('chevron-left', size, paths('m15 18-6-6 6-6'));
    case 'chevron-right':
      return svg('chevron-right', size, paths('m9 18 6-6-6-6'));
    default:
      return svg('circle', size, [h('circle', { cx: '12', cy: '12', r: '10' })]);
  }
}
