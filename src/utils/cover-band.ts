import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import sharp from 'sharp';

import type { ImageMetadata } from 'astro';

export interface CoverBand {
  /** 封面底部区域的主色，作磨砂文字条的染色基底。 */
  band: string;
  /** 按主色亮度自动选择的文字色：深色纸墨或纸白。 */
  fg: string;
}

const FG_DARK = '#272d28';
const FG_LIGHT = '#fffefb';

const bandCache = new Map<string, CoverBand | null>();
const heroPathCache = new Map<string, string | null>();

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * 渲染期拿到的 ImageMetadata.src 是构建产物路径（/_astro/...），
 * 原始路径要从文章 frontmatter 里回读（构建期一次读取并缓存）。
 */
async function resolveHeroSource(
  heroImage: ImageMetadata | string,
  filePath?: string,
): Promise<string | null> {
  if (typeof heroImage === 'string') return null;
  if (!filePath) return null;

  const cached = heroPathCache.get(filePath);
  if (cached !== undefined) return cached;

  let heroPath: string | null = null;
  try {
    const text = await readFile(join(process.cwd(), filePath), 'utf8');
    const match = text.match(/^heroImage:\s*['"]?([^'"\n]+?)['"]?\s*$/m);
    if (match) {
      const raw = match[1].trim();
      heroPath = raw.startsWith('/')
        ? join(process.cwd(), raw)
        : join(process.cwd(), dirname(filePath), raw);
    }
  } catch {
    heroPath = null;
  }

  heroPathCache.set(filePath, heroPath);
  return heroPath;
}

/**
 * 构建时读取封面图片底部 30% 区域的主色（与磨砂文字条覆盖的区域对应），
 * 并按其亮度决定文字用深色还是白色（krisyan 同款自适应）。
 * 远程封面图或读取失败返回 null，CSS 走默认深色磨砂 + 纸白文字。
 */
export async function getCoverBand(
  heroImage: ImageMetadata | string,
  filePath?: string,
): Promise<CoverBand | null> {
  if (typeof heroImage === 'string') return null;

  const cacheKey = filePath ?? heroImage.src;
  const cached = bandCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let band: CoverBand | null = null;
  const source = await resolveHeroSource(heroImage, filePath);
  if (source) {
    try {
      const image = sharp(source);
      const { width, height } = await image.metadata();
      if (width && height) {
        const stripTop = Math.floor(height * 0.68);
        const stats = await image
          .extract({ left: 0, top: stripTop, width, height: height - stripTop })
          .stats();
        const { r, g, b } = stats.dominant;
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        band = {
          band: hex,
          fg: relativeLuminance({ r, g, b }) > 0.55 ? FG_DARK : FG_LIGHT,
        };
      }
    } catch (error) {
      console.warn('[cover-band]', source, error instanceof Error ? error.message : error);
    }
  }

  bandCache.set(cacheKey, band);
  return band;
}
