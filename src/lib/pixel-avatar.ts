export type AvatarMood = 'default' | 'joy' | 'anger' | 'sadness' | 'delight';

type Tone =
  | 'hair'
  | 'hair-light'
  | 'skin'
  | 'skin-shadow'
  | 'eye'
  | 'blush'
  | 'mouth'
  | 'tear'
  | 'hoodie'
  | 'hoodie-light';

interface Particle {
  gridX: number;
  gridY: number;
  tone: Tone;
  x: number;
  y: number;
  phase: number;
  size: number;
}

const COLS = 30;
const ROWS = 32;

/**
 * Hairline offsets for each column, measured from lqq.ai's particle avatar.
 * They keep the face opening irregular instead of a perfect ellipse.
 */
const HAIRLINE = [
  0, 0, 0, 0, 0, 9, 10, 11, 10, 12, 11, 13, 10, 11, 13, 12, 10, 12, 11, 13, 10, 11, 9, 8, 0, 0, 0,
  0, 0, 0,
];

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function toneAt(x: number, y: number, mood: AvatarMood): Tone | null {
  const hair = inEllipse(x, y, 14.5, 8.8, 10.8, 8.6);
  const face = inEllipse(x, y, 14.5, 13.9, 8.2, 10.2);
  const leftEar = inEllipse(x, y, 6.2, 14.5, 1.5, 3.8);
  const rightEar = inEllipse(x, y, 22.8, 14.5, 1.5, 3.8);

  if (y >= 23 && Math.abs(x - 14.5) <= 5.4 + (y - 23) * 1.18 && y <= 31) {
    if (y <= 25 && x >= 11 && x <= 18) return 'skin';
    return (x + y) % 11 === 0 || (y === 25 && (x < 10 || x > 19)) ? 'hoodie-light' : 'hoodie';
  }

  if ((leftEar || rightEar) && y >= 12 && y <= 18) {
    return y === 14 || y === 15 ? 'skin-shadow' : 'skin';
  }

  if (face && x === 19 && y === 13 && mood !== 'anger') return 'skin';

  if (hair && (!face || y <= HAIRLINE[x] || (x <= 7 && y <= 17) || (x >= 22 && y <= 17))) {
    if (
      (y === 4 && x >= 9 && x <= 12) ||
      (y === 6 && x >= 19 && x <= 21) ||
      (y === 8 && x >= 6 && x <= 8)
    ) {
      return 'hair-light';
    }
    return 'hair';
  }

  if (!face) return null;

  if (
    (y === 12 && ((x >= 9 && x <= 11) || (x >= 18 && x <= 20))) ||
    (mood === 'anger' && y === 13 && (x === 10 || x === 19))
  ) {
    return 'hair';
  }

  if (
    (mood === 'delight' && y === 14 && ((x >= 9 && x <= 11) || (x >= 18 && x <= 20))) ||
    (mood !== 'delight' && y === 14 && (x === 10 || x === 19))
  ) {
    return 'eye';
  }

  if (
    ((mood === 'joy' || mood === 'delight') && y === 15 && (x === 8 || x === 21)) ||
    (mood === 'anger' &&
      ((y === 15 && (x === 8 || x === 9 || x === 20 || x === 21)) ||
        (y === 16 && (x === 8 || x === 21))))
  ) {
    return 'blush';
  }

  if (mood === 'sadness' && x === 20 && (y === 15 || y === 16)) return 'tear';

  if ((x === 15 && y >= 15 && y <= 17) || (x === 14 && y === 17)) return 'skin-shadow';

  if (
    (mood === 'default' && y === 19 && (x === 14 || x === 15)) ||
    (mood === 'joy' &&
      ((y === 19 && (x === 12 || x === 17)) || (y === 20 && x >= 13 && x <= 16))) ||
    (mood === 'anger' && y === 19 && x >= 13 && x <= 16) ||
    (mood === 'sadness' &&
      ((y === 19 && (x === 14 || x === 15)) || (y === 20 && (x === 13 || x === 16)))) ||
    (mood === 'delight' &&
      ((y === 19 && x >= 13 && x <= 16) || (y === 20 && (x === 14 || x === 15))))
  ) {
    return 'mouth';
  }

  if ((y === 20 && (x === 7 || x === 22)) || ((x + y) % 9 === 0 && x < 9) || (x > 20 && y > 16)) {
    return 'skin-shadow';
  }

  return 'skin';
}

