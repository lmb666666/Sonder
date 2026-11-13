type Mood = 'default' | 'joy' | 'anger' | 'sadness' | 'delight';
type Tone =
  | 'hair'
  | 'hairLight'
  | 'skin'
  | 'skinShadow'
  | 'eye'
  | 'blush'
  | 'mouth'
  | 'tear'
  | 'hoodie'
  | 'hoodieLight';

interface Palette {
  hair: string;
  hairLight: string;
  skin: string;
  skinShadow: string;
  eye: string;
  blush: string;
  mouth: string;
  tear: string;
  hoodie: string;
  hoodieLight: string;
}

interface Cell {
  gx: number;
  gy: number;
  tone: Tone;
}

interface Particle extends Cell {
  x: number;
  y: number;
  phase: number;
}

const COLS = 26;
const ROWS = 30;
const MOODS: Mood[] = ['default', 'joy', 'anger', 'sadness', 'delight'];

const lightPalette: Palette = {
  hair: '#2b241d',
  hairLight: '#5a4634',
  skin: '#e8c6a6',
  skinShadow: '#c99d7d',
  eye: '#1b1713',
  blush: '#d89383',
  mouth: '#6c4a3a',
  tear: '#7fa7b8',
  hoodie: '#44594b',
  hoodieLight: '#6b8373',
};

const darkPalette: Palette = {
  hair: '#8a7964',
  hairLight: '#b5a087',
  skin: '#d7a582',
  skinShadow: '#b07d5f',
  eye: '#0f0c0a',
  blush: '#b56f63',
  mouth: '#5a3428',
  tear: '#8fc6d8',
  hoodie: '#6f8d7a',
  hoodieLight: '#9bb3a2',
};

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function toneAt(x: number, y: number, mood: Mood): Tone | null {
  const face = inEllipse(x, y, 12.5, 12.4, 6.4, 7.3);
  const faceCore = inEllipse(x, y, 12.5, 12.4, 5.3, 6.2);
  const hair = inEllipse(x, y, 12.5, 9.7, 8.5, 9.3);
  const hoodie = y >= 23 && Math.abs(x - 12.5) <= 4 + (y - 23) * 1.15;
  const neck = y >= 19 && y <= 23 && Math.abs(x - 12.5) <= 2.8;
  const leftEye = (x === 9 || x === 10) && y === 12;
  const rightEye = (x === 15 || x === 16) && y === 12;

  if (hoodie) {
    if ((x === 10 || x === 15) && y >= 25) return 'hoodieLight';
    return (x + y) % 10 === 0 ? 'hoodieLight' : 'hoodie';
  }
  if (neck) return 'skinShadow';
  if ((x === 5 || x === 20) && y >= 11 && y <= 13) return 'skin';
  if (hair && !face) return (x * 3 + y * 5) % 17 === 0 ? 'hairLight' : 'hair';
  if (!face) return null;

  if (y <= 8) return y === 6 && x % 4 === 0 ? 'hairLight' : 'hair';

  if (leftEye || rightEye) {
    if (mood === 'joy' || mood === 'delight') return 'mouth';
    return 'eye';
  }

  if (mood === 'anger' && y === 10 && ((x >= 8 && x <= 10) || (x >= 15 && x <= 17))) {
    return 'hair';
  }

  if (mood === 'sadness' && x === 8 && (y === 14 || y === 15)) return 'tear';

  if ((mood === 'joy' || mood === 'delight') && y >= 14 && y <= 15 && (x === 7 || x === 18)) {
    return 'blush';
  }

  if (x === 12 && (y === 14 || y === 15)) return 'skinShadow';

  if (y === 17 || y === 18) {
    if (mood === 'default' && y === 17 && (x === 12 || x === 13)) return 'mouth';
    if ((mood === 'joy' || mood === 'delight') && y === 17 && x >= 11 && x <= 14) return 'mouth';
    if (mood === 'anger' && y === 17 && x >= 11 && x <= 14) return 'mouth';
    if (mood === 'sadness' && y === 18 && (x === 12 || x === 13)) return 'mouth';
  }

  if (!faceCore && (y <= 11 || y >= 18 || x <= 7 || x >= 18)) return 'skinShadow';
  return 'skin';
}

function buildCells(mood: Mood): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tone = toneAt(x, y, mood);
      if (tone) cells.push({ gx: x, gy: y, tone });
    }
  }
  return cells;
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === 'dark';
}

