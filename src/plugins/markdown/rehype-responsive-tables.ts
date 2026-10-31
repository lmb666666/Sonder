type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function wrapTables(node?: HastNode) {
  if (!node || !Array.isArray(node.children)) return;

  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'table') {
      return {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['markdown-table-scroll'],
          // 键盘用户可聚焦后用方向键横向滚动；聚焦时滚动条经 :focus-within 浮现
          tabindex: 0,
        },
        children: [child],
      };
    }

    wrapTables(child);
    return child;
  });
}

export default function rehypeResponsiveTables() {
  return (tree: HastNode) => {
    wrapTables(tree);
  };
}
