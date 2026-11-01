/** 音乐播放器：原生 audio 控制与跑马灯测量（对应播放器指令输出）。 */

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
};

export function initAudioPlayers() {
  document.querySelectorAll<HTMLElement>('[data-sonder-audio-player]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';

    const marquee = () =>
      root.querySelectorAll<HTMLElement>('[data-marquee]').forEach((node) => {
        const distance = Math.max(0, node.scrollWidth - node.clientWidth);
        node.style.setProperty('--marquee-distance', `${distance}px`);
        node.toggleAttribute('data-overflow', distance > 2);
      });

    const audio = root.querySelector<HTMLAudioElement>('[data-audio]');
    if (!audio) {
      // embed 模式：只需要跑马灯
      marquee();
      return;
    }

    const playlist = JSON.parse(
      root.querySelector<HTMLScriptElement>('[data-playlist]')?.textContent || '[]',
    ) as Array<{ title: string; artist?: string; artwork?: string; src: string; caption?: string }>;
    const play = root.querySelector<HTMLButtonElement>('[data-play]');
    const progress = root.querySelector<HTMLInputElement>('[data-progress]');
    const time = root.querySelector<HTMLElement>('[data-time]');
    const mute = root.querySelector<HTMLButtonElement>('[data-mute]');

    const sync = () => {
      if (progress) {
        progress.max = String(audio.duration || 0);
        progress.value = String(audio.currentTime);
        progress.style.setProperty(
          '--music-progress',
          `${audio.duration ? (audio.currentTime / audio.duration) * 100 : 0}%`,
        );
      }
      if (time)
        time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    };
    const syncButton = () => {
      const paused = audio.paused;
      root.toggleAttribute('data-playing', !paused);
      play?.setAttribute(
        'aria-label',
        paused ? `播放 ${root.querySelector('strong')?.textContent ?? '音频'}` : '暂停',
      );
    };
    const selectTrack = (index: number, playAfterSelect = true) => {
      const track = playlist[index];
      if (!track) return;
      audio.src = track.src;
      audio.load();
      const title = root.querySelector<HTMLElement>('[data-title] > span');
      const artist = root.querySelector<HTMLElement>('[data-artist] > span');
      const artwork = root.querySelector<HTMLImageElement>('[data-artwork]');
      const caption = root.querySelector<HTMLElement>('[data-caption] > span');
      if (title) title.textContent = track.title;
      if (artist) artist.textContent = track.artist ?? '';
      if (artwork && track.artwork) {
        artwork.src = track.artwork;
        artwork.alt = `《${track.title}》封面`;
      }
      if (caption) caption.textContent = track.caption ?? '';
      root
        .querySelectorAll<HTMLElement>('[data-track-index]')
        .forEach((item) =>
          item.toggleAttribute('data-current-track', Number(item.dataset.trackIndex) === index),
        );
      window.requestAnimationFrame(marquee);
      if (playAfterSelect) audio.play().catch(() => undefined);
    };

    play?.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => undefined);
      else audio.pause();
    });
    progress?.addEventListener('input', () => {
      audio.currentTime = Number(progress.value);
    });
    mute?.addEventListener('click', () => {
      audio.muted = !audio.muted;
      root.toggleAttribute('data-muted', audio.muted);
      mute.setAttribute('aria-label', audio.muted ? '取消静音' : '静音');
    });
    root
      .querySelectorAll<HTMLButtonElement>('[data-track-index]')
      .forEach((button) =>
        button.addEventListener('click', () => selectTrack(Number(button.dataset.trackIndex))),
      );
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('play', syncButton);
    audio.addEventListener('pause', syncButton);
    audio.addEventListener('ended', syncButton);
    window.addEventListener('resize', marquee);
    sync();
    syncButton();
    marquee();
  });
}

/** 页面切换前暂停全部播放，避免音频残留。 */
export function pauseAudioPlayers() {
  document.querySelectorAll('[data-sonder-audio-player] [data-audio]').forEach((audio) => {
    (audio as HTMLAudioElement).pause();
  });
}
