export const POST_ID_PATTERN = /^[\w-]+$/;

/** 这些值会被 /blog 下的静态路由占用，不能作为文章 ID。 */
export const RESERVED_POST_IDS = new Set(['archives', 'categories', 'page', 'tags']);

const CRC32_TABLE = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC32_TABLE[index] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;

  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

/** 统一 postid 的数字、空白与保留字规则；返回 undefined 表示不合规。 */
export function normalizePostId(value: unknown): string | undefined {
  const normalized =
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : '';

  if (!normalized || !POST_ID_PATTERN.test(normalized)) return undefined;
  if (RESERVED_POST_IDS.has(normalized.toLowerCase())) return undefined;

  return normalized;
}

/** abbrlink 风格的默认 ID：CRC32(title + date) 的 8 位小写十六进制。 */
export function createPostId(title: string, date: string): string {
  const value = crc32(new TextEncoder().encode(`${title}${date}`));
  return value.toString(16).padStart(8, '0');
}

/** 碰撞时按数值递增；used 必须是已小写化的 ID 集合。 */
export function allocatePostId(base: string, used: ReadonlySet<string>): string {
  const start = Number.parseInt(base, 16);

  if (!Number.isSafeInteger(start) || start < 0 || start > 0xffffffff) {
    throw new Error(`Invalid postid base: ${base}`);
  }

  for (let offset = 0; offset < 0x100000000; offset += 1) {
    const candidate = ((start + offset) >>> 0).toString(16).padStart(8, '0');
    if (!used.has(candidate.toLowerCase())) return candidate;
  }

  throw new Error('Unable to allocate a unique postid.');
}
