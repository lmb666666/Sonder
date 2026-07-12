type GroupNavWindow = Window & {
  __navfolioGroupNavMounted?: boolean;
};

function getGroupNavWindow() {
  return window as GroupNavWindow;
}

function mountCurrentGroupNav() {
  document.querySelectorAll<HTMLElement>('[data-group-nav]').forEach((nav) => {
    if (nav.dataset.groupNavBound === 'true') return;

    const toggle = nav.querySelector<HTMLButtonElement>('[data-topic-toggle]');
    const label = nav.querySelector<HTMLElement>('[data-topic-toggle-label]');

    if (!toggle) return;

    nav.dataset.groupNavBound = 'true';

    toggle.addEventListener('click', () => {
      const expanded = nav.classList.toggle('is-expanded');

      toggle.setAttribute('aria-expanded', String(expanded));

      if (label) {
        label.textContent = expanded
          ? (toggle.dataset.collapseLabel ?? 'Collapse')
          : (toggle.dataset.expandLabel ?? 'Expand');
      }
    });
  });
}

export function mountGroupNav() {
  const groupNavWindow = getGroupNavWindow();

  if (!groupNavWindow.__navfolioGroupNavMounted) {
    groupNavWindow.__navfolioGroupNavMounted = true;
    document.addEventListener('astro:page-load', mountCurrentGroupNav);
  }

  mountCurrentGroupNav();
}
