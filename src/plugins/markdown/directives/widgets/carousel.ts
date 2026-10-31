/** 轮播：左右按钮按视口宽度滚动（对应 :::carousel 指令输出）。 */
export function initCarousels() {
  document.querySelectorAll<HTMLElement>('.sonder-carousel').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const track = root.querySelector<HTMLElement>('[data-track]');
    root
      .querySelector('[data-prev]')
      ?.addEventListener('click', () =>
        track?.scrollBy({ left: -(track.clientWidth || 0), behavior: 'smooth' }),
      );
    root
      .querySelector('[data-next]')
      ?.addEventListener('click', () =>
        track?.scrollBy({ left: track.clientWidth || 0, behavior: 'smooth' }),
      );
  });
}