function palette(light: boolean): Record<Tone, string> {
  return {
    hair: light ? '#111111' : '#6f685e',
    'hair-light': light ? '#343434' : '#948c80',
    skin: '#f1d7c5',
    'skin-shadow': '#d5aa98',
    eye: '#111111',
    blush: '#df918f',
    mouth: '#3a2928',
    tear: light ? '#6f9fb2' : '#8bb9c8',
    hoodie: light ? '#171717' : '#49443c',
    'hoodie-light': light ? '#444444' : '#6b6459',
  };
}

/**
 * Draws the lqq.ai-style particle portrait into `canvas`.
 *
 * The grid is 30×32 with generous margins; every pixel springs toward its
 * cell from a scattered start, floats gently, and is pushed away by the
 * pointer. Returns a cleanup function.
 */
export function createPixelAvatar(canvas: HTMLCanvasElement, mood: AvatarMood): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const abort = new AbortController();
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let raf = 0;
  let visible = false;
  let pointerX = -1000;
  let pointerY = -1000;

  const build = () => {
    const next: Particle[] = [];
    for (let gridY = 0; gridY < ROWS; gridY += 1) {
      for (let gridX = 0; gridX < COLS; gridX += 1) {
        const tone = toneAt(gridX, gridY, mood);
        if (!tone) continue;
        const seed = 97 * gridX + 53 * gridY;
        next.push({
          gridX,
          gridY,
          tone,
          x: (0.5 * Math.sin(seed) + 0.5) * width,
          y: (0.5 * Math.cos(1.7 * seed) + 0.5) * height,
          phase: (seed % 37) * 0.31,
          size: tone === 'eye' ? 0.82 : 0.66 + (seed % 5) * 0.045,
        });
      }
    }
    particles = next;
  };

  const layout = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    build();
    if (reducedMotion) draw(0);
  };

  const draw = (time: number) => {
    context.clearRect(0, 0, width, height);
    const colors = palette(document.documentElement.dataset.theme !== 'dark');
    const cell = Math.min(width / 38, height / 34);
    const originX = (width - COLS * cell) / 2;
    const originY = (height - ROWS * cell) / 2;

    for (const particle of particles) {
      const targetX = originX + (particle.gridX + 0.5) * cell;
      const targetY = originY + (particle.gridY + 0.5) * cell;
      let floatX = 0;
      let floatY = 0;
      let repelX = 0;
      let repelY = 0;

      if (!reducedMotion) {
        floatX = 0.7 * Math.sin(0.0012 * time + particle.phase);
        floatY = 0.55 * Math.cos(0.001 * time + particle.phase);
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 76) {
          const strength = ((76 - distance) / 76) * 12;
          repelX = (dx / distance) * strength;
          repelY = (dy / distance) * strength;
        }
      }

      const ease = reducedMotion ? 1 : 0.075;
      particle.x += (targetX + floatX + repelX - particle.x) * ease;
      particle.y += (targetY + floatY + repelY - particle.y) * ease;

      const size = Math.max(2, cell * particle.size);
      context.fillStyle = colors[particle.tone];
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
    raf = visible && !reducedMotion ? window.requestAnimationFrame(tick) : 0;
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

  canvas.addEventListener(
    'pointermove',
    (event) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
    },
    { signal: abort.signal },
  );
  canvas.addEventListener(
    'pointerleave',
    () => {
      pointerX = -1000;
      pointerY = -1000;
    },
    { signal: abort.signal },
  );

  const resizeObserver = new ResizeObserver(() => {
    layout();
    start();
  });
  resizeObserver.observe(canvas);

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) {
        layout();
        start();
      } else {
        stop();
      }
    },
    { threshold: 0.01 },
  );
  intersectionObserver.observe(canvas);

  const themeObserver = new MutationObserver(() => {
    if (reducedMotion) draw(0);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => {
    stop();
    abort.abort();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
  };
}
