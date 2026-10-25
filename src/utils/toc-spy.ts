type TocLink = HTMLAnchorElement;
type TocRoot = HTMLElement;

type TocWindow = Window & {
  __sonderTocSpyCleanup?: () => void;
  __sonderTocSpyEvents?: boolean;
  __sonderTocSpyPageKey?: string;
};

import { buildHashIdCandidates, normalizeHash } from './toc-hash';

const getTocRoots = (): TocRoot[] =>
  Array.from(document.querySelectorAll<TocRoot>('[data-toc-root]'));

const getTocLinks = (root?: ParentNode): TocLink[] => {
  const scope = root ?? document;

  return Array.from(scope.querySelectorAll<TocLink>('[data-toc-link]')).filter((link) =>
    getNormalizedLinkHash(link).startsWith('#'),
  );
};

const getNormalizedLinkHash = (link: TocLink): string =>
  normalizeHash(link.dataset.tocHash || link.getAttribute('href') || link.hash || '');

const getSectionFromHash = (hash: string): HTMLElement | null => {
  const normalizedHash = normalizeHash(hash);
  if (!normalizedHash) {
    return null;
  }

  const idCandidates = buildHashIdCandidates(normalizedHash);

  for (const id of idCandidates) {
    const section = document.getElementById(id);
    if (section) {
      return section;
    }
  }

  return null;
};

const setBranchExpanded = (item: HTMLElement, expanded: boolean): void => {
  item.dataset.tocExpanded = String(expanded);

  const toggle = item.querySelector<HTMLButtonElement>(':scope > .toc-row [data-toc-toggle]');
  if (!toggle) {
    return;
  }

  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? 'Collapse section' : 'Expand section');
};

const expandLinkAncestors = (link: TocLink): void => {
  let parent = link.parentElement?.closest<HTMLElement>('.toc-tree-item[data-toc-expanded]');

  while (parent) {
    setBranchExpanded(parent, true);
    parent =
      parent.parentElement?.closest<HTMLElement>('.toc-tree-item[data-toc-expanded]') ?? null;
  }
};

