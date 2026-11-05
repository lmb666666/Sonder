/** 字数统计（与文章页同口径：英文单词 + CJK 字符）。 */
const ENGLISH_WORD = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function countWords(text: string): number {
  return (text.match(ENGLISH_WORD)?.length ?? 0) + (text.match(CJK_CHAR)?.length ?? 0);
}

/** 万级缩写：按界面语言输出 1.2万 / 1.2萬 / 12K。 */
export function formatCount(n: number, locale = 'en'): string {
  if (n < 10000) return String(n);

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/** 阅读时长估算（与文章页同口径：英文 220 词/分钟，CJK 500 字/分钟）。 */
export function readingMinutes(text: string): number {
  const englishWords = text.match(ENGLISH_WORD)?.length ?? 0;
  const cjkChars = text.match(CJK_CHAR)?.length ?? 0;
  return Math.max(1, Math.ceil(englishWords / 220 + cjkChars / 500));
}
