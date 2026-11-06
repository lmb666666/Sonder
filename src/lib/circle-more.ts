/** 友链页“展开更多”绑定：DOM 被客户端替换后可安全重绑。 */
export function bindCircleMore(root: ParentNode = document): void {
  const grid = root.querySelector<HTMLElement>('[data-circle-list]');
  const button = root.querySelector<HTMLButtonElement>('[data-circle-more]');
  if (!grid || !button) return;

  // 克隆按钮以丢掉旧监听，避免客户端重渲染后重复触发
  const fresh = button.cloneNode(true) as HTMLButtonElement;
  button.replaceWith(fresh);

  const pageSize = Math.max(1, Number(grid.dataset.circleSize ?? '20'));
  const cards = [...grid.querySelectorAll<HTMLElement>('[data-circle-card]')];
  let visible = cards.filter((card) => !card.classList.contains('circle-card--hidden')).length;
  if (visible === 0 && cards.length > 0) visible = Math.min(cards.length, pageSize);
  fresh.hidden = visible >= cards.length;

  fresh.addEventListener('click', () => {
    visible += pageSize;
    cards.forEach((card, index) => {
      card.classList.toggle('circle-card--hidden', index >= visible);
    });
    if (visible >= cards.length) fresh.hidden = true;
  });
}
