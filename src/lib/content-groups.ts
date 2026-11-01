import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

export interface ContentGroup {
  name: string;
  slug: string;
  count: number;
}

export interface TagGroup extends ContentGroup {
  posts: BlogPost[];
}

export const uncategorizedCategory = {
  name: 'Uncategorized',
  slug: 'uncategorized',
} as const;

function isPublished(post: BlogPost) {
  return !post.data.draft;
}

function getComparableName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

type GroupField = 'categories' | 'tags';

function getGroupItems(post: BlogPost, field: GroupField) {
  const seen = new Set<string>();

  return (post.data[field] ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const slug = slugifyGroupName(item);

      if (seen.has(slug)) {
        return false;
      }

      seen.add(slug);
      return true;
    });
}

function sortByName(a: ContentGroup, b: ContentGroup) {
  return a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' });
}

export function slugifyGroupName(name: string) {
  const normalized = getComparableName(name)
    .normalize('NFKC')
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'untitled';
}

function createGroupMap(posts: BlogPost[], field: GroupField) {
  const groups = new Map<string, { name: string; slug: string; posts: BlogPost[] }>();

  posts.filter(isPublished).forEach((post) => {
    getGroupItems(post, field).forEach((name) => {
      const slug = slugifyGroupName(name);
      const group = groups.get(slug);

      if (group) {
        group.posts.push(post);
        return;
      }

      groups.set(slug, { name, slug, posts: [post] });
    });
  });

  return groups;
}

export function getAllCategories(posts: BlogPost[]): ContentGroup[] {
  const categories = [...createGroupMap(posts, 'categories').values()]
    .map(({ name, slug, posts: groupPosts }) => ({
      name,
      slug,
      count: groupPosts.length,
    }))
    .sort((a, b) => b.count - a.count || sortByName(a, b));
  const uncategorizedPosts = getUncategorizedPosts(posts);

  if (uncategorizedPosts.length === 0) {
    return categories;
  }

  return [
    ...categories,
    {
      ...uncategorizedCategory,
      count: uncategorizedPosts.length,
    },
  ];
}

export function getPostsByCategory(posts: BlogPost[], categorySlug: string) {
  if (categorySlug === uncategorizedCategory.slug) {
    return getUncategorizedPosts(posts);
  }

  return posts.filter(
    (post) =>
      isPublished(post) &&
      getGroupItems(post, 'categories').some((name) => slugifyGroupName(name) === categorySlug),
  );
}

export function getUncategorizedPosts(posts: BlogPost[]) {
  return posts.filter(
    (post) => isPublished(post) && getGroupItems(post, 'categories').length === 0,
  );
}

export function getAllTags(posts: BlogPost[]): TagGroup[] {
  return [...createGroupMap(posts, 'tags').values()]
    .map(({ name, slug, posts: groupPosts }) => ({
      name,
      slug,
      posts: groupPosts,
      count: groupPosts.length,
    }))
    .sort((a, b) => b.count - a.count || sortByName(a, b));
}

export function getPostsByTag(posts: BlogPost[], tagSlug: string) {
  return posts.filter(
    (post) =>
      isPublished(post) &&
      getGroupItems(post, 'tags').some((name) => slugifyGroupName(name) === tagSlug),
  );
}
