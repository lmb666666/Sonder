import en from '../../../i18n/en.json';
import zhCN from '../../../i18n/zh-CN.json';
import zhTW from '../../../i18n/zh-TW.json';

type Catalog = {
  friendApplication: (typeof en)['friendApplication'];
  media: {
    status: Record<string, string>;
    playerTitle: string;
  };
};
export type DirectiveLanguage = 'en' | 'zh-CN' | 'zh-TW';
export type FriendApplicationText = Catalog['friendApplication'];

const catalogs: Record<DirectiveLanguage, Catalog> = {
  en,
  'zh-CN': zhCN as unknown as Catalog,
  'zh-TW': zhTW as unknown as Catalog,
};

export function normalizeDirectiveLanguage(value: string | undefined): DirectiveLanguage {
  const language = (value ?? '').trim().toLowerCase().replace(/_/g, '-');

  if (['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant'].includes(language)) return 'zh-TW';
  if (['zh', 'zh-cn', 'zh-sg', 'zh-my', 'zh-hans'].includes(language)) return 'zh-CN';
  return 'en';
}

export function getDirectiveI18n(language: string | undefined) {
  const catalog = catalogs[normalizeDirectiveLanguage(language)];

  return {
    friendApplication: catalog.friendApplication,
    mediaStatus: catalog.media.status satisfies Record<string, string>,
    neteasePlayer: catalog.media.playerTitle,
  };
}
