import { describe, expect, test } from 'bun:test';

import { getPaginationItems } from './pagination';

describe('getPaginationItems', () => {
  test('shows every page when the total does not exceed eight', () => {
    expect(getPaginationItems(4, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('shows the leading pages near the start', () => {
    expect(getPaginationItems(1, 15)).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 15]);
  });

  test('shows a four-page sliding window from page six', () => {
    expect(getPaginationItems(6, 15)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 'ellipsis', 15]);
  });

  test('moves the sliding window with the current page', () => {
    expect(getPaginationItems(9, 15)).toEqual([1, 'ellipsis', 9, 10, 11, 12, 'ellipsis', 15]);
  });

  test('shows the trailing six pages in the final five-page zone', () => {
    expect(getPaginationItems(12, 15)).toEqual([1, 'ellipsis', 10, 11, 12, 13, 14, 15]);
    expect(getPaginationItems(15, 15)).toEqual([1, 'ellipsis', 10, 11, 12, 13, 14, 15]);
  });
});
