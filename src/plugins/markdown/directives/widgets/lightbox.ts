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
  'sonder-music-player__artwork',
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
  const src = img.currentSrc || img.src;
  if (!src) return false;
  if (img.closest('a')) return false;
  if (classNamesOf(img).some((name) => EXCLUDED_CLASSES.has(name))) return false;
  return isBlockContext(img);
}

function wrapImages(gallery: HTMLElement): HTMLAnchorElement[] {
  const images = Array.from(gallery.querySelectorAll('img')).filter(shouldWrap);
  return images.map((img) => {
    const anchor = document.createElement('a');
    anchor.className = 'sd-lightbox-item';
    anchor.href = img.currentSrc || img.src;
    anchor.dataset.sonderLightbox = '';
    if (img.naturalWidth > 0) {
      anchor.dataset.pswpWidth = String(img.naturalWidth);
      anchor.dataset.pswpHeight = String(img.naturalHeight);
    }
    img.replaceWith(anchor);
    anchor.append(img);
    return anchor;
  });
}

export function initLightbox() {
  const gallery = document.querySelector<HTMLElement>('.article-content');
  if (!gallery) return;

  wrapImages(gallery);

  // 视图切换后旧实例随 DOM 失效；关闭残留的打开层并重建
  if (lightbox?.pswp) lightbox.pswp.close();
  lightbox?.destroy();

  lightbox = new PhotoSwipeLightbox({
    gallery,
    children: 'a[data-sonder-lightbox]',
    pswpModule: () => import('photoswipe'),
    // 纸面主题：墨色遮罩 + 缩放过渡
    bgOpacity: 0.88,
    showHideAnimationType: 'zoom',
    zoom: false,
  });
  lightbox.init();
}
