import { hasTopicOverflow } from './topic-overflow';

type GroupNavWindow = Window & {
  __navfolioGroupNavMounted?: boolean;
};

const groupNavObservers = new Set<ResizeObserver>();

function getGroupNavWindow() {
  return window as GroupNavWindow;
}

function mountCurrentGroupNav() {
  document.querySelectorAll<HTMLElement>('[data-group-nav]').forEach((nav) => {
    if (nav.dataset.groupNavBound === 'true') return;

    const toggle = nav.querySelector<HTMLButtonElement>('[data-topic-toggle]');
    const label = nav.querySelector<HTMLElement>('[data-topic-toggle-label]');
    const list = nav.querySelector<HTMLElement>('[data-topic-list]');

    if (!toggle || !list) return;

    nav.dataset.groupNavBound = 'true';

    const updateToggleState = (expanded: boolean) => {
      nav.classList.toggle('is-expanded', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));

      if (label) {
        label.textContent = expanded
          ? (toggle.dataset.collapseLabel ?? 'Collapse')
          : (toggle.dataset.expandLabel ?? 'Expand');
      }
    };

    let lastMeasuredWidth: number | undefined;

    const updateOverflow = () => {
      const currentWidth = nav.clientWidth;
      if (currentWidth === lastMeasuredWidth) return;
      lastMeasuredWidth = currentWidth;

      const wasExpanded = nav.classList.contains('is-expanded');

      toggle.hidden = true;
      nav.classList.remove('is-expanded');
      const overflows = hasTopicOverflow(list.scrollHeight, list.clientHeight);
      toggle.hidden = !overflows;
      updateToggleState(overflows && wasExpanded);
    };

    toggle.addEventListener('click', () => {
      updateToggleState(!nav.classList.contains('is-expanded'));
    });

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(list);
    groupNavObservers.add(observer);
    updateOverflow();
  });
}

function disconnectGroupNavObservers() {
  groupNavObservers.forEach((observer) => observer.disconnect());
  groupNavObservers.clear();
}

export function mountGroupNav() {
  const groupNavWindow = getGroupNavWindow();

  if (!groupNavWindow.__navfolioGroupNavMounted) {
    groupNavWindow.__navfolioGroupNavMounted = true;
    document.addEventListener('astro:page-load', mountCurrentGroupNav);
    document.addEventListener('astro:before-swap', disconnectGroupNavObservers);
  }

  mountCurrentGroupNav();
}
