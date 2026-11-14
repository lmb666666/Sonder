import { initTechPhysics } from './tech-stack-physics';

export function initAboutPage(): () => void {
  const page = document.querySelector<HTMLElement>('[data-about-page]');
  if (!page) return () => undefined;

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(page.querySelectorAll<HTMLElement>('[data-about-section]'));

  if (sections.length > 0) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('about-reveal', 'is-in'));
    } else {
      sections.forEach((section) => section.classList.add('about-reveal'));
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
      sections.forEach((section) => observer.observe(section));
      cleanups.push(() => observer.disconnect());
    }
  }

  initTechPhysics(page, controller, cleanups, reducedMotion);

  return () => {
    controller.abort();
    cleanups.forEach((cleanup) => cleanup());
  };
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
