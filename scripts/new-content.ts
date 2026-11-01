import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type ScaffoldTemplateVariable = 'title' | 'slug' | 'isoDate' | 'date';

interface ScaffoldTemplateContext {
  title: string;
  slug: string;
  isoDate: string;
  date: string;
}

interface ContentScaffold {
  command: string;
  collection: string;
  directory: string;
  template: URL;
}

const templateVariablePattern = /<%=\s*(title|slug|isoDate|date)(?:\s*\|\s*(yaml))?\s*%>/g;
const unresolvedTemplateExpressionPattern = /<%=[\s\S]*?%>/;

const scaffolds: ContentScaffold[] = [
  {
    command: 'post',
    collection: 'blog',
    directory: 'src/content/blog',
    template: new URL('./templates/post.md', import.meta.url),
  },
  {
    command: 'media',
    collection: 'media',
    directory: 'src/content/media',
    template: new URL('./templates/media.md', import.meta.url),
  },
];

const args = process.argv.slice(2);
const unknownOption = args.find((arg) => arg.startsWith('--') && arg !== '--');

if (unknownOption) {
  console.error(`Unsupported option: ${unknownOption}`);
  process.exit(1);
}

const positionalArgs = args.filter((arg) => arg !== '--');
const [rawCommandArg, filenameArg, outputDirectoryArg, ...extraArgs] = positionalArgs;
const commandArg = rawCommandArg === 'blog' ? 'post' : rawCommandArg;
const scaffold = scaffolds.find((item) => item.command === commandArg);

if (!scaffold) {
  printUnsupportedContentType(commandArg);
  process.exit(1);
}

if (extraArgs.length > 0) {
  printTooManyArguments(scaffold.command);
  process.exit(1);
}

if (filenameArg === undefined) {
  printMissingFilename();
  process.exit(1);
}

const slug = normalizeFilename(filenameArg);

if (!slug) {
  console.error('Invalid filename.');
  process.exit(1);
}

const now = new Date();
const isoDate = now.toISOString();
const title = slug;
const templateContext: ScaffoldTemplateContext = {
  title,
  slug,
  isoDate,
  date: isoDate.slice(0, 10),
};
const outputDirectory = outputDirectoryArg ?? scaffold.directory;
const relativePath = path.join(outputDirectory, `${slug}.md`);
const targetPath = path.resolve(relativePath);

if (existsSync(targetPath)) {
  console.error(`File already exists: ${relativePath}`);
  process.exit(1);
}

const template = readScaffoldTemplate(scaffold);
const content = renderContentTemplate(scaffold, template, templateContext);

mkdirSync(path.dirname(targetPath), { recursive: true });
writeFileSync(targetPath, `${content.trimEnd()}\n`, 'utf8');

console.log(`Created new ${scaffold.collection} file:`);
console.log(relativePath);

function renderScaffoldTemplate(template: string, context: ScaffoldTemplateContext): string {
  const rendered = template.replace(
    templateVariablePattern,
    (_placeholder, variable: ScaffoldTemplateVariable, filter: 'yaml' | undefined) => {
      const value = context[variable];

      return filter === 'yaml' ? JSON.stringify(value) : value;
    },
  );

  const unresolvedExpression = rendered.match(unresolvedTemplateExpressionPattern)?.[0];

  if (unresolvedExpression) {
    throw new Error(
      `Unsupported scaffold template expression ${JSON.stringify(unresolvedExpression)}. ` +
        'Supported variables are title, slug, isoDate, and date; the only supported filter is yaml.',
    );
  }

  return rendered;
}

function normalizeFilename(value: string): string {
  return value
    .trim()
    .replace(/\.md$/i, '')
    .replace(/\s+/g, '-')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/^-+|-+$/g, '');
}

function readScaffoldTemplate(scaffold: ContentScaffold): string {
  try {
    return readFileSync(scaffold.template, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Unable to read the ${scaffold.command} content template.`);
    console.error(reason);
    process.exit(1);
  }
}

function renderContentTemplate(
  scaffold: ContentScaffold,
  template: string,
  context: ScaffoldTemplateContext,
): string {
  try {
    return renderScaffoldTemplate(template, context);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Unable to render the ${scaffold.command} content template.`);
    console.error(reason);
    process.exit(1);
  }
}

function printMissingFilename(): void {
  console.error(`Please provide a filename.

Examples:
${scaffolds.map((scaffold) => `bun run ${scaffold.command}:new my-slug`).join('\n')}`);
}

function printUnsupportedContentType(command: string | undefined): void {
  console.error(`Unsupported content scaffold command: ${command ?? ''}

Supported commands:
${scaffolds.map((scaffold) => `- bun run ${scaffold.command}:new <filename> [output-directory]`).join('\n')}`);
}

function printTooManyArguments(command: string): void {
  console.error(`Too many arguments.

Usage:
bun run ${command}:new <filename> [output-directory]`);
}