export function initParticleAvatar(root: HTMLElement): () => void {
  const portrait = root.querySelector<HTMLElement>('[data-avatar-portrait]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-avatar-canvas]');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-avatar-mood]'));
  if (!portrait || !canvas || buttons.length === 0) return () => undefined;

  const context = canvas.getContext('2d');
  if (!context) return () => undefined;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controller = new AbortController();
  let mood: Mood = 'default';
  let cells = buildCells(mood);
  let particles: Particle[] = [];
  let width = 0;
  let height = 0;
  let cell = 10;
  let originX = 0;
  let originY = 0;
  let raf = 0;
  let visible = false;
  let pointerX = -1000;
  let pointerY = -1000;
  let palette = isDarkTheme() ? darkPalette : lightPalette;

  const baseLabel = canvas.getAttribute('aria-label') ?? '';

  const layout = () => {
    const rect = portrait.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    cell = Math.min(width / (COLS + 4), height / (ROWS + 4));
    originX = (width - COLS * cell) / 2;
    originY = (height - ROWS * cell) / 2;
  };

  const makeParticles = (nextCells: Cell[], previous: Particle[]): Particle[] =>
    nextCells.map((next, index) => {
      const old = previous[index];
      return {
        ...next,
        x: old?.x ?? Math.random() * width,
        y: old?.y ?? Math.random() * height,
        phase: old?.phase ?? ((next.gx * 37 + next.gy * 17) % 47) * 0.13,
      };
    });

  const draw = (time: number) => {
    context.clearRect(0, 0, width, height);
    const activePalette = palette;
    for (const particle of particles) {
      const targetX = originX + (particle.gx + 0.5) * cell;
      const targetY = originY + (particle.gy + 0.5) * cell;
      let floatX = 0;
      let floatY = 0;
      let repelX = 0;
      let repelY = 0;

      if (!reducedMotion) {
        floatX = Math.sin(time * 0.0011 + particle.phase) * cell * 0.16;
        floatY = Math.cos(time * 0.0009 + particle.phase) * cell * 0.13;
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < cell * 6) {
          const strength = ((cell * 6 - distance) / (cell * 6)) * cell * 1.7;
          repelX = (dx / distance) * strength;
          repelY = (dy / distance) * strength;
        }
        particle.x += (targetX + floatX + repelX - particle.x) * 0.09;
        particle.y += (targetY + floatY + repelY - particle.y) * 0.09;
      } else {
        particle.x = targetX;
        particle.y = targetY;
      }

      const size = Math.max(2, cell * 0.72);
      context.fillStyle = activePalette[particle.tone];
      context.fillRect(
        Math.round(particle.x - size / 2),
        Math.round(particle.y - size / 2),
        Math.ceil(size),
        Math.ceil(size),
      );
    }
  };

  const tick = (time: number) => {
    draw(time);
    if (visible && !reducedMotion) raf = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (!visible) return;
    if (reducedMotion) {
      draw(0);
      return;
    }
    if (!raf) raf = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  };

  const setMood = (next: Mood) => {
    mood = next;
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.avatarMood === mood ? 'true' : 'false');
    });
    cells = buildCells(mood);
    particles = makeParticles(cells, particles);
    const activeLabel = buttons.find((button) => button.dataset.avatarMood === mood)?.textContent;
    canvas.setAttribute(
      'aria-label',
      activeLabel ? `${baseLabel} · ${activeLabel.trim()}` : baseLabel,
    );
    if (reducedMotion) draw(0);
    start();
  };

  buttons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const next = button.dataset.avatarMood as Mood | undefined;
        if (next && MOODS.includes(next)) setMood(next);
      },
      { signal: controller.signal },
    );
  });

  portrait.addEventListener(
    'pointermove',
    (event) => {
      const rect = portrait.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
    },
    { signal: controller.signal },
  );
  portrait.addEventListener(
    'pointerleave',
    () => {
      pointerX = -1000;
      pointerY = -1000;
    },
    { signal: controller.signal },
  );

  const resizeObserver = new ResizeObserver(() => {
    layout();
    particles = makeParticles(cells, []);
    if (reducedMotion) draw(0);
    start();
  });
  resizeObserver.observe(portrait);

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) {
        layout();
        particles = makeParticles(cells, particles);
        start();
      } else {
        stop();
      }
    },
    { threshold: 0.01 },
  );
  intersectionObserver.observe(portrait);

  const themeObserver = new MutationObserver(() => {
    palette = isDarkTheme() ? darkPalette : lightPalette;
    if (reducedMotion) draw(0);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  layout();
  particles = makeParticles(cells, []);
  draw(0);

  return () => {
    stop();
    controller.abort();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
  };
}
