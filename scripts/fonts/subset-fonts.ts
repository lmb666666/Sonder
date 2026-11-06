import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { parse } from 'smol-toml';

import { siteConfigSchema } from '../../src/config/schema';
import { resolveYoulinConfig } from '../../src/config/youlin';
import { loadYoulinCircle, loadYoulinLinks } from '../../src/lib/youlin';

type FontConfig = {
  en: string;
  zh: string;
  file: string;
};

const projectRoot = process.cwd();
const cachePath = join(projectRoot, 'node_modules/.cache/sonder-font-subsets.json');
const youlinCharsCachePath = join(projectRoot, 'node_modules/.cache/sonder-youlin-chars.json');
const forceSubsets = process.argv.includes('--force');
const uiCharsPath = join(projectRoot, 'scripts/fonts/ui-chars.txt');
const friendCirclePath = join(projectRoot, 'public/friend-circle.json');
const fontConfig = readFontConfig();
// 源字体只是构建期输入（可放在 public 之外）；子集产物固定写到 public/fonts 供站点引用。
const fontBaseName = getFontBaseName(fontConfig.file);
const subsetFontUrl = `/fonts/${fontBaseName}-ui-subset.woff2`;
const contentSubsetFontUrl = `/fonts/${fontBaseName}-content-subset.woff2`;
const outputFontPath = resolveProjectPath(subsetFontUrl);
const contentCharsPath = join(projectRoot, 'scripts/fonts/content-chars.txt');
const contentOutputFontPath = resolveProjectPath(contentSubsetFontUrl);
const sourceFontPath = resolveSourceFontPath(fontConfig.file);
const subsetFontName = `${fontConfig.zh} UI Subset`;
const contentSubsetFontName = `${fontConfig.zh} Content Subset`;
const mapleWeights = ['400', '700'];
const mapleFontDir = join(projectRoot, 'node_modules/@fontsource/maple-mono/files');
const mapleInputPaths = mapleWeights.map((weight) =>
  join(mapleFontDir, `maple-mono-latin-${weight}-normal.woff2`),
);
const mapleOutputPaths = mapleWeights.map((weight) =>
  resolveProjectPath(`/fonts/maple-mono-${weight}-subset.woff2`),
);
const isWindows = process.platform === 'win32';
const venvBinDir = isWindows ? 'Scripts' : 'bin';
const pythonExe = isWindows ? 'python.exe' : 'python';
const pyftsubsetExe = isWindows ? 'pyftsubset.exe' : 'pyftsubset';
const pythonCommands = [
  join(projectRoot, '.venv', venvBinDir, pythonExe),
  'python',
  'python3',
].filter(
  (command, index, commands) =>
    (index === 0 ? existsSync(command) : true) && commands.indexOf(command) === index,
);
const contentRoot = 'src/content';

const sourceDirs = [
  'src/pages',
  'src/components',
  'src/layouts',
  'src/config',
  'src/lib',
  'src/i18n',
  'src/data',
  'src/plugins',
];
const contentFrontmatterDirs = [
  `${contentRoot}/blog`,
  `${contentRoot}/projects`,
  `${contentRoot}/media`,
];
const lightweightContentDirs = [`${contentRoot}/media`];
const lightweightContentFiles = [`${contentRoot}/about.md`];
const sourceExtensions = new Set(['.astro', '.ts', '.js', '.mjs', '.cjs', '.json', '.toml']);
const frontmatterExtensions = new Set(['.md']);
const frontmatterKeys = new Set([
  'title',
  'description',
  'subtitle',
  'note',
  'tags',
  'categories',
  'creator',
]);
const cjkPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef]/u;

function readFontConfig(): FontConfig {
  const defaults: FontConfig = {
    en: 'Maple Mono',
    zh: 'ChillRoundF',
    file: 'assets/fonts/ChillRoundFRegular.woff2',
  };
  const siteConfigPath = join(projectRoot, 'site.config.toml');

  if (!existsSync(siteConfigPath)) return defaults;

  const parsed = parse(readFileSync(siteConfigPath, 'utf8')) as {
    config?: {
      fonts?: Partial<Record<keyof FontConfig, unknown>>;
    };
  };
  const fonts = parsed.config?.fonts ?? {};

  return {
    en: normalizeConfigString(fonts.en, defaults.en),
    zh: normalizeConfigString(fonts.zh, defaults.zh),
    file: normalizeConfigString(fonts.file, defaults.file),
  };
}

