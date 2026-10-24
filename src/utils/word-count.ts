/** 字数统计（与文章页同口径：英文单词 + CJK 字符）。 */
const ENGLISH_WORD = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function countWords(text: string): number {
  return (text.match(ENGLISH_WORD)?.length ?? 0) + (text.match(CJK_CHAR)?.length ?? 0);
}

/** 万级缩写：12345 -> 1.2 万。 */
export function formatCount(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')} 万` : String(n);
}
