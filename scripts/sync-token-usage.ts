import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

interface TokenUsageFile {
  start: string;
  values: number[];
  source?: string;
}

interface SourceResult {
  days: Map<string, number>;
  records: number;
}

type SourceName = 'magpie' | 'zcode' | 'opencode' | 'claude' | 'codex' | 'ccswitch';

const OUTPUT = resolve(process.cwd(), 'src/data/token-usage.yml');
const HOME = homedir();
const ZCODE_DB = join(HOME, '.zcode/cli/db/db.sqlite');
const OPENCODE_DB = join(HOME, '.local/share/opencode/opencode.db');
const CCSWITCH_DB = join(HOME, '.cc-switch/cc-switch.db');
const CLAUDE_DIR = join(HOME, '.claude/projects');
const CODEX_DIR = join(HOME, '.codex/sessions');
const HEADER =
  '# 由 scripts/sync-token-usage.ts 生成；magpie / ZCode / OpenCode / Claude / Codex 不可用时可手动编辑。\n';
const SOURCE_ORDER: SourceName[] = ['magpie', 'zcode', 'opencode', 'claude', 'codex', 'ccswitch'];
const SOURCE_ALIASES: Record<string, SourceName> = {
  magpie: 'magpie',
  zcode: 'zcode',
  opencode: 'opencode',
  claude: 'claude',
  claudecode: 'claude',
  'claude-code': 'claude',
  codex: 'codex',
  ccswitch: 'ccswitch',
  'cc-switch': 'ccswitch',
};
const SOURCE_CHOICES: { value: 'auto' | SourceName; label: string }[] = [
  { value: 'auto', label: '自动（Magpie → ZCode → OpenCode → Claude → Codex → cc-switch）' },
  { value: 'magpie', label: 'Magpie' },
  { value: 'zcode', label: 'ZCode' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'claude', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'ccswitch', label: 'cc-switch' },
];

function findCommand(name: string) {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }

  const local = join(HOME, '.local/bin', name);
  return existsSync(local) ? local : null;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function localDay(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addTokens(days: Map<string, number>, day: string, tokens: number) {
  if (!day || !Number.isFinite(tokens) || tokens <= 0) return false;
  days.set(day, (days.get(day) ?? 0) + tokens);
  return true;
}

function latestDay(days: Map<string, number>) {
  return [...days.keys()].sort().at(-1) ?? '';
}

function walkFiles(root: string, match: (file: string) => boolean): string[] {
  if (!existsSync(root)) return [];

  const files: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && match(path)) files.push(path);
    }
  };

  walk(root);
  return files;
}

function parseJsonLines(text: string): unknown[] {
  const rows: unknown[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // 会话日志可能包含截断行，跳过即可。
    }
  }
  return rows;
}

