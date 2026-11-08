import type { SiteConfig } from '../config';
import { createI18n, normalizeLocale, type I18nMessages } from '../i18n';
import type { ElapsedPart, TimeUnit } from './time';
import en from '../i18n/en.json';
import zhCN from '../i18n/zh-CN.json';
import zhTW from '../i18n/zh-TW.json';

export const defaultUiLanguage = 'en';

const rawUiText = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
} as const;

type TemplateValues = Record<string, string | number>;
type Message = string | { one?: string; other: string };

type RawUiText = {
  locale: string;
  nav: {
    home: string;
    menu: string;
    appearance: string;
    themeMode: string;
    light: string;
    dark: string;
    accentColor: string;
    mobileNav: string;
    openMenu: string;
    closeMenu: string;
    openPalette: string;
    closePalette: string;
    backToTop: string;
    articleNav: string;
    pageActions: string;
    switchTheme: string;
  };
  homeStats: {
    posts: string;
    categories: string;
    tags: string;
  };
  notFound: {
    title: string;
    description: string;
    navLabel: string;
    home: string;
    random: string;
  };
  links: {
    note: Message;
    circleAria: string;
    circleTitle: string;
    circleSummary: Message;
    expandMore: string;
    feedError: Message;
    feedUnavailable: string;
    feedDemo: string;
    youlinLinksFallback: string;
    youlinCircleFallback: string;
    youlinUnavailable: string;
    emptyLinks: string;
    emptyCircle: string;
    applyAria: string;
    applyTitle: string;
    applyDescription: string;
    applyYoulinDescription: string;
    applyYoulinLabel: string;
    applyYoulinHint: string;
  };
  moments: {
    loading: string;
    count: Message;
    empty: string;
    imageAria: Message;
    moreImages: Message;
    loadMoreCount: Message;
    loadingMore: string;
    loadFailed: string;
    loadFailedHint: string;
    loadMoreFailed: string;
    retry: string;
    extension: {
      github: string;
      website: string;
      music: string;
      location: string;
      video: string;
      tweet: string;
    };
  };
  friendApplication: {
    title: string;
    description: string;
    applyLabel: string;
    applyHint: string;
    youlinDescription: string;
    youlinApplyLabel: string;
    youlinApplyHint: string;
    copyHint: string;
    copySuccessText: string;
    issueTitle: Message;
    issueBody: Message;
    fields: Record<string, string>;
    placeholders: Record<string, string>;
    invalidUrl: string;
    invalidUrlProtocol: string;
    statusReady: string;
    statusIncomplete: string;
    youlinStatusReady: string;
    youlinStatusIncomplete: string;
    submitPending: string;
    submitSuccess: string;
    submitApproved: string;
    submitFailed: string;
    turnstileMissing: string;
    copyFailed: string;
    previewName: string;
    previewBio: string;
    previewAria: Message;
    previewAriaPrefix: string;
    required: string;
    previewCta: string;
    backCta: string;
    previewTitle: string;
    previewAriaLabel: string;
  };
  siteInfo: {
    uptime: string;
    uptimeTip: Message;
    lastUpdated: string;
    lastUpdatedTip: string;
    totalWords: string;
    lastContentUpdate: string;
    lastContentUpdateTip: string;
    program: string;
    imageBed: string;
    buildPlatform: string;
    justNow: string;
    units: Record<TimeUnit, Message>;
  };
  connect: {
    links: string;
    copied: string;
    copyFailed: string;
  };
  comments: {
    title: string;
    note: string;
  };
  palette: {
    greenSoft: string;
    greenVivid: string;
    roseSoft: string;
    pinkSoft: string;
    purpleSoft: string;
    blueSoft: string;
    orangeSoft: string;
    brownSoft: string;
  };
  heatmap: {
    totalPosts: string;
    activeDays: string;
    dayStreak: string;
    latest: string;
    latestArticle: string;
    latestPublishedPosts: string;
    openLatestPost: Message;
    less: string;
    more: string;
    weekdays: string[];
    writingSince: Message;
    recentWeeks: Message;
    upcoming: string;
    postCount: Message;
  };
  groups: {
    categories: string;
    category: string;
    tag: string;
    tags: string;
    years: string;
    back: string;
    allArticles: string;
    uncategorized: string;
    expand: string;
    collapse: string;
    browseByTopic: string;
    followConnectedNotes: string;
    blogBrowsingGroups: string;
    blogViews: string;
    emptyCategories: string;
    emptyTags: string;
    emptyArchives: string;
    tagCloud: string;
    tagCloudKicker: string;
    tagCloudNote: string;
    yearArchives: string;
    yearArchivesKicker: string;
    yearArchivesNote: string;
    articleCount: Message;
    categoryNote: Message;
    tagNote: Message;
    publishedCount: Message;
    publishedArticles: Message;
    viewMore: Message;
  };
  article: {
    metadata: string;
    groups: string;
    readingTools: string;
    wordCount: Message;
    readingTime: Message;
    updated: string;
    pinned: string;
    navigation: string;
    pagerLabel: string;
    previous: string;
    next: string;
    previousLabel: string;
    nextLabel: string;
    firstArticle: string;
    lastArticle: string;
    moreArticles: string;
    moreCount: Message;
    references: string;
    referencesLabel: string;
    imagePreview: string;
  };
  share: {
    title: string;
    description: string;
    trigger: string;
    posterKicker: string;
    close: string;
    loading: string;
    posterAlt: string;
    copy: string;
    copied: string;
    copyFailed: string;
    save: string;
    author: string;
    scan: string;
    error: string;
    copyTitle: string;
  };
  toc: {
    title: string;
    open: string;
    close: string;
    expand: string;
    collapse: string;
    showAll: string;
    collapseButton: string;
  };
  pagination: {
    blog: string;
    previous: string;
    next: string;
    page: Message;
  };
  search: {
    title: string;
    trigger: string;
    close: string;
    idle: string;
    loading: string;
    empty: string;
    unavailable: string;
    resultKinds: {
      blogNote: string;
      blogIndex: string;
      page: string;
    };
    matchedPassage: string;
  };
};