const keepLinkVisible = (link: TocLink): void => {
  const scrollArea = link.closest<HTMLElement>('[data-toc-scroll]');
  if (!scrollArea || scrollArea.scrollHeight <= scrollArea.clientHeight) {
    return;
  }

  const style = window.getComputedStyle(scrollArea);
  if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden') {
    return;
  }

  const linkRect = link.getBoundingClientRect();
  const areaRect = scrollArea.getBoundingClientRect();
  const relativeTop = linkRect.top - areaRect.top + scrollArea.scrollTop;
  const itemCenter = relativeTop + linkRect.height / 2;
  const containerCenter = scrollArea.scrollTop + scrollArea.clientHeight / 2;

  // 活动项进入容器底部区域后，把它拉回中央；顶部同理。
  if (Math.abs(itemCenter - containerCenter) <= scrollArea.clientHeight * 0.25) {
    return;
  }

  const targetScrollTop = Math.max(
    0,
    Math.min(
      scrollArea.scrollHeight - scrollArea.clientHeight,
      itemCenter - scrollArea.clientHeight / 2,
    ),
  );

  if (Math.abs(targetScrollTop - scrollArea.scrollTop) > 1) {
    scrollArea.scrollTo({
      top: targetScrollTop,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
};

const getSections = (): HTMLElement[] => {
  const sectionIds = new Set<string>();
  const uniqueHashes = new Set(
    getTocLinks()
      .map((link) => getNormalizedLinkHash(link))
      .filter(Boolean),
  );

  return Array.from(uniqueHashes)
    .map((hash) => getSectionFromHash(hash))
    .filter((section): section is HTMLElement => {
      if (!section) {
        return false;
      }

      if (sectionIds.has(section.id)) {
        return false;
      }

      sectionIds.add(section.id);
      return true;
    });
};

const setActiveLink = (activeHash: string): void => {
  const normalizedActiveHash = normalizeHash(activeHash);

  for (const root of getTocRoots()) {
    const links = getTocLinks(root);
    const activeIndex = links.findIndex(
      (link) => getNormalizedLinkHash(link) === normalizedActiveHash,
    );

    for (const [index, link] of links.entries()) {
      const state =
        activeIndex < 0
          ? 'future'
          : index < activeIndex
            ? 'past'
            : index > activeIndex
              ? 'future'
              : 'active';
      const isActive = state === 'active';

      link.dataset.state = state;
      link.classList.toggle('active', isActive);
      link.classList.toggle('past', state === 'past');
      link.classList.toggle('future', state === 'future');

      if (isActive) {
        link.setAttribute('aria-current', 'true');
        expandLinkAncestors(link);
        keepLinkVisible(link);
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }
};

const initBranchToggles = (signal: AbortSignal): void => {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-toc-toggle]')) {
    if (toggle.dataset.tocToggleReady) {
      continue;
    }

    const item = toggle.closest<HTMLElement>('.toc-tree-item[data-toc-expanded]');
    if (!item) {
      continue;
    }

    toggle.dataset.tocToggleReady = 'true';
    toggle.addEventListener(
      'click',
      () => {
        const expanded = item.dataset.tocExpanded === 'true';

        setBranchExpanded(item, !expanded);
      },
      { signal },
    );
  }
};

const initSonderToc = (): (() => void) | null => {
  if (getTocLinks().length === 0) {
    return null;
  }

  const controller = new AbortController();
  const { signal } = controller;
  const sections = getSections();
  let activeHash = '';
  let ticking = false;
  let freezeActiveFromScroll = false;
  let observer: IntersectionObserver | null = null;
  initBranchToggles(signal);

  const setActiveByHash = (hash: string): boolean => {
    const section = getSectionFromHash(hash);
    if (!section) {
      return false;
    }

    const sectionHash = normalizeHash(`#${section.id}`);
    if (!sectionHash) {
      return false;
    }

    activeHash = sectionHash;
    setActiveLink(activeHash);
    return true;
  };

  const computeActiveHash = (): string => {
    if (sections.length === 0) {
      return '';
    }

    const activationOffset = 120;
    const current =
      sections
        .filter((section) => section.getBoundingClientRect().top <= activationOffset)
        .at(-1) ?? sections[0];
    if (!current) {
      return '';
    }

    return normalizeHash(`#${current.id}`);
  };

  const updateActiveSection = () => {
    ticking = false;

    const nextActiveHash = computeActiveHash();
    if (!nextActiveHash || nextActiveHash === activeHash) {
      return;
    }

    activeHash = nextActiveHash;
    setActiveLink(activeHash);
  };

  const scheduleUpdateActiveSection = () => {
    if (freezeActiveFromScroll) {
      return;
    }

    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateActiveSection);
  };

  const scrollToHeading = (hash: string): void => {
    const section = getSectionFromHash(hash);
    if (!section) {
      return;
    }

    const headerOffset = 80;
    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });

    activeHash = normalizeHash(`#${section.id}`);
    setActiveLink(activeHash);
  };

  const unlockActiveFromScroll = () => {
    if (!freezeActiveFromScroll) {
      return;
    }

    freezeActiveFromScroll = false;
    scheduleUpdateActiveSection();
  };

  const onKeydownUnlock = (event: KeyboardEvent) => {
    const scrollKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      'Space',
    ]);

    if (scrollKeys.has(event.code) || scrollKeys.has(event.key)) {
      unlockActiveFromScroll();
    }
  };

  for (const link of getTocLinks()) {
    link.addEventListener(
      'click',
      (event: MouseEvent) => {
        const normalizedHash = getNormalizedLinkHash(link);
        if (!normalizedHash) {
          return;
        }

        event.preventDefault();
        history.pushState(null, '', normalizedHash);
        freezeActiveFromScroll = true;
        expandLinkAncestors(link);
        scrollToHeading(normalizedHash);
      },
      { signal },
    );
  }

  const supportsIntersectionObserver = typeof IntersectionObserver === 'function';

  if (supportsIntersectionObserver) {
    observer = new IntersectionObserver(
      () => {
        scheduleUpdateActiveSection();
      },
      {
        root: null,
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0,
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }
  } else {
    window.addEventListener('scroll', scheduleUpdateActiveSection, { passive: true, signal });
  }

  const onPopstate = () => {
    freezeActiveFromScroll = false;

    if (!setActiveByHash(window.location.hash)) {
      scheduleUpdateActiveSection();
    }
  };
  const onHashchange = () => {
    freezeActiveFromScroll = false;

    if (!setActiveByHash(window.location.hash)) {
      scheduleUpdateActiveSection();
    }
  };

  window.addEventListener('resize', scheduleUpdateActiveSection, { passive: true, signal });
  window.addEventListener('wheel', unlockActiveFromScroll, { passive: true, signal });
  window.addEventListener('touchstart', unlockActiveFromScroll, { passive: true, signal });
  window.addEventListener('keydown', onKeydownUnlock, { signal });
  window.addEventListener('popstate', onPopstate, { signal });
  window.addEventListener('hashchange', onHashchange, { signal });

  if (!setActiveByHash(window.location.hash)) {
    scheduleUpdateActiveSection();
  }

  return () => {
    observer?.disconnect();
    controller.abort();
  };
};

export const mountSonderTocSpy = (): void => {
  const tocWindow = window as TocWindow;
  const cleanupCurrent = () => {
    tocWindow.__sonderTocSpyCleanup?.();
    tocWindow.__sonderTocSpyCleanup = undefined;
    tocWindow.__sonderTocSpyPageKey = undefined;
  };

  const mountCurrentPage = () => {
    const pageKey = `${window.location.pathname}${window.location.search}`;
    if (tocWindow.__sonderTocSpyPageKey === pageKey) {
      return;
    }

    cleanupCurrent();

    const cleanup = initSonderToc();
    if (cleanup) {
      tocWindow.__sonderTocSpyCleanup = cleanup;
      tocWindow.__sonderTocSpyPageKey = pageKey;
    }
  };

  if (!tocWindow.__sonderTocSpyEvents) {
    tocWindow.__sonderTocSpyEvents = true;
    document.addEventListener('astro:page-load', mountCurrentPage);
    document.addEventListener('astro:before-swap', cleanupCurrent);
    window.addEventListener('pagehide', cleanupCurrent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCurrentPage, { once: true });
  } else {
    mountCurrentPage();
  }
};
