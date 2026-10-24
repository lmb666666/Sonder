import { describe, expect, test } from 'bun:test';
import { renderScaffoldTemplate } from './scaffold';

describe('renderScaffoldTemplate', () => {
  test('renders standard content variables', () => {
    const now = new Date('2026-07-25T12:34:56.000Z');
    const result = renderScaffoldTemplate(
      [
        '---',
        'title: <%= title | yaml %>',
        'date: <%=date%>',
        'updated: <%= isoDate %>',
        'slug: <%= slug %>',
        '---',
        '# <%= title %>',
      ].join('\n'),
      {
        title: 'A "quoted" title',
        slug: 'a-quoted-title',
        isoDate: now.toISOString(),
        date: now.toISOString().slice(0, 10),
      },
    );

    expect(result).toBe(
      [
        '---',
        'title: "A \\"quoted\\" title"',
        'date: 2026-07-25',
        'updated: 2026-07-25T12:34:56.000Z',
        'slug: a-quoted-title',
        '---',
        '# A "quoted" title',
      ].join('\n'),
    );
  });

  test('rejects unsupported placeholders instead of generating broken content', () => {
    const now = new Date('2026-07-25T12:34:56.000Z');

    expect(() =>
      renderScaffoldTemplate('<%= customValue %>', {
        title: 'title',
        slug: 'slug',
        isoDate: now.toISOString(),
        date: now.toISOString().slice(0, 10),
      }),
    ).toThrow('Unsupported Navfolio scaffold template expression');
  });
});
