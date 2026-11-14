export const prototypeVariants = {
  '01': { title: '左资料栏 + 右单栏' },
  '02': { title: '左资料栏 + 右双列' },
  '03': { title: '右资料栏 + 左内容' },
  '04': { title: '双侧栏' },
  '05': { title: '顶部横幅 + 居中单栏' },
  '06': { title: '顶部横幅 + 双列瀑布' },
  '07': { title: '杂志跨页' },
  '08': { title: '统一 Bento' },
  '09': { title: '中央年表' },
  '10': { title: '画册 / 展陈' },
} as const;

export type PrototypeVariant = keyof typeof prototypeVariants;
