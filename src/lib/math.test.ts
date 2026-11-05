import { describe, expect, test } from 'bun:test';

import { containsMath } from './math';

describe('containsMath', () => {
  test('识别行内公式与块级公式', () => {
    expect(containsMath('前文 $x^2$ 后文')).toBe(true);
    expect(containsMath('$$\nx^2\n$$')).toBe(true);
    expect(containsMath('行内 \\(x\\) 公式')).toBe(true);
  });

  test('忽略代码块、行内代码与货币金额', () => {
    expect(containsMath('```\n$x$\n```')).toBe(false);
    expect(containsMath('`$x$`')).toBe(false);
    expect(containsMath('普通文本 $5 和 $10')).toBe(false);
  });
});
