declare global {
  interface Window {
    __navfolioZoomableImagesReady?: boolean;
  }
}

type LightboxElements = {
  root: HTMLDialogElement;
  image: HTMLImageElement;
  closeButton: HTMLButtonElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
};

let lightboxElements: LightboxElements | undefined;
let previousActiveElement: HTMLElement | undefined;
let activeGallery: HTMLImageElement[] = [];
let activeGalleryIndex = -1;

const LIGHTBOX_SELECTOR = '[data-zoomable-lightbox]';
const LIGHTBOX_IMAGE_SELECTOR = '[data-zoomable-lightbox-image]';
const LIGHTBOX_CLOSE_SELECTOR = '[data-zoomable-lightbox-close]';
const LIGHTBOX_PREV_SELECTOR = '[data-zoomable-lightbox-prev]';
const LIGHTBOX_NEXT_SELECTOR = '[data-zoomable-lightbox-next]';
const ZOOMABLE_TARGET_SELECTOR = '[data-zoomable-image-target]';
const ZOOMABLE_GALLERY_SELECTOR = '[data-zoomable-gallery], astro-carousel';

const isPlainMarkdownImage = (target: HTMLImageElement) =>
  Boolean(target.closest('.article-content')) &&
  !target.closest('[data-zoomable-image]') &&
  !target.closest('a[href]') &&
  (target.parentElement?.matches('.article-content > p, .article-content figure') ?? false);

const getZoomTarget = (target: EventTarget | null): HTMLImageElement | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const wrappedImage = target
    .closest('[data-zoomable-image]')
    ?.querySelector(ZOOMABLE_TARGET_SELECTOR);

  if (wrappedImage instanceof HTMLImageElement && !wrappedImage.closest('a[href]')) {
    return wrappedImage;
  }

  if (target instanceof HTMLImageElement && isPlainMarkdownImage(target)) {
    return target;
  }

  return undefined;
};

const getGalleryImages = (sourceImage: HTMLImageElement) => {
  const galleryRoot = sourceImage.closest(ZOOMABLE_GALLERY_SELECTOR);

  if (!galleryRoot) {
    return { images: [sourceImage], index: 0 };
  }

  const images = Array.from(
    galleryRoot.querySelectorAll<HTMLImageElement>(
      `${ZOOMABLE_TARGET_SELECTOR}, [data-carousel-slide] img`,
    ),
  )
    .filter((image) => !image.closest('a[href]'))
    .filter((image) => image.currentSrc || image.src);
  const index = images.indexOf(sourceImage);

  if (index === -1) {
    return { images: [sourceImage], index: 0 };
  }

  return { images, index };
};

const syncGalleryControls = () => {
  if (!lightboxElements) {
    return;
  }

  const hasGalleryControls = activeGallery.length > 1;

  lightboxElements.root.dataset.hasGallery = hasGalleryControls ? 'true' : 'false';
  lightboxElements.prevButton.hidden = !hasGalleryControls;
  lightboxElements.nextButton.hidden = !hasGalleryControls;
};

const setPreviewImage = (sourceImage: HTMLImageElement) => {
  if (!lightboxElements) {
    return;
  }

  lightboxElements.image.src = sourceImage.currentSrc || sourceImage.src;
  lightboxElements.image.alt = sourceImage.alt || '';

  if (sourceImage.title) {
    lightboxElements.image.title = sourceImage.title;
  } else {
    lightboxElements.image.removeAttribute('title');
  }
};

const movePreview = (offset: number) => {
  if (!lightboxElements || activeGallery.length <= 1) {
    return;
  }

  activeGalleryIndex = (activeGalleryIndex + offset + activeGallery.length) % activeGallery.length;
  setPreviewImage(activeGallery[activeGalleryIndex]);
};

const closePreview = () => {
  const lightbox = getLightbox();

  if (!lightbox) {
    return;
  }

  lightbox.root.classList.remove('is-open');
  lightbox.root.close();
  lightbox.image.removeAttribute('src');
  lightbox.image.alt = '';
  lightbox.image.removeAttribute('title');
  activeGallery = [];
  activeGalleryIndex = -1;
  syncGalleryControls();
  previousActiveElement?.focus({ preventScroll: true });
  previousActiveElement = undefined;
};

const getLightbox = (): LightboxElements | undefined => {
  if (lightboxElements?.root.isConnected) {
    return lightboxElements;
  }

  const root = document.querySelector(LIGHTBOX_SELECTOR);

  if (!(root instanceof HTMLDialogElement)) {
    return undefined;
  }

  const image = root.querySelector(LIGHTBOX_IMAGE_SELECTOR);
  const closeButton = root.querySelector(LIGHTBOX_CLOSE_SELECTOR);
  const prevButton = root.querySelector(LIGHTBOX_PREV_SELECTOR);
  const nextButton = root.querySelector(LIGHTBOX_NEXT_SELECTOR);

  if (
    !(image instanceof HTMLImageElement) ||
    !(closeButton instanceof HTMLButtonElement) ||
    !(prevButton instanceof HTMLButtonElement) ||
    !(nextButton instanceof HTMLButtonElement)
  ) {
    return undefined;
  }

  lightboxElements = { root, image, closeButton, prevButton, nextButton };
  return lightboxElements;
};

const openPreview = (sourceImage: HTMLImageElement) => {
  const lightbox = getLightbox();

  if (!lightbox) {
    return;
  }

  const { root, closeButton } = lightbox;
  const gallery = getGalleryImages(sourceImage);

  previousActiveElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  activeGallery = gallery.images;
  activeGalleryIndex = gallery.index;
  setPreviewImage(sourceImage);
  syncGalleryControls();

  root.classList.add('is-open');
  if (!root.open) {
    root.showModal();
  }
  closeButton.focus({ preventScroll: true });
};

const handleLightboxClick = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(LIGHTBOX_CLOSE_SELECTOR)) {
    closePreview();
    return true;
  }

  if (target.closest(LIGHTBOX_PREV_SELECTOR)) {
    movePreview(-1);
    return true;
  }

  if (target.closest(LIGHTBOX_NEXT_SELECTOR)) {
    movePreview(1);
    return true;
  }

  const lightbox = getLightbox();

  if (lightbox && target === lightbox.root) {
    closePreview();
    return true;
  }

  return false;
};

export const initZoomableImages = () => {
  if (window.__navfolioZoomableImagesReady) {
    return;
  }

  window.__navfolioZoomableImagesReady = true;

  document.addEventListener('click', (event) => {
    if (handleLightboxClick(event.target)) {
      return;
    }

    const image = getZoomTarget(event.target);

    if (image) {
      openPreview(image);
    }
  });

  document.addEventListener('dragstart', (event) => {
    const lightbox = getLightbox();

    if (
      lightbox?.root.open &&
      event.target instanceof Node &&
      lightbox.root.contains(event.target)
    ) {
      event.preventDefault();
      return;
    }

    if (getZoomTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', (event) => {
    const lightbox = getLightbox();
    const isOpen = lightbox?.root.open;

    if (event.key === 'Escape' && isOpen) {
      closePreview();
      return;
    }

    if (isOpen) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        movePreview(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        movePreview(1);
        return;
      }
    }

    const image = getZoomTarget(event.target);

    if (!image || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    openPreview(image);
  });
};

export {};
