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