function getFontBaseName(fontPath: string) {
  const queryIndex = fontPath.search(/[?#]/);
  const path = queryIndex === -1 ? fontPath : fontPath.slice(0, queryIndex);
  const fileName = path.replace(/\\/g, '/').split('/').pop() ?? 'font';
  const extensionIndex = fileName.lastIndexOf('.');

  return extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
}

function normalizeConfigString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function resolveProjectPath(value: string) {
  if (/^https?:\/\//i.test(value)) {
    throw new Error(
      `Font subsetting outputs must be local paths, but received a remote URL: ${value}`,
    );
  }

  // 以 / 开头的是站点 URL，落到 public/ 下；显式相对路径按项目根解析。
  const normalized = value.replace(/\\/g, '/');

  if (normalized.startsWith('/')) {
    return join(projectRoot, 'public', normalized.replace(/^\/+/, ''));
  }

  return join(projectRoot, normalized);
}

function resolveSourceFontPath(value: string) {
  if (/^https?:\/\//i.test(value)) {
    throw new Error(
      `Font subsetting needs a local font file, but config.fonts.file received a remote URL: ${value}`,
    );
  }

  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  // 构建源字体可放在 public 之外；不带目录的旧式路径回退到 public/ 保持兼容。
  const relativePath = /^(?:public|assets|src)\//.test(normalized)
    ? normalized
    : `public/${normalized}`;

  return join(projectRoot, relativePath);
}

function walkFiles(dir: string, extensions: Set<string>) {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(path, extensions));
      continue;
    }

    if (entry.isFile() && extensions.has(extname(entry.name))) files.push(path);
  }

  return files;
}

function collectCjk(chars: Set<string>, text: string) {
  for (const char of text) {
    if (cjkPattern.test(char)) chars.add(char);
  }
}

function extractFrontmatter(text: string) {
  if (!text.startsWith('---')) return '';

  const endIndex = text.indexOf('\n---', 3);
  if (endIndex === -1) return '';

  return text.slice(3, endIndex);
}

function extractFrontmatterFields(frontmatter: string) {
  const values: string[] = [];
  let activeKey: string | null = null;

  for (const line of frontmatter.split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (keyMatch) {
      activeKey = keyMatch[1];
      if (frontmatterKeys.has(activeKey)) values.push(keyMatch[2]);
      continue;
    }

    if (activeKey && frontmatterKeys.has(activeKey) && /^\s+/.test(line)) {
      values.push(line);
    }
  }

  return values.join('\n');
}

function collectStrings(chars: Set<string>, value: unknown): void {
  if (typeof value === 'string') {
    collectCjk(chars, value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(chars, item);
  } else if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) collectStrings(chars, nestedValue);
  }
}

function collectFriendCircleChars(chars: Set<string>) {
  if (!existsSync(friendCirclePath)) return;

  try {
    collectStrings(chars, JSON.parse(readFileSync(friendCirclePath, 'utf8')) as unknown);
  } catch (error) {
    console.warn(`Unable to collect friend-circle characters from ${friendCirclePath}:`, error);
  }
}

function readYoulinConfig() {
  if (!existsSync(siteConfigPath)) return null;

  const parsed = parse(readFileSync(siteConfigPath, 'utf8')) as { config?: unknown };
  const result = siteConfigSchema.safeParse(parsed.config ?? {});
  if (!result.success) {
    console.warn(
      'Unable to read [config.youlin] for font subsetting; site.config.toml is invalid.',
    );
    return null;
  }
  return resolveYoulinConfig(result.data.youlin);
}

function readYoulinCharsCache(baseUrl: string): string[] {
  if (!existsSync(youlinCharsCachePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(youlinCharsCachePath, 'utf8')) as {
      baseUrl?: unknown;
      chars?: unknown;
    };
    if (parsed.baseUrl !== baseUrl || !Array.isArray(parsed.chars)) return [];
    return parsed.chars.filter((char): char is string => typeof char === 'string');
  } catch {
    return [];
  }
}

