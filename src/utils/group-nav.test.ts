import { describe, expect, test } from 'bun:test';

import { hasTopicOverflow } from './topic-overflow';

describe('hasTopicOverflow', () => {
  test('returns false when the content fits the collapsed height', () => {
    expect(hasTopicOverflow(42, 42)).toBe(false);
  });

  test('returns true when content exceeds the collapsed height', () => {
    expect(hasTopicOverflow(43, 42)).toBe(true);
  });
});
