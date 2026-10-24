import { defineI18nContribution } from '../../framework/index.js';

export const vibeI18n = defineI18nContribution({
  messages: {
    en: { vibe: { notes: 'Vibe notes', images: '{title} images', image: '{title} image {index}' } },
    'zh-CN': {
      vibe: { notes: '灵感笔记', images: '{title} 的图片', image: '{title} 的第 {index} 张图片' },
    },
    'zh-TW': {
      vibe: { notes: '靈感筆記', images: '{title} 的圖片', image: '{title} 的第 {index} 張圖片' },
    },
  },
});