function querySqlite(db: string, query: string, label: string): Record<string, unknown>[] | null {
  if (!existsSync(db)) return null;

  const sqlite = findCommand('sqlite3');
  if (!sqlite) {
    console.warn(`[tokens] 未找到 sqlite3，无法读取 ${label}。`);
    return null;
  }

  const result = spawnSync(sqlite, ['-readonly', '-json', db, query], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    console.warn(`[tokens] 读取 ${label} 失败。`);
    const message = result.stderr?.trim();
    if (message) console.warn(message);
    return null;
  }

  try {
    return JSON.parse(result.stdout || '[]') as Record<string, unknown>[];
  } catch (error) {
    console.warn(`[tokens] 无法解析 ${label}。`, error);
    return null;
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toDay(value: string | undefined) {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(value ?? '');
  return match?.[1] ?? '';
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayRange(start: string, end: string) {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

function numberField(row: Record<string, string>, key: string) {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function aggregateUsage(rows: string[][]): {
  days: Map<string, number>;
  parsedRows: number;
} {
  const headerIndex = rows.findIndex(
    (row) => row.includes('time') && row.includes('input_tokens') && row.includes('output_tokens'),
  );
  const days = new Map<string, number>();
  if (headerIndex === -1) return { days, parsedRows: 0 };

  const header = rows[headerIndex]!;
  let parsedRows = 0;

  for (const cells of rows.slice(headerIndex + 1)) {
    if (cells.length !== header.length) continue;
    const row = Object.fromEntries(header.map((key, index) => [key, cells[index] ?? '']));
    const day = toDay(row.time);
    if (!day) continue;

    // 与 Magpie 主面板口径一致：只统计经 Magpie 路由的请求（source 为空），
    // Token 总量包含 input / output / reasoning / cache read / cache write。
    if (row.source) continue;
    const tokens =
      numberField(row, 'input_tokens') +
      numberField(row, 'output_tokens') +
      numberField(row, 'reasoning_tokens') +
      numberField(row, 'cache_read_tokens') +
      numberField(row, 'cache_write_tokens');
    if (!addTokens(days, day, tokens)) continue;

    parsedRows += 1;
  }

  return { days, parsedRows };
}

export function aggregateDayRows(rows: { day?: string; tokens?: string | number }[]) {
  const days = new Map<string, number>();

  for (const row of rows) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(row.day ?? '') ? row.day! : '';
    addTokens(days, day, Number(row.tokens ?? 0));
  }

  return days;
}

export const aggregateZcodeRows = aggregateDayRows;

function readMagpieUsage(): SourceResult | null {
  const magpie = findCommand('magpie');
  if (!magpie) return null;

  const result = spawnSync(magpie, ['usage', '--csv', 'all'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    console.warn('[tokens] magpie usage 执行失败。');
    const message = result.stderr?.trim();
    if (message) console.warn(message);
    return null;
  }

  const { days, parsedRows } = aggregateUsage(parseCsv(result.stdout ?? ''));
  return parsedRows > 0 ? { days, records: parsedRows } : null;
}

function readZcodeUsage(): SourceResult | null {
  const rows = querySqlite(
    ZCODE_DB,
    "select date(started_at / 1000, 'unixepoch', 'localtime') as day, " +
      'sum(computed_total_tokens) as tokens ' +
      "from model_usage where status = 'completed' group by day order by day;",
    'ZCode',
  );
  if (!rows) return null;

  const days = aggregateDayRows(rows);
  return days.size > 0 ? { days, records: rows.length } : null;
}

function readOpencodeUsage(): SourceResult | null {
  // OpenCode 的 tokens.input 已包含 cache read，合计时不能再加 cache.read。
  const rows = querySqlite(
    OPENCODE_DB,
    "select date(json_extract(data, '$.time.created') / 1000, 'unixepoch', 'localtime') as day, " +
      "sum(coalesce(json_extract(data, '$.tokens.input'), 0) + " +
      "coalesce(json_extract(data, '$.tokens.output'), 0) + " +
      "coalesce(json_extract(data, '$.tokens.reasoning'), 0)) as tokens " +
      "from session_message where type = 'assistant' " +
      "and json_extract(data, '$.time.created') is not null " +
      'group by day order by day;',
    'OpenCode',
  );
  if (!rows) return null;

  const days = aggregateDayRows(rows);
  return days.size > 0 ? { days, records: rows.length } : null;
}

export function aggregateClaudeRecords(lines: unknown[]): Map<string, number> {
  const days = new Map<string, number>();
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const entry = line as Record<string, any>;
    if (entry?.type !== 'assistant') return;
    const message = entry.message as Record<string, any> | undefined;
    const usage = (message?.usage ?? entry.usage) as Record<string, number> | undefined;
    if (!usage) return;

    const key =
      message?.id || entry.requestId || `${entry.sessionId ?? ''}:${entry.timestamp}:${index}`;
    if (seen.has(key)) return;
    seen.add(key);

    const tokens =
      Number(usage.input_tokens ?? 0) +
      Number(usage.output_tokens ?? 0) +
      Number(usage.cache_creation_input_tokens ?? 0) +
      Number(usage.cache_read_input_tokens ?? 0);
    addTokens(days, localDay(entry.timestamp), tokens);
  });

  return days;
}

function readClaudeUsage(): SourceResult | null {
  const files = walkFiles(CLAUDE_DIR, (file) => file.endsWith('.jsonl'));
  if (files.length === 0) return null;

  const days = new Map<string, number>();
  let records = 0;

  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const fileDays = aggregateClaudeRecords(parseJsonLines(text));
    for (const [day, tokens] of fileDays) {
      days.set(day, (days.get(day) ?? 0) + tokens);
      records += 1;
    }
  }

  return days.size > 0 ? { days, records } : null;
}

export function aggregateCodexRecords(lines: unknown[]): Map<string, number> {
  const days = new Map<string, number>();
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const entry = line as Record<string, any>;
    if (entry?.type !== 'token_usage_record') return;
    const payload = entry.payload as Record<string, any> | undefined;
    const usage = payload?.usage as Record<string, number> | undefined;
    if (!usage) return;

    const key =
      payload?.response_id || `${payload?.thread_id ?? ''}:${payload?.turn_id ?? ''}:${index}`;
    if (seen.has(key)) return;
    seen.add(key);

    const tokens = Number(
      usage.total_tokens ?? Number(usage.input_tokens ?? 0) + Number(usage.output_tokens ?? 0),
    );
    addTokens(days, localDay(entry.timestamp), tokens);
  });

  return days;
}

