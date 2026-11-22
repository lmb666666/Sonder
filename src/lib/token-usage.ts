import { addDays, format, parseISO, startOfDay, startOfWeek } from 'date-fns';

export interface TokenUsageSource {
  start: string;
  values: readonly number[];
}

export interface TokenDay {
  date: Date;
  dateKey: string;
  tokens: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface TokenWeek {
  days: TokenDay[];
  month: number;
}

export interface TokenMonth {
  label: string;
  span: number;
}

export interface TokenSummary {
  total: number;
  today: number;
  peak: { tokens: number; date: Date } | null;
  currentStreak: number;
  longestStreak: number;
}

export interface TokenCalendar {
  weeks: TokenWeek[];
  months: TokenMonth[];
  days: TokenDay[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function quantile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor((sorted.length - 1) * ratio)] ?? sorted[0] ?? 0;
}

function levelFor(tokens: number, thresholds: [number, number, number]): TokenDay['level'] {
  if (tokens <= 0) return 0;
  if (tokens <= thresholds[0]) return 1;
  if (tokens <= thresholds[1]) return 2;
  if (tokens <= thresholds[2]) return 3;
  return 4;
}

/** 将 { start, values } 展开为逐日记录；values 与日期一一对应。 */
export function expandTokenUsage(source: TokenUsageSource): TokenDay[] {
  const parsed = parseISO(source.start);
  if (Number.isNaN(parsed.valueOf()) || source.values.length === 0) return [];

  const start = startOfDay(parsed);
  const active = source.values.filter((value) => value > 0).sort((a, b) => a - b);
  const thresholds: [number, number, number] = [
    quantile(active, 0.25),
    quantile(active, 0.5),
    quantile(active, 0.8),
  ];

  return source.values.map((value, index) => {
    const tokens = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    const date = addDays(start, index);
    return {
      date,
      dateKey: format(date, 'yyyy-MM-dd'),
      tokens,
      level: levelFor(tokens, thresholds),
      future: false,
    };
  });
}

/** 生成以周日开头、以周六结尾的热力图周列，并把未来日期标成 future。 */
export function buildTokenCalendar(source: TokenUsageSource, locale = 'zh-CN'): TokenCalendar {
  const days = expandTokenUsage(source);
  if (days.length === 0) return { weeks: [], months: [], days: [] };

  const byDate = new Map(days.map((day) => [day.dateKey, day]));
  const lastDate = days[days.length - 1]?.date ?? new Date();
  const calendarStart = startOfWeek(days[0]!.date, { weekStartsOn: 0 });
  const calendarEnd = addDays(startOfWeek(lastDate, { weekStartsOn: 0 }), 6);
  const totalDays = Math.round((calendarEnd.valueOf() - calendarStart.valueOf()) / DAY_MS) + 1;
  const calendarDays: TokenDay[] = [];

  for (let index = 0; index < totalDays; index += 1) {
    const date = addDays(calendarStart, index);
    const dateKey = format(date, 'yyyy-MM-dd');
    const existing = byDate.get(dateKey);
    calendarDays.push(
      existing ?? {
        date,
        dateKey,
        tokens: 0,
        level: 0,
        future: date.valueOf() > lastDate.valueOf(),
      },
    );
  }

  const weeks: TokenWeek[] = [];
  for (let index = 0; index < calendarDays.length; index += 7) {
    const weekDays = calendarDays.slice(index, index + 7);
    const first = weekDays[0]!;
    weeks.push({ days: weekDays, month: first.date.getMonth() });
  }

  const months: TokenMonth[] = [];
  for (const week of weeks) {
    const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(week.days[0]!.date);
    const previous = months[months.length - 1];
    if (previous && previous.label === label) {
      previous.span += 1;
    } else {
      months.push({ label, span: 1 });
    }
  }

  return { weeks, months, days: calendarDays };
}

export function summarizeTokenUsage(days: TokenDay[]): TokenSummary {
  const active = days.filter((day) => !day.future);
  if (active.length === 0) {
    return { total: 0, today: 0, peak: null, currentStreak: 0, longestStreak: 0 };
  }

  const total = active.reduce((sum, day) => sum + day.tokens, 0);
  const today = active[active.length - 1]?.tokens ?? 0;
  let peak: TokenSummary['peak'] = null;
  for (const day of active) {
    if (day.tokens > 0 && (!peak || day.tokens > peak.tokens)) {
      peak = { tokens: day.tokens, date: day.date };
    }
  }

  let currentStreak = 0;
  for (let index = active.length - 1; index >= 0; index -= 1) {
    if ((active[index]?.tokens ?? 0) <= 0) break;
    currentStreak += 1;
  }

  let longestStreak = 0;
  let run = 0;
  for (const day of active) {
    if (day.tokens > 0) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }

  return { total, today, peak, currentStreak, longestStreak };
}
