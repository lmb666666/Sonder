import { defineI18nContribution } from '../../framework/index.js';

export const projectsI18n = defineI18nContribution({
  messages: {
    en: {
      projects: {
        listLabel: 'Projects',
        tagsLabel: 'Project tags',
        authorsLabel: 'Project authors',
        linksLabel: 'Project links',
        emptyLabel: 'Projects empty state',
        emptyTitle: 'Projects are being collected.',
        emptyNote:
          'The route is ready; draft entries stay private until they are marked publishable in the content collection.',
      },
    },
    'zh-CN': {
      projects: {
        listLabel: '项目',
        tagsLabel: '项目标签',
        authorsLabel: '项目作者',
        linksLabel: '项目链接',
        emptyLabel: '项目空状态',
        emptyTitle: '项目正在整理中。',
        emptyNote: '页面已准备就绪；草稿条目会保持私有，直到在内容集合中标记为可发布。',
      },
    },
    'zh-TW': {
      projects: {
        listLabel: '專案',
        tagsLabel: '專案標籤',
        authorsLabel: '專案作者',
        linksLabel: '專案連結',
        emptyLabel: '專案空狀態',
        emptyTitle: '專案正在整理中。',
        emptyNote: '頁面已準備就緒；草稿條目會保持私有，直到在內容集合中標記為可發布。',
      },
    },
  },
});