function readCodexUsage(): SourceResult | null {
  const files = walkFiles(
    CODEX_DIR,
    (file) => file.endsWith('.jsonl') || file.endsWith('.jsonl.zst'),
  );
  if (files.length === 0) return null;

  const zstd = findCommand('zstd');
  const days = new Map<string, number>();
  let records = 0;
  let warnedMissingZstd = false;

  for (const file of files) {
    let text = '';
    try {
      if (file.endsWith('.zst')) {
        if (!zstd) {
          if (!warnedMissingZstd) {
            console.warn('[tokens] 未找到 zstd，跳过 Codex 压缩会话。');
            warnedMissingZstd = true;
          }
          continue;
        }
        const result = spawnSync(zstd, ['-dc', file], {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        });
        if (result.error || result.status !== 0) continue;
        text = result.stdout ?? '';
      } else {
        text = readFileSync(file, 'utf8');
      }
    } catch {
      continue;
    }

    const fileDays = aggregateCodexRecords(parseJsonLines(text));
    for (const [day, tokens] of fileDays) {
      days.set(day, (days.get(day) ?? 0) + tokens);
      records += 1;
    }
  }

  return days.size > 0 ? { days, records } : null;
}

function readCcSwitchUsage(): SourceResult | null {
  // cc-switch 用 input_token_semantics 区分 input 是否已包含 cache：
  // 1 = input 不含 cache，需要补 cache；2 = input 已含 cache，不再重复加。
  const rows = querySqlite(
    CCSWITCH_DB,
    'select date as day, ' +
      'sum(input_tokens + output_tokens + case when input_token_semantics = 1 ' +
      'then cache_read_tokens + cache_creation_tokens else 0 end) as tokens ' +
      'from usage_daily_rollups group by date order by date;',
    'cc-switch',
  );
  if (!rows) return null;

  const days = aggregateDayRows(rows);
  return days.size > 0 ? { days, records: rows.length } : null;
}

const readers: Record<SourceName, () => SourceResult | null> = {
  magpie: readMagpieUsage,
  zcode: readZcodeUsage,
  opencode: readOpencodeUsage,
  claude: readClaudeUsage,
  codex: readCodexUsage,
  ccswitch: readCcSwitchUsage,
};

function printHelp() {
  console.log(`用法：bun scripts/sync-token-usage.ts [--source <source>]

数据源：
  auto       默认，按 Magpie -> ZCode -> OpenCode -> Claude -> Codex -> cc-switch 取第一个有数据的源
  magpie     Magpie usage CSV（推荐，含 cache read）
  zcode      ~/.zcode/cli/db/db.sqlite 的 model_usage
  opencode   ~/.local/share/opencode/opencode.db 的 assistant message
  claude     ~/.claude/projects/**/*.jsonl
  codex      ~/.codex/sessions/**/*.jsonl(.zst)
  ccswitch   ~/.cc-switch/cc-switch.db 的 usage_daily_rollups

示例：
  bun scripts/sync-token-usage.ts --source opencode
  bun scripts/sync-token-usage.ts --source codex`);
}

function readSource(name: SourceName): SourceResult | null {
  const result = readers[name]();
  if (!result || result.days.size === 0) return null;
  console.log(`[tokens] 读取 ${name}：${latestDay(result.days)}，${result.records} 条记录。`);
  return result;
}

function parseSourceValue(raw: string): 'auto' | SourceName | null {
  const name = raw.trim().toLowerCase();
  if (name === 'auto') return 'auto';
  return SOURCE_ALIASES[name] ?? null;
}

