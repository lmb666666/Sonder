/**
 * 动态图片灯箱：与文章灯箱共用 PhotoSwipe 5 的原版观感。
 *
 * 动态图片在服务端/客户端都包在 [data-moment-image] 链接里，
 * 尺寸在图片加载后回填到 data-pswp-width/height。
 */
import PhotoSwipeLightbox from 'photoswipe/lightbox';

let lightbox: PhotoSwipeLightbox | undefined;

function applyDimensions(img: HTMLImageElement) {
  const anchor = img.closest<HTMLAnchorElement>('[data-moment-image]');
  if (!anchor || img.naturalWidth === 0 || img.naturalHeight === 0) return;
  anchor.dataset.pswpWidth = String(img.naturalWidth);
  anchor.dataset.pswpHeight = String(img.naturalHeight);
}

export function initMomentsLightbox() {
  const gallery = document.querySelector<HTMLElement>('[data-moments-list]');
  if (!gallery) return;

  gallery.querySelectorAll<HTMLImageElement>('img[data-moment-thumb]').forEach((img) => {
    if (img.complete) applyDimensions(img);
  });

  // load 不冒泡，用捕获阶段监听后续追加的 Echo 图片。
  if (gallery.dataset.lightboxBound !== '1') {
    gallery.dataset.lightboxBound = '1';
    gallery.addEventListener(
      'load',
      (event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement && target.matches('img[data-moment-thumb]')) {
          applyDimensions(target);
        }
      },
      true,
    );
  }

  if (lightbox?.pswp) lightbox.pswp.close();
  lightbox?.destroy();

  lightbox = new PhotoSwipeLightbox({
    gallery,
    children: 'a[data-moment-image]',
    pswpModule: () => import('photoswipe'),
    // 与文章灯箱同一套留白：图片约占视口 86%。
    paddingFn: (viewportSize) => {
      const x = Math.min(120, Math.max(16, Math.round(viewportSize.x * 0.07)));
      const y = Math.min(120, Math.max(16, Math.round(viewportSize.y * 0.07)));
      return { top: y, bottom: y, left: x, right: x };
    },
  });
  lightbox.init();
}
