import { initTechPhysics } from './tech-stack-physics';

export function initAboutPage(): () => void {
  const page = document.querySelector<HTMLElement>('[data-about-page]');
  if (!page) return () => undefined;

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const records = Array.from(page.querySelectorAll<HTMLElement>('[data-about-record]'));

  if (records.length > 0) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      records.forEach((record) => record.classList.add('about-reveal', 'is-in'));
    } else {
      records.forEach((record) => record.classList.add('about-reveal'));
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
      );
      records.forEach((record) => observer.observe(record));
      cleanups.push(() => observer.disconnect());
    }
  }

  initIndex(page, records, controller, cleanups);
  initTimeline(page, controller);
  initTechPhysics(page, controller, cleanups, reducedMotion);

  return () => {
    controller.abort();
    cleanups.forEach((cleanup) => cleanup());
  };
}

function initIndex(
  page: HTMLElement,
  records: HTMLElement[],
  controller: AbortController,
  cleanups: Array<() => void>,
) {
  const links = Array.from(page.querySelectorAll<HTMLAnchorElement>('[data-about-index-link]'));
  if (links.length === 0 || records.length === 0) return;

  const setActive = (id: string) => {
    links.forEach((link) => {
      if (link.dataset.target === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  setActive(records[0]?.id ?? '');

  links.forEach((link) => {
    link.addEventListener(
      'click',
      () => {
        const target = link.dataset.target;
        if (target) setActive(target);
      },
      { signal: controller.signal },
    );
  });

  let frame = 0;
  const updateActive = () => {
    frame = 0;
    const line = window.innerHeight * 0.35;
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = records[0];
    if (atBottom) {
      current = records[records.length - 1];
    } else {
      for (const record of records) {
        if (record.getBoundingClientRect().top <= line) current = record;
      }
    }
    if (current) setActive(current.id);
  };
  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateActive);
  };

  updateActive();
  window.addEventListener('scroll', onScroll, { passive: true, signal: controller.signal });
  cleanups.push(() => {
    if (frame) window.cancelAnimationFrame(frame);
  });
}

function initTimeline(page: HTMLElement, controller: AbortController) {
  const timeline = page.querySelector<HTMLElement>('[data-about-timeline]');
  if (!timeline) return;

  const bars = new Map<string, HTMLElement>();
  timeline.querySelectorAll<HTMLElement>('[data-timeline-bar]').forEach((bar) => {
    const key = bar.dataset.timelineBar;
    if (key) bars.set(key, bar);
  });

  timeline.querySelectorAll<HTMLElement>('[data-timeline-event]').forEach((item) => {
    const bar = bars.get(item.dataset.timelineEvent ?? '');
    if (!bar) return;
    const setActive = (active: boolean) => {
      item.classList.toggle('is-active', active);
      bar.classList.toggle('is-active', active);
    };
    item.addEventListener('pointerenter', () => setActive(true), {
      signal: controller.signal,
    });
    item.addEventListener('pointerleave', () => setActive(false), {
      signal: controller.signal,
    });
  });
}

let cleanup: (() => void) | undefined;

const boot = () => {
  cleanup?.();
  cleanup = initAboutPage();
};

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = undefined;
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