export type UiLanguage = keyof typeof rawUiText;

export type UiText = Omit<
  RawUiText,
  | 'heatmap'
  | 'groups'
  | 'article'
  | 'share'
  | 'pagination'
  | 'links'
  | 'moments'
  | 'friendApplication'
  | 'siteInfo'
> & {
  heatmap: Omit<
    RawUiText['heatmap'],
    'openLatestPost' | 'writingSince' | 'recentWeeks' | 'postCount'
  > & {
    openLatestPost: (title: string) => string;
    writingSince: (date: string) => string;
    recentWeeks: (weeks: number) => string;
    postCount: (count: number) => string;
  };
  groups: Omit<
    RawUiText['groups'],
    | 'articleCount'
    | 'categoryNote'
    | 'tagNote'
    | 'publishedCount'
    | 'publishedArticles'
    | 'viewMore'
  > & {
    articleCount: (count: number) => string;
    categoryNote: (count: number) => string;
    tagNote: (count: number) => string;
    publishedCount: (count: number) => string;
    publishedArticles: (count: number) => string;
    viewMore: (count: number) => string;
  };
  article: Omit<
    RawUiText['article'],
    'wordCount' | 'readingTime' | 'previousLabel' | 'nextLabel' | 'moreCount'
  > & {
    wordCount: (count: number) => string;
    readingTime: (minutes: number) => string;
    previousLabel: (title: string) => string;
    nextLabel: (title: string) => string;
    moreCount: (count: number) => string;
  };
  share: Omit<RawUiText['share'], 'copyTitle'> & {
    copyTitle: (title: string) => string;
  };
  links: Omit<RawUiText['links'], 'note' | 'circleSummary' | 'feedError'> & {
    note: (total: number, rss: number) => string;
    noteTemplate: string;
    circleSummary: (friends: number, active: number, posts: number) => string;
    circleSummaryTemplate: string;
    feedError: (error: string) => string;
  };
  moments: Omit<RawUiText['moments'], 'count' | 'imageAria' | 'moreImages' | 'loadMoreCount'> & {
    count: (count: number | string) => string;
    imageAria: (index: number | string) => string;
    moreImages: (count: number | string) => string;
    loadMoreCount: (count: number | string) => string;
  };
  friendApplication: Omit<
    RawUiText['friendApplication'],
    'issueTitle' | 'issueBody' | 'previewAria'
  > & {
    issueTitle: (name: string) => string;
    issueBody: (json: string) => string;
    previewAria: (name: string) => string;
  };
  siteInfo: Omit<RawUiText['siteInfo'], 'uptimeTip' | 'units' | 'justNow'> & {
    uptimeTip: (date: string) => string;
    timeElapsed: (parts: ElapsedPart[]) => string;
  };
  comments: RawUiText['comments'];
  connect: RawUiText['connect'];
  nav: RawUiText['nav'];
  pagination: Omit<RawUiText['pagination'], 'page'> & {
    page: (current: number, total: number) => string;
  };
};

