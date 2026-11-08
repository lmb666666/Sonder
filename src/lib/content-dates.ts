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

/** 只有修改时间比发布时间晚至少 1 天，才值得在文章页单独显示。 */
export function isMeaningfulUpdate(date: Date, updated?: Date) {
  return Boolean(updated && updated.getTime() - date.getTime() >= 24 * 60 * 60 * 1000);
}

export function sortByDateDesc<T extends DatedContentEntry>(entries: T[]) {
  return [...entries].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function getStickyPriority(entry: StickyContentEntry) {
  const sticky = entry?.data?.sticky;
  if (sticky === true) {
    return 1;
  }

  if (typeof sticky === 'number' && sticky > 0) {
    return sticky;
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
