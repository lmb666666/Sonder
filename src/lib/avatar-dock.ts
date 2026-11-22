interface DockState {
  x: number;
  y: number;
  scale: number;
}

const MOBILE_DOCK_SIZE = 36;
const DESKTOP_DOCK_SIZE = 38;
const DOCK_THRESHOLD = 0.999;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

/**
 * Scroll-driven avatar docking, modelled on krisyan's direct scale-down:
 * the image follows the scroll one-to-one, then hands over to the real nav
 * avatar once it is exactly in place. There is no spring or opacity crossfade,
 * so the hand-off stays crisp and does not flash.
 */
export function initAvatarDock(): () => void {
  const header = document.querySelector<HTMLElement>('.blog-top-nav');
  const slot = document.querySelector<HTMLElement>('[data-avatar-slot]');
  const navAvatar = document.querySelector<HTMLElement>('[data-avatar-target]');

  if (
    !header ||
    !slot ||
    header.dataset.navStyle !== 'pill' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    (slot.hasAttribute('data-avatar-dock-mobile') &&
      !window.matchMedia('(max-width: 720px)').matches)
  ) {
    return () => undefined;
  }

  document.querySelector('[data-avatar-dock]')?.remove();

  const clone = slot.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-avatar-slot');
  clone.removeAttribute('id');
  clone.setAttribute('data-avatar-dock', '');
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '49',
    margin: '0',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    visibility: 'hidden',
    willChange: 'transform, opacity',
  });
  document.body.append(clone);

  const previousSlotOpacity = slot.style.opacity;
  const previousNavAvatar = navAvatar
    ? {
        opacity: navAvatar.style.opacity,
        pointerEvents: navAvatar.style.pointerEvents,
        tabIndex: navAvatar.getAttribute('tabindex'),
        ariaHidden: navAvatar.getAttribute('aria-hidden'),
      }
    : null;

  let baseWidth = 0;
  let baseHeight = 0;
  let slotTop = 0;
  let slotLeft = 0;
  let dockLeft = 0;
  let dockTop = 0;
  let travel = 1;
  let dockScale = 1;
  let raf = 0;
  let state: DockState = { x: 0, y: 0, scale: 1 };

  const measure = () => {
    const slotRect = slot.getBoundingClientRect();
    if (slotRect.width < 1 || slotRect.height < 1) return false;

    baseWidth = slotRect.width;
    baseHeight = slotRect.height;
    slotTop = slotRect.top + window.scrollY;
    slotLeft = slotRect.left;

    const headerRect = header.getBoundingClientRect();
    const dockSize = window.matchMedia('(max-width: 720px)').matches
      ? MOBILE_DOCK_SIZE
      : DESKTOP_DOCK_SIZE;
    dockLeft = headerRect.left;
    // offsetTop ignores the hide transform, keeping the target stable even
    // when a resize happens while the nav is translated off-screen.
    dockTop = header.offsetTop + (headerRect.height - dockSize) / 2;
    travel = Math.max(1, slotTop - dockTop);
    dockScale = dockSize / baseWidth;

    clone.style.width = `${baseWidth}px`;
    clone.style.height = `${baseHeight}px`;
    return true;
  };

  const update = () => {
    const progress = clamp(window.scrollY / travel, 0, 1);
    const visible = header.dataset.navHidden !== 'true';
    const docked = Boolean(navAvatar) && visible && progress >= DOCK_THRESHOLD;

    state = {
      x: mix(slotLeft, dockLeft, progress),
      y: mix(slotTop - window.scrollY, dockTop, progress),
      scale: mix(1, dockScale, progress),
    };

    clone.style.transform = `translate3d(${state.x.toFixed(3)}px, ${state.y.toFixed(3)}px, 0) scale(${state.scale.toFixed(4)})`;
    clone.style.opacity = visible && !docked ? '1' : '0';

    if (navAvatar) {
      navAvatar.style.opacity = docked ? '1' : '0';
      navAvatar.style.pointerEvents = docked ? 'auto' : 'none';
      if (docked) {
        navAvatar.removeAttribute('aria-hidden');
        navAvatar.tabIndex = 0;
      } else {
        navAvatar.setAttribute('aria-hidden', 'true');
        navAvatar.tabIndex = -1;
      }
    }
  };

  const schedule = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };

  const onScroll = () => schedule();
  const onNavStateChange = () => schedule();

  const onResize = () => {
    if (!measure()) return;
    update();
  };

  if (!measure()) {
    clone.remove();
    return () => undefined;
  }

  update();
  clone.style.visibility = 'visible';
  slot.style.opacity = '0';

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(slot);
  resizeObserver.observe(header);

  const mutationObserver = new MutationObserver(onNavStateChange);
  mutationObserver.observe(header, {
    attributes: true,
    attributeFilter: ['data-nav-hidden'],
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    if (raf) window.cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    slot.style.opacity = previousSlotOpacity;
    if (navAvatar && previousNavAvatar) {
      navAvatar.style.opacity = previousNavAvatar.opacity;
      navAvatar.style.pointerEvents = previousNavAvatar.pointerEvents;
      if (previousNavAvatar.tabIndex === null) navAvatar.removeAttribute('tabindex');
      else navAvatar.setAttribute('tabindex', previousNavAvatar.tabIndex);
      if (previousNavAvatar.ariaHidden === null) navAvatar.removeAttribute('aria-hidden');
      else navAvatar.setAttribute('aria-hidden', previousNavAvatar.ariaHidden);
    }
    clone.remove();
  };
}