function formatMessage(message: Message, values: TemplateValues = {}) {
  const template =
    typeof message === 'string'
      ? message
      : Number(values.count) === 1 && message.one
        ? message.one
        : message.other;

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/** 供客户端替换文案使用：保留 {token}，不在这里插值。 */
function templateOf(message: Message): string {
  return typeof message === 'string' ? message : message.other;
}

function formatNumber(value: number, locale: string) {
  return value.toLocaleString(locale);
}

function createUiText(raw: RawUiText): UiText {
  const { units: elapsedUnits, justNow, ...siteInfoText } = raw.siteInfo;

  return {
    locale: raw.locale,
    nav: raw.nav,
    homeStats: raw.homeStats,
    notFound: raw.notFound,
    links: {
      ...raw.links,
      note: (total, rss) => formatMessage(raw.links.note, { total, rss }),
      noteTemplate: templateOf(raw.links.note),
      circleSummary: (friends, active, posts) =>
        formatMessage(raw.links.circleSummary, { friends, active, posts }),
      circleSummaryTemplate: templateOf(raw.links.circleSummary),
      feedError: (error) => formatMessage(raw.links.feedError, { error }),
    },
    moments: {
      ...raw.moments,
      count: (count) => formatMessage(raw.moments.count, { count }),
      imageAria: (index) => formatMessage(raw.moments.imageAria, { index }),
      moreImages: (count) => formatMessage(raw.moments.moreImages, { count }),
      loadMoreCount: (count) => formatMessage(raw.moments.loadMoreCount, { count }),
    },
    friendApplication: {
      ...raw.friendApplication,
      issueTitle: (name) => formatMessage(raw.friendApplication.issueTitle, { name }),
      issueBody: (json) => formatMessage(raw.friendApplication.issueBody, { json }),
      previewAria: (name) => formatMessage(raw.friendApplication.previewAria, { name }),
    },
    siteInfo: {
      ...siteInfoText,
      uptimeTip: (date) => formatMessage(raw.siteInfo.uptimeTip, { date }),
      timeElapsed: (parts) => {
        if (parts.length === 0) return justNow;
        const separator = raw.locale.startsWith('zh') ? '' : ' ';
        return parts
          .map(({ unit, value }) => formatMessage(elapsedUnits[unit], { count: value }))
          .join(separator);
      },
    },
    comments: raw.comments,
    connect: raw.connect,
    palette: raw.palette,
    heatmap: {
      ...raw.heatmap,
      openLatestPost: (title) => formatMessage(raw.heatmap.openLatestPost, { title }),
      writingSince: (date) => formatMessage(raw.heatmap.writingSince, { date }),
      recentWeeks: (weeks) => formatMessage(raw.heatmap.recentWeeks, { weeks }),
      postCount: (count) => formatMessage(raw.heatmap.postCount, { count }),
    },
    groups: {
      ...raw.groups,
      articleCount: (count) => formatMessage(raw.groups.articleCount, { count }),
      categoryNote: (count) => formatMessage(raw.groups.categoryNote, { count }),
      tagNote: (count) => formatMessage(raw.groups.tagNote, { count }),
      publishedCount: (count) => formatMessage(raw.groups.publishedCount, { count }),
      publishedArticles: (count) => formatMessage(raw.groups.publishedArticles, { count }),
      viewMore: (count) => formatMessage(raw.groups.viewMore, { count }),
    },
    article: {
      ...raw.article,
      wordCount: (count) =>
        formatMessage(raw.article.wordCount, {
          count: formatNumber(count, raw.locale),
        }),
      readingTime: (minutes) => formatMessage(raw.article.readingTime, { minutes }),
      previousLabel: (title) => formatMessage(raw.article.previousLabel, { title }),
      nextLabel: (title) => formatMessage(raw.article.nextLabel, { title }),
      moreCount: (count) => formatMessage(raw.article.moreCount, { count }),
    },
    share: {
      ...raw.share,
      copyTitle: (title) => formatMessage(raw.share.copyTitle, { title }),
    },
    toc: raw.toc,
    pagination: {
      ...raw.pagination,
      page: (current, total) => formatMessage(raw.pagination.page, { current, total }),
    },
    search: raw.search,
  };
}

const uiText = Object.fromEntries(
  Object.entries(rawUiText).map(([language, text]) => [language, createUiText(text)]),
) as Record<UiLanguage, UiText>;

export function normalizeUiLanguage(value: string | undefined): UiLanguage {
  return normalizeLocale(value, defaultUiLanguage) as UiLanguage;
}

export function getUiLanguage(config: SiteConfig): UiLanguage {
  return normalizeUiLanguage(config.theme.lang);
}

export function getUiText(config: SiteConfig): UiText {
  return uiText[getUiLanguage(config)];
}

export function getI18n(config: SiteConfig) {
  return createI18n({
    locale: getUiLanguage(config),
    catalogs: [rawUiText as unknown as Record<string, I18nMessages>],
  });
}

export function getHtmlLang(config: SiteConfig): UiText['locale'] {
  return getUiText(config).locale;
}
