/** ABC 乐谱：客户端 abcjs 渲染 + 可选合成播放（对应 :::music-score 指令输出）。 */

const controllers = new WeakMap<Element, { pause: () => void }>();

async function checkSoundFonts(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (error) {
    console.error('[MusicScore] 无法连接 SoundFonts，仅渲染乐谱不启用播放\n', error);
    return false;
  }
}

export async function renderMusicScores() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-music-score]'));
  if (!nodes.length) return;

  const abcjs = await import('abcjs');
  for (const node of nodes) {
    if (node.dataset.rendered === '1') continue;
    const source = node.querySelector<HTMLElement>('.music-score-source')?.textContent ?? '';
    const scoreHost = node.querySelector<HTMLElement>('.music-score-score');
    if (!source || !scoreHost) continue;

    try {
      const tune = abcjs.renderAbc(scoreHost, source, { responsive: 'resize' })[0];
      node.dataset.rendered = '1';

      const synthHost = node.querySelector<HTMLElement>('.music-score-synth');
      if (!synthHost || !abcjs.synth.supportsAudio()) continue;

      const soundfontsUrl = node.dataset.soundfonts ?? '';
      if (soundfontsUrl && !(await checkSoundFonts(soundfontsUrl))) continue;

      const controller = new abcjs.synth.SynthController();
      controller.load(synthHost, null, {
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: true,
      });
      controller.setTune(tune, false);
      controllers.set(node, controller);
    } catch (error) {
      console.error('[MusicScore] 乐谱渲染失败\n', error);
    }
  }
}

export function pauseMusicScores() {
  document.querySelectorAll('[data-music-score]').forEach((node) => {
    controllers.get(node)?.pause();
  });
}