async function promptSource(): Promise<'auto' | SourceName> {
  console.log('\n选择 Token 数据源：');
  SOURCE_CHOICES.forEach((choice, index) => {
    console.log(`  ${index + 1}) ${choice.label}`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      const answer = (await rl.question('输入序号或名称 [1]: ')).trim();
      if (!answer) return 'auto';

      const index = Number(answer);
      if (Number.isInteger(index) && index >= 1 && index <= SOURCE_CHOICES.length) {
        return SOURCE_CHOICES[index - 1]!.value;
      }

      const value = parseSourceValue(answer);
      if (value) return value;
      console.log('无效选择，请重试。');
    }
  } finally {
    rl.close();
  }
}

async function resolveSource(argv: string[]): Promise<'auto' | SourceName | null> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return null;
  }

  const sourceArg = argv.find((arg) => arg.startsWith('--source='));
  const sourceIndex = argv.indexOf('--source');
  if (sourceIndex >= 0 && !argv[sourceIndex + 1]) {
    console.error('[tokens] --source 需要指定数据源。');
    printHelp();
    process.exitCode = 1;
    return null;
  }

  const raw = sourceArg?.slice('--source='.length) ?? argv[sourceIndex + 1];
  if (raw !== undefined) {
    const source = parseSourceValue(raw);
    if (!source) {
      console.error(`[tokens] 未知数据源：${raw}`);
      printHelp();
      process.exitCode = 1;
      return null;
    }
    return source;
  }

  if (!stdin.isTTY || !stdout.isTTY) return 'auto';
  console.log('未指定 --source，进入交互选择。');
  return promptSource();
}

async function readExisting(): Promise<TokenUsageFile | null> {
  if (!existsSync(OUTPUT)) return null;

  try {
    const text = await readFile(OUTPUT, 'utf8');
    const start = /^\s*start:\s*'?(\d{4}-\d{2}-\d{2})'?\s*$/m.exec(text)?.[1];
    const source = /^\s*#\s*source:\s*(\w+)/m.exec(text)?.[1];
    const valuesBlock = text.split(/^\s*values:\s*$/m)[1] ?? '';
    const values = [...valuesBlock.matchAll(/^\s*-\s*(\d+)\s*$/gm)].map((match) =>
      Number(match[1]),
    );

    if (start && values.length > 0) return { start, values, source };
  } catch (error) {
    console.warn(`[tokens] 无法读取现有 ${OUTPUT}，将重新生成：`, error);
  }

  return null;
}

function mergeUsage(
  existing: TokenUsageFile | null,
  incoming: Map<string, number>,
): TokenUsageFile | null {
  if (incoming.size === 0 && !existing) return null;

  const existingDays = new Map<string, number>();
  if (existing) {
    existing.values.forEach((value, index) => {
      existingDays.set(addDays(existing.start, index), value);
    });
  }

  for (const [day, value] of incoming) existingDays.set(day, value);

  const days = [...existingDays.keys()].sort();
  const start = existing?.start && existing.start < days[0]! ? existing.start : days[0]!;
  const end = days.at(-1)!;

  return {
    start,
    values: dayRange(start, end).map((day) => existingDays.get(day) ?? 0),
  };
}

function serialize(usage: TokenUsageFile, source: string) {
  return `${HEADER}# source: ${source}\ntokenUsage:\n  start: '${usage.start}'\n  values:\n${usage.values
    .map((value) => `    - ${value}`)
    .join('\n')}\n`;
}

async function main() {
  const requested = await resolveSource(process.argv.slice(2));
  if (!requested) return;

  let source: SourceName | undefined;
  let result: SourceResult | null = null;

  if (requested === 'auto') {
    for (const name of SOURCE_ORDER) {
      const candidate = readSource(name);
      if (candidate) {
        source = name;
        result = candidate;
        break;
      }
    }
  } else {
    source = requested;
    result = readSource(requested);
  }

  if (!source || !result) {
    console.warn('[tokens] 没有检测到可用的 Token 数据，保留现有 token-usage.yml。');
    console.warn('[tokens] 请手动编辑 src/data/token-usage.yml。');
    return;
  }

  const existing = await readExisting();
  const merged = mergeUsage(
    existing?.source && existing.source !== source ? null : existing,
    result.days,
  );
  if (!merged) {
    console.warn('[tokens] 没有可写入的 Token 数据。');
    return;
  }

  const output = serialize(merged, source);
  const previous = existsSync(OUTPUT) ? await readFile(OUTPUT, 'utf8') : '';
  if (output === previous) {
    console.log(`[tokens] token-usage.yml 已是最新（来源：${source}）。`);
    return;
  }

  const temp = `${OUTPUT}.tmp`;
  await writeFile(temp, output, 'utf8');
  await rename(temp, OUTPUT);
  console.log(
    `[tokens] 已更新 token-usage.yml（来源：${source}）：${merged.start} 起 ${merged.values.length} 天，${result.records} 条记录。`,
  );
}

if (import.meta.main) await main();
