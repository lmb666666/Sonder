export type ApplicationUrlValidation = 'empty' | 'ok' | 'invalid' | 'protocol';

/** 友链申请 URL 校验：空值不报错，只接受 http(s)。 */
export function validateApplicationUrlValue(value: string): ApplicationUrlValidation {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';

  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) ? 'ok' : 'protocol';
  } catch {
    return 'invalid';
  }
}

export type YoulinApplicationFields = {
  name: string;
  url: string;
  bio: string;
  avatar: string;
  rss: string;
};

export type YoulinApplicationPayload = {
  siteName: string;
  link: string;
  desc?: string;
  avatar?: string;
  feed?: string;
  turnstileToken?: string;
};

/** Sonder 表单字段 → Youlin POST /apply 字段；空值不发送。 */
export function buildYoulinApplicationPayload(
  data: YoulinApplicationFields,
  turnstileToken = '',
): YoulinApplicationPayload {
  const payload: YoulinApplicationPayload = {
    siteName: data.name.trim(),
    link: data.url.trim(),
  };
  const desc = data.bio.trim();
  const avatar = data.avatar.trim();
  const feed = data.rss.trim();
  const token = turnstileToken.trim();
  if (desc) payload.desc = desc;
  if (avatar) payload.avatar = avatar;
  if (feed) payload.feed = feed;
  if (token) payload.turnstileToken = token;
  return payload;
}
