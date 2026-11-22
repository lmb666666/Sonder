export type FriendLinkItem = {
  name?: string;
  url?: string;
  bio?: string;
  avatar?: string | null;
  backgroundImage?: string | null;
  rss?: string | null;
  sticky?: number | boolean | null;
};

export type FriendLinkGroup = {
  title: string;
  description?: string;
  items: FriendLinkItem[];
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 模板内置的示例友链不应进入 OPML 导出或 FCL friend.json。 */
export const isPlaceholderFeed = (value: string | null | undefined) =>
  /^https?:\/\/(?:www\.)?example\.(?:com|org|net|dev)(?:\/|$)/i.test(value ?? '');

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
