import { describe, expect, test } from 'bun:test';

import { getAllCategories, getAllTags, getUncategorizedPosts } from './content-groups';

type Post = {
  id: string;
  data: { draft?: boolean; categories?: string[]; tags?: string[] };
};

const post = (id: string, categories: string[], tags: string[] = []): Post => ({
  id,
  data: { draft: false, categories, tags },
});

describe('content groups', () => {
  test('分类按 slug 合并，首页计数与分类页一致', () => {
    const posts = [
      post('a', ['Tech', '生活'], ['Astro']),
      post('b', ['tech'], ['astro', '部署']),
      post('c', [], ['部署']),
    ] as never;

    const categories = getAllCategories(posts);
    expect(categories.find((item) => item.slug === 'tech')?.count).toBe(2);
    expect(categories.find((item) => item.slug === '生活')?.count).toBe(1);
    expect(categories.find((item) => item.slug === 'uncategorized')?.count).toBe(1);
    expect(categories).toHaveLength(3);
  });

  test('标签按 slug 合并并忽略重复标签', () => {
    const posts = [post('a', [], ['Astro', 'astro']), post('b', [], ['Astro', '部署'])] as never;

    const tags = getAllTags(posts);
    expect(tags.find((item) => item.slug === 'astro')?.count).toBe(2);
    expect(tags.find((item) => item.slug === 'astro')?.posts).toHaveLength(2);
    expect(tags).toHaveLength(2);
  });

  test('草稿不计入分组', () => {
    const posts = [
      post('a', ['Tech'], ['Tech']),
      { id: 'draft', data: { draft: true, categories: ['Hidden'], tags: ['Hidden'] } },
    ] as never;

    expect(getAllCategories(posts).map((item) => item.slug)).toEqual(['tech']);
    expect(getAllTags(posts).map((item) => item.slug)).toEqual(['tech']);
  });

  test('未分类文章单独成组', () => {
    const posts = [post('a', []), post('b', ['Tech'])] as never;
    expect(getUncategorizedPosts(posts).map((item) => item.id)).toEqual(['a']);
  });
});
