import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface PostFile {
  file: string;
  relativePath: string;
  source: string;
  frontmatterSource: string;
  frontmatter: Record<string, unknown>;
}

const frontmatterPattern = /^---(\r?\n)([\s\S]*?)\r?\n---/;

function walk(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
  return files;
}

export function readPostFiles(root = resolve(process.cwd(), 'src/content/blog')): PostFile[] {
  return walk(root)
    .sort()
    .map((file) => {
      const relativePath = relative(process.cwd(), file).split('\\').join('/');
      const source = readFileSync(file, 'utf8');
      const match = frontmatterPattern.exec(source);

      if (!match) {
        throw new Error(`${relativePath}: 缺少 frontmatter`);
      }

      const parsed: unknown = parseYaml(match[2] ?? '');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${relativePath}: frontmatter 必须是对象`);
      }

      return {
        file,
        relativePath,
        source,
        frontmatterSource: match[2] ?? '',
        frontmatter: parsed as Record<string, unknown>,
      };
    });
}

/** 读取 frontmatter 原始值，避免 YAML parser 把日期转换成 Date 后影响 ID。 */
export function getRawFrontmatterValue(frontmatterSource: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(frontmatterSource);
  if (!match) return undefined;

  return match[1]
    ?.trim()
    .replace(/\s+#.*$/, '')
    .replace(/^(['"])([\s\S]*)\1$/, '$2');
}

export function hasPostIdField(frontmatterSource: string): boolean {
  return /(^|\r?\n)postid:/.test(frontmatterSource);
}

/** 只在 date 行后插入一行，不重新序列化整份 YAML。 */
export function insertPostId(source: string, postid: string): string {
  const match = frontmatterPattern.exec(source);
  if (!match) throw new Error('缺少 frontmatter');

  const eol = match[1] ?? '\n';
  const frontmatter = match[2] ?? '';
  if (hasPostIdField(frontmatter)) return source;

  const line = `postid: ${JSON.stringify(postid)}`;
  const dateLine = /(^|\r?\n)date:[^\r\n]*/.exec(frontmatter);
  const nextFrontmatter = dateLine
    ? `${frontmatter.slice(0, dateLine.index + dateLine[0].length)}${eol}${line}${frontmatter.slice(dateLine.index + dateLine[0].length)}`
    : `${line}${eol}${frontmatter}`;

  const closeStart = match.index + match[0].length;
  return `${source.slice(0, match.index)}---${eol}${nextFrontmatter}${eol}---${source.slice(closeStart)}`;
}
