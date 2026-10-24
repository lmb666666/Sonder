import { defineI18nContribution } from '../../framework/index.js';

export const mediaI18n = defineI18nContribution({
  namespace: 'media',
  messages: {
    en: {
      media: {
        shelf: 'Media shelf',
        browse: 'Browse',
        sectionsLabel: 'Media sections',
        empty: 'Nothing collected here yet.',
        readReview: 'Read review',
        backToShelf: '← Back to media shelf',
        ratingLabel: 'Rating',
        sections: {
          books: 'Books',
          booksNote: 'Read and reread',
          films: 'Films',
          filmsNote: 'Films and series',
          music: 'Music',
          musicNote: 'Albums and podcasts',
        },
        types: { book: 'Book', film: 'Film', series: 'Series', album: 'Album', podcast: 'Podcast' },
        reviewKinds: {
          book: 'Book review',
          film: 'Film review',
          series: 'Series review',
          album: 'Album review',
          podcast: 'Podcast review',
        },
      },
    },
    'zh-CN': {
      media: {
        shelf: '书影音',
        browse: '浏览',
        sectionsLabel: '书影音分区',
        empty: '这里还没有收录内容。',
        readReview: '阅读长评',
        backToShelf: '← 返回书影音',
        ratingLabel: '评分',
        sections: {
          books: '书',
          booksNote: '已读与重读',
          films: '影',
          filmsNote: '电影与剧集',
          music: '音',
          musicNote: '专辑与播客',
        },
        types: { book: '书籍', film: '电影', series: '剧集', album: '专辑', podcast: '播客' },
        reviewKinds: {
          book: '书评',
          film: '影评',
          series: '剧评',
          album: '乐评',
          podcast: '播客评论',
        },
      },
    },
    'zh-TW': {
      media: {
        shelf: '書影音',
        browse: '瀏覽',
        sectionsLabel: '書影音分區',
        empty: '這裡還沒有收錄內容。',
        readReview: '閱讀長評',
        backToShelf: '← 返回書影音',
        ratingLabel: '評分',
        sections: {
          books: '書',
          booksNote: '已讀與重讀',
          films: '影',
          filmsNote: '電影與劇集',
          music: '音',
          musicNote: '專輯與播客',
        },
        types: { book: '書籍', film: '電影', series: '劇集', album: '專輯', podcast: '播客' },
        reviewKinds: {
          book: '書評',
          film: '影評',
          series: '劇評',
          album: '樂評',
          podcast: '播客評論',
        },
      },
    },
  },
});
