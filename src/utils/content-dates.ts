export interface DatedContentEntry {
  id: string;
  data: {
    date: Date;
  };
}

export interface StickyContentEntry {
  data: {
    sticky?: boolean | number;
  };
}

export function sortByDateDesc<T extends DatedContentEntry>(entries: T[]) {
  return [...entries].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function getStickyPriority(entry: StickyContentEntry) {
  if (entry.data.sticky === true) {
    return 1;
  }

  if (typeof entry.data.sticky === 'number' && entry.data.sticky > 0) {
    return entry.data.sticky;
  }

  return 0;
}

export function isStickyEntry(entry: StickyContentEntry) {
  return getStickyPriority(entry) > 0;
}

export function sortBlogPostsForArchive<T extends DatedContentEntry & StickyContentEntry>(
  entries: T[],
) {
  return [...entries].sort((a, b) => {
    const priorityDelta = getStickyPriority(b) - getStickyPriority(a);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const dateDelta = b.data.date.valueOf() - a.data.date.valueOf();

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return a.id.localeCompare(b.id);
  });
}
