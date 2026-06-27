export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocItem {
  href: string;
  label: string;
  depth: number;
  children: TocItem[];
}

export const buildTocTree = (headings: TocHeading[], minDepth = 2, maxDepth = 6): TocItem[] => {
  const roots: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    if (heading.depth < minDepth || heading.depth > maxDepth) {
      continue;
    }

    const item: TocItem = {
      href: `#${heading.slug}`,
      label: heading.text,
      depth: heading.depth,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }

    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }

    stack.push(item);
  }

  return roots;
};

export const countTocItems = (items: TocItem[]): number =>
  items.reduce((count, item) => count + 1 + countTocItems(item.children), 0);
