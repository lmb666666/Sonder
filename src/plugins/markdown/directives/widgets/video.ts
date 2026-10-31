/** 抖音系列播放器：按容器宽度补偿 iframe zoom（竖/横屏适配，zoom 因子为 v1 实测值）。 */
export function applyVideoZoom() {
  document.querySelectorAll<HTMLElement>('[data-sd-video-zoom]').forEach((container) => {
    const factor = Number(container.dataset.sdVideoZoom ?? '0');
    const iframe = container.querySelector('iframe');
    if (!factor || !iframe) return;
    (iframe as HTMLElement).style.zoom = String(container.clientWidth * factor);
  });
}
