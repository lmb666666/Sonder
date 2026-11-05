/** 粗略判断正文是否包含公式；先去掉代码块/行内代码，避免把代码里的 $ 当公式。 */
export function containsMath(source: string): boolean {
  const withoutCode = source.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  return /\$\$?[^$]+\$\$?|\\\(|\\\[/.test(withoutCode);
}
