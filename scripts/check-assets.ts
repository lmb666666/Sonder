import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * 构建产物完整性校验：扫描 dist 下 HTML / CSS 中所有本地引用
 * （href、src、srcset、CSS url()），确认目标文件或目录首页真实存在。
 *
 * 存在意义：Astro 的内容缓存会把渲染好的 HTML（内含资源哈希）缓存下来，
 * 若 CI 复用旧缓存而资源文件名按内容重新哈希，就会出现「HTML 引用旧哈希
 * → 404 → 样式整体丢失」的静默故障（真实发生过：Expressive Code 样式
 * 404 导致代码块排版错乱）。有这道校验，构建会直接失败而不是发布坏页面。
 *
 * 同时覆盖子路径部署：SITE_BASE=/my-site 时，HTML 中的 /my-site/... 会先
 * 去掉 base 再映射到 dist，避免「base 前缀导致所有资源被跳过」的假通过。
 */

const DIST = 'dist';
const BASE_PATH = (process.env.SITE_BASE ?? '/').replace(/\/$/, '');
const SOURCE_EXTENSIONS = new Set(['.html', '.css']);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (SOURCE_EXTENSIONS.has(extensionOf(entry.name))) out.push(full);
  }
  return out;
}

function extensionOf(name: string) {
  const index = name.lastIndexOf('.');
  return index === -1 ? '' : name.slice(index).toLowerCase();
}

function isExternal(value: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function normalizeRef(raw: string, file: string): string | undefined {
  let value = decodeHtmlEntities(raw.trim()).replace(/^['"]|['"]$/g, '');
  if (!value || value.startsWith('#')) return undefined;
  if (isExternal(value)) return undefined;

  value = value.split('#')[0]!.split('?')[0]!;
  if (!value) return undefined;

  if (value.startsWith('/')) {
    if (BASE_PATH) {
      if (value === BASE_PATH) value = '/';
      else if (value.startsWith(`${BASE_PATH}/`)) value = value.slice(BASE_PATH.length);
    }
    return decodeURIComponent(value);
  }

  const absolute = resolve(dirname(file), value);
  return `/${relative(DIST, absolute)}`;
}

function targetExists(ref: string) {
  const clean = ref.replace(/^\/+/, '');
  const candidates =
    clean === '' || clean.endsWith('/')
      ? [join(DIST, clean, 'index.html')]
      : [join(DIST, clean), join(DIST, `${clean}.html`), join(DIST, clean, 'index.html')];

  return candidates.some((candidate) => existsSync(candidate));
}

const files = await walk(DIST);
const refs = new Set<string>();
const refPages = new Map<string, string[]>();

function addRef(value: string, file: string) {
  const ref = normalizeRef(value, file);
  if (!ref) return;

  refs.add(ref);
  const pages = refPages.get(ref) ?? [];
  if (pages.length < 5) pages.push(relative(DIST, file));
  refPages.set(ref, pages);
}

for (const file of files) {
  const content = await readFile(file, 'utf8');
  // 代码示例里会原样出现 href/url() 文本，但它们不是页面引用。
  const scannable = content
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s\S]*?<\/code>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  for (const match of scannable.matchAll(/(?:href|src)="([^"]+)"/g)) {
    addRef(match[1]!, file);
  }

  for (const match of scannable.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of match[1]!.split(',')) {
      addRef(part.trim().split(/\s+/)[0] ?? '', file);
    }
  }

  for (const match of scannable.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    addRef(match[2]!, file);
  }
}

const missing = new Map<string, string[]>();
for (const ref of refs) {
  if (!targetExists(ref)) missing.set(ref, refPages.get(ref) ?? []);
}

if (missing.size > 0) {
  console.error(`\n✗ 产物资源校验失败：${missing.size} 个引用缺失（共检查 ${refs.size} 个）`);
  for (const [ref, pages] of [...missing].slice(0, 20)) {
    console.error(`  ${ref}`);
    if (pages.length > 0) {
      console.error(`    引用页：${pages.join(', ')}${pages.length === 5 ? ' 等' : ''}`);
    }
  }
  console.error('\n最常见原因：复用了过期的 Astro 内容缓存（HTML 里写死了旧的资源哈希）。');
  console.error('处理：删除 .astro 与 node_modules/.astro 后重新构建。\n');
  process.exit(1);
}

console.log(`✓ 产物资源校验通过（${files.length} 个文件、${refs.size} 个引用）`);
