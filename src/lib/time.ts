/** 相对时长（Sonder v1 timeElapse 同款语义：取前 N 层非零单位拼接）。 */
const INTERVALS = [
  { label: '年', ms: 365.2422 * 24 * 60 * 60 * 1000 },
  { label: '个月', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { label: '天', ms: 24 * 60 * 60 * 1000 },
  { label: '小时', ms: 60 * 60 * 1000 },
  { label: '分', ms: 60 * 1000 },
  { label: '秒', ms: 1000 },
];

export function timeElapse(from: string | Date, now: Date = new Date(), maxDepth = 2): string {
  const start = typeof from === 'string' ? new Date(from) : from;
  let remained = Math.max(0, now.valueOf() - start.valueOf());
  let text = '';

  for (const interval of INTERVALS) {
    const count = Math.floor(remained / interval.ms);
    if (count <= 0) continue;
    text += `${count}${interval.label}`;
    remained -= count * interval.ms;
    if ((maxDepth -= 1) <= 0) break;
  }

  return text || '刚刚';
}
