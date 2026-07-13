export type PaginationItem = number | 'ellipsis';

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getPaginationItems(currentPage: number, lastPage: number): PaginationItem[] {
  if (lastPage <= 0) return [];
  if (lastPage <= 8) return range(1, lastPage);

  const current = Math.min(Math.max(currentPage, 1), lastPage);

  if (current <= 5) {
    return [...range(1, 6), 'ellipsis', lastPage];
  }

  if (current >= lastPage - 4) {
    return [1, 'ellipsis', ...range(lastPage - 5, lastPage)];
  }

  return [1, 'ellipsis', ...range(current, current + 3), 'ellipsis', lastPage];
}
