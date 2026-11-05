/**
 * 文章图片灯箱：PhotoSwipe 5 动态加载（首次交互才拉取主模块）。
 *
 * 包装在运行时完成（rehypeImages 之后图片才拿到最终地址与尺寸）：
 * - 块级图片（独立成段 / grid、轮播、媒体架等容器内）包进 <a data-sonder-lightbox>，
 *   用 img.currentSrc 与 naturalWidth/Height 标注尺寸；
 * - 排除链接内图片（点击语义是跳转）、组件内部装饰图、与文字混排的行内图。
 * 打开体验：缩略图位缩放动画、移动端捏合缩放、esc/点背景关闭、方向键翻页。
 */
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

let lightbox: PhotoSwipeLightbox | undefined;

/** 组件内部的装饰图片，一律不进灯箱 */
const EXCLUDED_CLASSES = new Set([
  'sd-badge-icon',
  'sd-github-icon',
  'sd-link-card-icon',
  'friend-link-card__background',
  'sonder-audio-player__artwork',
]);

const BLOCK_PARENTS = new Set(['p', 'figure', 'div', 'section', 'li']);

function classNamesOf(element: Element): string[] {
  return Array.from(element.classList);
}

function isBlockContext(img: HTMLImageElement): boolean {
  const parent = img.parentElement;
  if (!parent || !BLOCK_PARENTS.has(parent.tagName.toLowerCase())) return false;
  if (parent.tagName === 'P') {
    // 独立成段：段落里除这张图只允许空白文本
    return Array.from(parent.childNodes).every(
      (node) => node === img || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
    );
  }
  return true;
}

function shouldWrap(img: HTMLImageElement): boolean {
  const src = img.getAttribute('src');
  if (!src) return false;
  if (img.closest('a')) return false;
  if (classNamesOf(img).some((name) => EXCLUDED_CLASSES.has(name))) return false;
  return isBlockContext(img);
}

function wrapImages(gallery: HTMLElement): HTMLAnchorElement[] {
  const images = Array.from(gallery.querySelectorAll('img')).filter(shouldWrap);
  const label = gallery.dataset.sonderLightboxLabel || 'View image';
  return images.map((img) => {
    const anchor = document.createElement('a');
    anchor.className = 'sd-lightbox-item';
    anchor.setAttribute('aria-label', img.alt ? `${label}: ${img.alt}` : label);
    // 全尺寸 src（Astro 处理后的原图），而非 currentSrc——
    // currentSrc 随版面宽度选中的是缩小变体，全屏看会糊
    anchor.href = img.getAttribute('src') ?? '';
    anchor.dataset.sonderLightbox = '';
    // 尺寸标注优先级：构建期写入的 width/height 属性（本地图必有）
    // > 已加载的 naturalWidth；外链图两者皆无，点击时探测
    const width =
      img.getAttribute('width') ?? (img.naturalWidth > 0 ? String(img.naturalWidth) : null);
    const height =
      img.getAttribute('height') ?? (img.naturalHeight > 0 ? String(img.naturalHeight) : null);
    if (width && height) {
      anchor.dataset.pswpWidth = width;
      anchor.dataset.pswpHeight = height;
    }
    img.replaceWith(anchor);
    anchor.append(img);
    return anchor;
  });
}

export function initLightbox() {
  const gallery = document.querySelector<HTMLElement>('[data-sonder-content]');
  if (!gallery) return;

  wrapImages(gallery);

  // 视图切换后旧实例随 DOM 失效；关闭残留的打开层并重建
  if (lightbox?.pswp) lightbox.pswp.close();
  lightbox?.destroy();

  lightbox = new PhotoSwipeLightbox({
    gallery,
    children: 'a[data-sonder-lightbox]',
    pswpModule: () => import('photoswipe'),
    // 其余保持 PhotoSwipe 原版观感（纯黑遮罩、原生控件、默认动画），
    // 只把图片默认尺寸收小：原生 paddingFn 四周留白，图片约占视口 86%。
    // 注意必须用 paddingFn——它参与 PS5 的居中计算；getViewportSizeFn
    // 只缩可用区不改偏移，会把图锚死在左上角。
    paddingFn: (viewportSize) => {
      const x = Math.min(120, Math.max(16, Math.round(viewportSize.x * 0.07)));
      const y = Math.min(120, Math.max(16, Math.round(viewportSize.y * 0.07)));
      return { top: y, bottom: y, left: x, right: x };
    },
  });
  lightbox.init();
}