function writeYoulinCharsCache(baseUrl: string, chars: string[]) {
  try {
    mkdirSync(dirname(youlinCharsCachePath), { recursive: true });
    writeFileSync(youlinCharsCachePath, `${JSON.stringify({ baseUrl, chars }, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.warn('Unable to cache Youlin font characters:', error);
  }
}

/** 友邻数据是构建期注入的文本，字体子集也要把它算进去；失败不影响构建。 */
async function collectYoulinChars(chars: Set<string>) {
  const config = readYoulinConfig();
  if (!config?.baseUrl) return;

  const needsLinks = config.links.sources.includes('youlin');
  const needsCircle = config.circle.sources.includes('youlin');
  if (!needsLinks && !needsCircle) return;

  // 网络抖动时沿用上一次成功的字符集，避免子集突然缩小导致页面缺字。
  const cachedChars = readYoulinCharsCache(config.baseUrl);
  for (const char of cachedChars) chars.add(char);

  // 字体步骤只做尽力收集，别让 dev/build 为它等满接口超时。
  const timeoutMs = Math.min(config.timeoutMs, 3_000);

  const [links, circle] = await Promise.all([
    needsLinks
      ? loadYoulinLinks(config.baseUrl, {
          group: config.links.group,
          timeoutMs,
        })
      : Promise.resolve(null),
    needsCircle
      ? loadYoulinCircle(config.baseUrl, {
          limit: config.circle.limit,
          timeoutMs,
        })
      : Promise.resolve(null),
  ]);

  const remoteChars = new Set<string>();
  let fetched = false;

  if (links?.ok) {
    collectStrings(remoteChars, links.data);
    fetched = true;
  } else if (links) {
    console.warn(`Unable to collect Youlin link characters: ${links.error}`);
  }

  if (circle?.ok) {
    collectStrings(remoteChars, circle.data.posts);
    fetched = true;
  } else if (circle) {
    console.warn(`Unable to collect Youlin circle characters: ${circle.error}`);
  }

  for (const char of remoteChars) chars.add(char);
  if (fetched) {
    const merged = [...new Set([...cachedChars, ...remoteChars])].sort(
      (a, b) => a.codePointAt(0)! - b.codePointAt(0)!,
    );
    writeYoulinCharsCache(config.baseUrl, merged);
  }
}

function runPyftsubset(args: string[]) {
  const commands = [
    { command: join(projectRoot, '.venv', venvBinDir, pyftsubsetExe), args },
    ...pythonCommands.map((command) => ({ command, args: ['-m', 'fontTools.subset', ...args] })),
  ];

  for (const { command, args: commandArgs } of commands) {
    const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
    if (result.status === 0) return;

    if (result.error && 'code' in result.error && result.error.code === 'ENOENT') continue;
  }

  throw new Error(
    'Unable to run fonttools. Install it in the project virtual environment with `python3 -m venv .venv && .venv/bin/python -m pip install fonttools brotli`.',
  );
}

function runSubset(charsPath: string, fontOutputPath: string, unicodes?: string) {
  runPyftsubset([
    sourceFontPath,
    `--text-file=${charsPath}`,
    ...(unicodes ? [`--unicodes=${unicodes}`] : []),
    `--output-file=${fontOutputPath}`,
    '--flavor=woff2',
    '--with-zopfli',
    '--layout-features=*',
    '--name-IDs=*',
    '--glyph-names',
    '--notdef-glyph',
    '--notdef-outline',
    '--recommended-glyphs',
    '--no-hinting',
  ]);
}

function runMapleSubsets() {
  const mapleUnicodes = 'U+0020-007E,U+00A0-00FF,U+2000-206F,U+20AC,U+2190-2193,U+2212';

  for (const [index, weight] of mapleWeights.entries()) {
    const inputFontPath = mapleInputPaths[index]!;
    const outputPath = mapleOutputPaths[index]!;

    if (!existsSync(inputFontPath)) {
      throw new Error(`Maple Mono source font not found at ${inputFontPath}.`);
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    runPyftsubset([
      inputFontPath,
      `--unicodes=${mapleUnicodes}`,
      `--output-file=${outputPath}`,
      '--flavor=woff2',
      '--with-zopfli',
      '--layout-features=*',
      '--name-IDs=*',
      '--glyph-names',
      '--notdef-glyph',
      '--notdef-outline',
      '--recommended-glyphs',
      '--no-hinting',
    ]);
    console.log(`Generated Maple Mono ${weight} subset at ${outputPath}.`);
  }
}

function syncSubsetFontName(fontOutputPath: string, familyName: string) {
  const script = `
from fontTools.ttLib import TTFont
import sys

path = sys.argv[1]
family = sys.argv[2]
font = TTFont(path)
name_table = font['name']

for record in name_table.names:
    if record.nameID == 1:
        record.string = family.encode(record.getEncoding(), errors='replace')
    elif record.nameID == 2:
        record.string = 'Regular'.encode(record.getEncoding(), errors='replace')
    elif record.nameID == 4:
        record.string = f'{family} Regular'.encode(record.getEncoding(), errors='replace')
    elif record.nameID == 6:
        record.string = ''.join(part for part in f'{family}-Regular' if part.isalnum() or part == '-').encode(record.getEncoding(), errors='replace')

font.save(path)
`;
  let result;
  for (const command of pythonCommands) {
    result = spawnSync(command, ['-c', script, fontOutputPath, familyName], {
      stdio: 'inherit',
    });
    if (result.status === 0) return;
  }

  throw new Error(
    `Generated subset font, but failed to sync its internal name to ${familyName}. Ensure Python 3 and fonttools are installed. Error: ${result?.error?.message ?? `status ${result?.status}`}`,
  );
}

function fileFingerprint(path: string) {
  try {
    const stat = statSync(path);
    return `${stat.size}:${stat.mtimeMs}`;
  } catch {
    return 'missing';
  }
}

function computeSubsetFingerprint(uiChars: string, contentChars: string) {
  return createHash('sha256')
    .update(uiChars)
    .update('\0')
    .update(contentChars)
    .update('\0')
    .update(JSON.stringify(fontConfig))
    .update('\0')
    .update(fileFingerprint(sourceFontPath))
    .update('\0')
    .update(mapleInputPaths.map(fileFingerprint).join('\0'))
    .digest('hex');
}

function readCachedFingerprint() {
  try {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8')) as { fingerprint?: unknown };
    return typeof cached.fingerprint === 'string' ? cached.fingerprint : '';
  } catch {
    return '';
  }
}

function writeCachedFingerprint(fingerprint: string) {
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify({ fingerprint }, null, 2)}\n`, 'utf8');
}

const chars = new Set<string>();
const siteConfigPath = join(projectRoot, 'site.config.toml');

for (const dir of sourceDirs) {
  for (const file of walkFiles(join(projectRoot, dir), sourceExtensions)) {
    // 测试文件里的中文只出现在注释与断言描述中，不参与渲染，不进字体子集。
    if (/\.test\.[cm]?[jt]s$/.test(file)) continue;
    collectCjk(chars, readFileSync(file, 'utf8'));
  }
}

for (const dir of contentFrontmatterDirs) {
  for (const file of walkFiles(join(projectRoot, dir), frontmatterExtensions)) {
    const frontmatter = extractFrontmatter(readFileSync(file, 'utf8'));
    collectCjk(chars, extractFrontmatterFields(frontmatter));
  }
}

for (const dir of lightweightContentDirs) {
  for (const file of walkFiles(join(projectRoot, dir), frontmatterExtensions)) {
    collectCjk(chars, readFileSync(file, 'utf8'));
  }
}

for (const file of lightweightContentFiles) {
  const path = join(projectRoot, file);
  if (existsSync(path)) collectCjk(chars, readFileSync(path, 'utf8'));
}

// 站点配置在根目录，不属于任何 src 目录：页脚版权、首页介绍等文案都来自这里。
if (existsSync(siteConfigPath)) {
  collectCjk(chars, readFileSync(siteConfigPath, 'utf8'));
}

// The sync Action writes RSS-derived display text before this build step.
collectFriendCircleChars(chars);

// Youlin 的友链名/朋友圈标题也可能含 CJK；取不到就只用现有字符集。
await collectYoulinChars(chars);

const uiChars = [...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');
if (!uiChars) throw new Error('No CJK UI characters were found for font subsetting.');

const contentChars = new Set(chars);
for (const file of walkFiles(join(projectRoot, 'src/content'), frontmatterExtensions)) {
  collectCjk(contentChars, readFileSync(file, 'utf8'));
}
const contentCharsValue = [...contentChars]
  .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
  .join('');
if (!contentCharsValue)
  throw new Error('No CJK content characters were found for font subsetting.');

mkdirSync(join(projectRoot, 'scripts/fonts'), { recursive: true });
mkdirSync(dirname(outputFontPath), { recursive: true });
mkdirSync(dirname(contentOutputFontPath), { recursive: true });
writeFileSync(uiCharsPath, `${uiChars}\n`, 'utf8');
writeFileSync(contentCharsPath, `${contentCharsValue}\n`, 'utf8');

if (!existsSync(sourceFontPath)) {
  throw new Error(
    `${fontConfig.zh} source font not found. Place the full font at ${sourceFontPath}, or update config.fonts.file in site.config.toml.`,
  );
}

const fingerprint = computeSubsetFingerprint(uiChars, contentCharsValue);
const expectedOutputs = [outputFontPath, contentOutputFontPath, ...mapleOutputPaths];
const cacheHit =
  !forceSubsets &&
  fingerprint === readCachedFingerprint() &&
  expectedOutputs.every((path) => existsSync(path));

if (cacheHit) {
  console.log('Font subsets are up to date; skipping pyftsubset.');
  process.exit(0);
}

runSubset(uiCharsPath, outputFontPath);
syncSubsetFontName(outputFontPath, subsetFontName);
runSubset(contentCharsPath, contentOutputFontPath);
syncSubsetFontName(contentOutputFontPath, contentSubsetFontName);
runMapleSubsets();
writeCachedFingerprint(fingerprint);

console.log(`Generated ${uiCharsPath} with ${uiChars.length} CJK UI characters.`);
console.log(
  `Generated ${contentCharsPath} with ${contentCharsValue.length} CJK content characters.`,
);
console.log(`Generated ${subsetFontName} at ${outputFontPath} from ${sourceFontPath}.`);
console.log(
  `Generated ${contentSubsetFontName} at ${contentOutputFontPath} from ${sourceFontPath}.`,
);
