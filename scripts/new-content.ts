import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderScaffoldTemplate } from '@navfolio/pages';
import type { NavfolioContentExtension, NavfolioScaffoldTemplateContext } from '@navfolio/pages';
import navfolioConfig from '../navfolio.config';
import { getConfiguredPageModules, getResolvedPageModuleScaffolds } from '../src/plugins/config';

interface ContentScaffold {
  command: string;
  collection: string;
  directory: string;
  defaultExtension: NavfolioContentExtension;
  template: URL;
}

const coreScaffolds = [
  {
    command: 'post',
    collection: 'blog',
    directory: 'src/content/blog',
    defaultExtension: 'md',
    template: new URL('./templates/post.md', import.meta.url),
  },
] satisfies ContentScaffold[];

const args = process.argv.slice(2);
const supportedOptions = new Set(['--', '--md', '--mdx']);
const unknownOption = args.find((arg) => arg.startsWith('--') && !supportedOptions.has(arg));

if (unknownOption) {
  console.error(`Unsupported option: ${unknownOption}`);
  process.exit(1);
}

const positionalArgs = args.filter((arg) => !supportedOptions.has(arg));
const [rawCommandArg, filenameArg, outputDirectoryArg, ...extraArgs] = positionalArgs;
const commandArg = rawCommandArg === 'blog' ? 'post' : rawCommandArg;

const scaffolds = getContentScaffolds();
const scaffold = scaffolds.find((item) => item.command === commandArg);

if (!scaffold) {
  const disabledScaffold = getDisabledModuleScaffold(commandArg);

  if (disabledScaffold) {
    printDisabledContentType(disabledScaffold.command);
  } else {
    printUnsupportedContentType(commandArg, scaffolds);
  }

  process.exit(1);
}

if (extraArgs.length > 0) {
  printTooManyArguments(scaffold.command);
  process.exit(1);
}

if (filenameArg === undefined) {
  printMissingFilename(scaffolds);
  process.exit(1);
}

const slug = normalizeFilename(filenameArg);

if (!slug) {
  console.error('Invalid filename.');
  process.exit(1);
}

const now = new Date();
const isoDate = now.toISOString();
const extension = resolveExtension(args, filenameArg, scaffold.defaultExtension);
const title = slug;
const templateContext = {
  title,
  slug,
  isoDate,
  date: isoDate.slice(0, 10),
} satisfies NavfolioScaffoldTemplateContext;
const outputDirectory = outputDirectoryArg ?? scaffold.directory;
const relativePath = path.join(outputDirectory, `${slug}.${extension}`);
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

function getContentScaffolds(): ContentScaffold[] {
  const moduleScaffolds = getResolvedPageModuleScaffolds(navfolioConfig).map((scaffold) => ({
    command: scaffold.command,
    collection: scaffold.collection,
    directory: scaffold.directory,
    defaultExtension: scaffold.defaultExtension,
    template: scaffold.template,
  }));

  return rejectDuplicateCommands([...coreScaffolds, ...moduleScaffolds]);
}

function rejectDuplicateCommands(scaffolds: ContentScaffold[]): ContentScaffold[] {
  const commandOwners = new Set<string>();

  for (const scaffold of scaffolds) {
    if (commandOwners.has(scaffold.command)) {
      throw new Error(`Duplicate content scaffold command "${scaffold.command}".`);
    }

    commandOwners.add(scaffold.command);
  }

  return scaffolds;
}

function getDisabledModuleScaffold(command: string | undefined) {
  if (!command) return undefined;

  return getConfiguredPageModules(navfolioConfig).find(
    (module) => module.enabled === false && module.scaffold?.command === command,
  )?.scaffold;
}

function resolveExtension(
  args: string[],
  filename: string,
  defaultExtension: NavfolioContentExtension,
): NavfolioContentExtension {
  if (args.includes('--md') && args.includes('--mdx')) {
    console.error('Choose only one extension option: --md or --mdx.');
    process.exit(1);
  }

  if (args.includes('--mdx')) return 'mdx';
  if (args.includes('--md')) return 'md';
  if (/\.mdx$/i.test(filename)) return 'mdx';
  if (/\.md$/i.test(filename)) return 'md';

  return defaultExtension;
}

function normalizeFilename(value: string): string {
  return value
    .trim()
    .replace(/\.(mdx?|MDX?)$/, '')
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
  context: NavfolioScaffoldTemplateContext,
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

function printMissingFilename(scaffolds: ContentScaffold[]): void {
  console.error(`Please provide a filename.

Examples:
${scaffolds.map((scaffold) => `bun run ${scaffold.command}:new my-slug`).join('\n')}`);
}

function printUnsupportedContentType(
  command: string | undefined,
  scaffolds: ContentScaffold[],
): void {
  console.error(`Unsupported content scaffold command: ${command ?? ''}

Supported commands:
${scaffolds.map((scaffold) => `- bun run ${scaffold.command}:new <filename> [output-directory]`).join('\n')}`);
}

function printDisabledContentType(command: string): void {
  console.error(`The ${command} content module is disabled in navfolio.config.ts.`);
}

function printTooManyArguments(command: string): void {
  console.error(`Too many arguments.

Usage:
bun run ${command}:new <filename> [output-directory] [--md|--mdx]`);
}
