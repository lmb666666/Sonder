/** 相对时长的结构化拆分：取前 N 层非零单位，由界面层负责本地化。 */
export type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

export interface ElapsedPart {
  unit: TimeUnit;
  value: number;
}

const INTERVALS: { unit: TimeUnit; ms: number }[] = [
  { unit: 'year', ms: 365.2422 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

export function elapsedParts(
  from: string | Date,
  now: Date = new Date(),
  maxDepth = 2,
): ElapsedPart[] {
  const start = typeof from === 'string' ? new Date(from) : from;
  if (Number.isNaN(start.valueOf())) return [];

  let remained = Math.max(0, now.valueOf() - start.valueOf());
  const parts: ElapsedPart[] = [];

  for (const interval of INTERVALS) {
    const value = Math.floor(remained / interval.ms);
    if (value <= 0) continue;
    parts.push({ unit: interval.unit, value });
    remained -= value * interval.ms;
    if (parts.length >= maxDepth) break;
  }

  return parts;
}
