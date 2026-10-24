import { XMLParser } from 'fast-xml-parser';

export type FriendLinkItem = {
  name?: string;
  url?: string;
  bio?: string;
  avatar?: string | null;
  backgroundImage?: string | null;
  rss?: string | null;
  sticky?: number | boolean | null;
};

export type FriendPost = {
  title: string;
  url: string;
  date?: string;
  tags?: string[];
  author: string;
  authorUrl?: string;
  avatar?: string | null;
};

export type FriendDataSource = 'auto' | 'src' | 'items';

export type FriendLinkFieldMap = Partial<{
  name: string;
  url: string;
  bio: string;
  avatar: string;
  backgroundImage: string;
  rss: string;
  sticky: string;
}>;

export type FriendCircleFeed = {
  friends: FriendLinkItem[];
  posts: FriendPost[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string';

export const isFriendLinkItem = (value: unknown): value is FriendLinkItem =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.url === 'string' &&
  optionalString(value.bio) &&
  optionalString(value.avatar) &&
  optionalString(value.backgroundImage) &&
  optionalString(value.rss) &&
  (value.sticky === undefined ||
    value.sticky === null ||
    typeof value.sticky === 'boolean' ||
    typeof value.sticky === 'number');

const defaultFields = {
  name: 'name',
  url: 'url',
  bio: 'bio',
  avatar: 'avatar',
  backgroundImage: 'backgroundImage',
  rss: 'rss',
  sticky: 'sticky',
} satisfies Required<FriendLinkFieldMap>;

const normalizeFriendLinkItem = (
  value: unknown,
  fieldMap: FriendLinkFieldMap = {},
): FriendLinkItem | undefined => {
  if (!isRecord(value)) return undefined;
  const fields = { ...defaultFields, ...fieldMap };
  const rawName = value[fields.name];
  const rawUrl = value[fields.url];
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!name || !url) return undefined;
  const optional = (field: string) =>
    typeof value[field] === 'string' ? value[field].trim() || null : null;
  const sticky = value[fields.sticky];
  return {
    name,
    url,
    bio: optional(fields.bio) ?? undefined,
    avatar: optional(fields.avatar),
    backgroundImage: optional(fields.backgroundImage),
    rss: optional(fields.rss),
    sticky: typeof sticky === 'boolean' || typeof sticky === 'number' ? sticky : undefined,
  };
};

const normalizeFriendLinks = (
  value: unknown,
  fieldMap: FriendLinkFieldMap = {},
): FriendLinkItem[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const normalized = normalizeFriendLinkItem(item, fieldMap);
        return normalized ? [normalized] : [];
      })
    : [];

const parseFriendLinkJson = (
  text: string,
  label: string,
  fieldMap: FriendLinkFieldMap,
): FriendLinkItem[] => {
  const data: unknown = JSON.parse(text);
  const items = normalizeFriendLinks(data, fieldMap);
  if (!Array.isArray(data) || items.length !== data.length) {
    throw new Error(`Friend link JSON from ${label} must be an array of valid friend links.`);
  }
  return items;
};

export const resolveFriendLinkItems = async ({
  items,
  src,
  source = 'auto',
  fieldMap,
}: {
  items?: FriendLinkItem[];
  src?: string;
  source?: FriendDataSource;
  fieldMap?: FriendLinkFieldMap;
}): Promise<FriendLinkItem[]> => {
  if (source === 'items') return items ?? [];
  const sourceUrl = src?.trim();
  if (!sourceUrl) return items ?? [];

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return parseFriendLinkJson(await response.text(), sourceUrl, fieldMap ?? {});
  } catch (error) {
    console.error(`Unable to load friend links from ${sourceUrl}:`, error);
    return source === 'src' ? [] : (items ?? []);
  }
};

export const orderFriendLinks = (items: FriendLinkItem[], shuffle = false) => {
  const weighted = items.map((item, index) => ({
    item,
    index,
    sticky: item.sticky === true ? 1 : typeof item.sticky === 'number' ? item.sticky : 0,
  }));
  const sticky = weighted
    .filter((entry) => entry.sticky > 0)
    .sort((a, b) => b.sticky - a.sticky || a.index - b.index);
  const ordinary = weighted.filter((entry) => entry.sticky <= 0);
  if (shuffle) {
    for (let index = ordinary.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [ordinary[index], ordinary[target]] = [ordinary[target], ordinary[index]];
    }
  }
  return [...sticky, ...ordinary].map(({ item }) => item);
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : value ? [value] : []);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? '';
const toTags = (value: unknown) =>
  asArray(value)
    .map((tag) => (isRecord(tag) ? firstText(tag['#text'], tag.term, tag.label) : text(tag)))
    .filter(Boolean);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export const parseFeed = (xml: string, friend: FriendLinkItem): FriendPost[] => {
  const feed = parser.parse(xml) as Record<string, unknown>;
  const rss = isRecord(feed.rss) && isRecord(feed.rss.channel) ? feed.rss.channel : undefined;
  const atom = isRecord(feed.feed) ? feed.feed : undefined;
  const entries = rss ? asArray(rss.item) : atom ? asArray(atom.entry) : [];

  return entries.flatMap((entry): FriendPost[] => {
    if (!isRecord(entry)) return [];
    const title = firstText(entry.title);
    const atomLink = asArray(entry.link).find((link) => isRecord(link) && text(link['@_href']));
    const url = firstText(entry.link, isRecord(atomLink) ? atomLink['@_href'] : '');
    if (!title || !url) return [];
    const authorRecord = isRecord(entry.author) ? entry.author : undefined;
    return [
      {
        title,
        url,
        date: firstText(entry.pubDate, entry.published, entry.updated, entry.date),
        tags: toTags(entry.category),
        author: firstText(authorRecord?.name, rss?.title, atom?.title, friend.name),
        authorUrl: friend.url,
        avatar: friend.avatar,
      },
    ];
  });
};

export const crawlFriendPosts = async (
  items: FriendLinkItem[],
  perFeed = 12,
): Promise<FriendPost[]> => {
  const results = await Promise.all(
    items
      .filter((item) => item.rss?.trim())
      .map(async (friend) => {
        try {
          const response = await fetch(friend.rss!.trim(), {
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) return [];
          return parseFeed(await response.text(), friend).slice(0, perFeed);
        } catch (error) {
          console.warn(`Unable to read friend RSS for ${friend.name ?? friend.url}:`, error);
          return [];
        }
      }),
  );
  return results.flat().sort((a, b) => Date.parse(b.date ?? '') - Date.parse(a.date ?? ''));
};

export const parseFriendPosts = (value: unknown): FriendPost[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): FriendPost[] => {
    if (!isRecord(item)) return [];
    const title = text(item.title);
    const url = text(item.url);
    const author = text(item.author);
    if (!title || !url || !author) return [];
    return [
      {
        title,
        url,
        author,
        date: text(item.date),
        authorUrl: text(item.authorUrl),
        avatar: text(item.avatar) || null,
        tags: toTags(item.tags),
      },
    ];
  });
};

export const parseFriendCircleFeed = (value: unknown): FriendCircleFeed => {
  if (Array.isArray(value)) return { friends: [], posts: parseFriendPosts(value) };
  if (!isRecord(value)) return { friends: [], posts: [] };
  return {
    friends: normalizeFriendLinks(value.friends),
    posts: parseFriendPosts(value.posts),
  };
};
