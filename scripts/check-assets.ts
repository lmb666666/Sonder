import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * 构建产物完整性校验：扫描 dist 下所有 HTML 中引用的本地资源
 * （/_astro/*.css|js|woff2、/images/*、/fonts/*），确认文件真实存在。
 *
 * 存在意义：Astro 的内容缓存会把渲染好的 HTML（内含资源哈希）缓存下来，
 * 若 CI 复用旧缓存而资源文件名按内容重新哈希，就会出现「HTML 引用旧哈希
 * → 404 → 样式整体丢失」的静默故障（真实发生过：Expressive Code 样式
 * 404 导致代码块排版错乱）。有这道校验，构建会直接失败而不是发布坏页面。
 */

const DIST = 'dist';
const LOCAL_PREFIXES = ['/_astro/', '/images/', '/fonts/', '/pagefind/'];

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = await walk(DIST);
const missing = new Map<string, string[]>();
let checked = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const refs = new Set<string>();
  for (const match of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
    for (const part of match[1].split(',')) {
      const url = part.trim().split(/\s+/)[0] ?? '';
      if (LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix))) refs.add(url.split('?')[0]!);
    }
  }
  for (const ref of refs) {
    checked += 1;
    if (!existsSync(join(DIST, ref))) {
      const list = missing.get(ref) ?? [];
      list.push(relative(DIST, file));
      missing.set(ref, list);
    }
  }
}

if (missing.size > 0) {
  console.error(`\n✗ 产物资源校验失败：${missing.size} 个引用缺失（共检查 ${checked} 个）`);
  for (const [ref, pages] of [...missing].slice(0, 20)) {
    console.error(`  ${ref}`);
    console.error(
      `    引用页：${pages.slice(0, 3).join(', ')}${pages.length > 3 ? ` 等 ${pages.length} 页` : ''}`,
    );
  }
  console.error('\n最常见原因：复用了过期的 Astro 内容缓存（HTML 里写死了旧的资源哈希）。');
  console.error('处理：删除 .astro 与 node_modules/.astro 后重新构建。\n');
  process.exit(1);
}

console.log(`✓ 产物资源校验通过（${files.length} 页、${checked} 个引用）`);
