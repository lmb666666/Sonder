/** 粗略判断正文是否包含公式；先去掉代码块/行内代码，避免把代码里的 $ 当公式。 */
export function containsMath(source: string): boolean {
  const withoutCode = source.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

  if (/\$\$[\s\S]*?\$\$/.test(withoutCode)) return true;
  // 行内公式要求 $ 后、$ 前都不是空白，避免把 "$5 和 $10" 当公式。
  if (/\$(?!\$)[^\s$](?:[^$]*[^\s$])?\$/.test(withoutCode)) return true;
  return /\\\(|\\\[/.test(withoutCode);
}
