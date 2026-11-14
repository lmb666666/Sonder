/**
 * Capsule physics for the about-page stack board.
 *
 * The visual markup and classes stay in AboutTechStack.astro; this module owns
 * measurement, pointer dragging, collision/sleep settling, resize and cleanup.
 */

type Point = { x: number; y: number };
interface PhysicsBody {
  el: HTMLButtonElement;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  vx: number;
  vy: number;
  va: number;
  dropDelay: number;
  dragging: boolean;
  sleeping: boolean;
  restFrames: number;
}

interface DragState {
  body: PhysicsBody;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function closestSegmentPoints(a0: Point, a1: Point, b0: Point, b1: Point): [Point, Point] {
  const d1 = { x: a1.x - a0.x, y: a1.y - a0.y };
  const d2 = { x: b1.x - b0.x, y: b1.y - b0.y };
  const r = { x: a0.x - b0.x, y: a0.y - b0.y };
  const a = d1.x * d1.x + d1.y * d1.y;
  const e = d2.x * d2.x + d2.y * d2.y;
  const f = d2.x * r.x + d2.y * r.y;
  const eps = 1e-8;
  let s = 0;
  let t = 0;

  if (a <= eps && e <= eps) {
    return [a0, b0];
  }

  if (a <= eps) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1.x * r.x + d1.y * r.y;
    if (e <= eps) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1.x * d2.x + d1.y * d2.y;
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }

  return [
    { x: a0.x + d1.x * s, y: a0.y + d1.y * s },
    { x: b0.x + d2.x * t, y: b0.y + d2.y * t },
  ];
}

function capsuleEnds(body: PhysicsBody): [Point, Point] {
  const half = Math.max(0, (body.w - body.h) / 2);
  const dx = Math.cos(body.angle) * half;
  const dy = Math.sin(body.angle) * half;
  return [
    { x: body.x - dx, y: body.y - dy },
    { x: body.x + dx, y: body.y + dy },
  ];
}

function projectedExtents(body: PhysicsBody): Point {
  const c = Math.abs(Math.cos(body.angle));
  const s = Math.abs(Math.sin(body.angle));
  return {
    x: c * (body.w / 2) + s * (body.h / 2),
    y: s * (body.w / 2) + c * (body.h / 2),
  };
}

function renderBody(body: PhysicsBody) {
  body.el.style.transform = `translate3d(${(body.x - body.w / 2).toFixed(2)}px, ${(
    body.y -
    body.h / 2
  ).toFixed(2)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
}

export function initTechPhysics(
  page: HTMLElement,
  controller: AbortController,
  cleanups: Array<() => void>,
  reducedMotion: boolean,
) {
  const board = page.querySelector<HTMLElement>('[data-tech-board]');
  if (!board) return;

  const pillEls = Array.from(board.querySelectorAll<HTMLButtonElement>('[data-tech-pill]'));
  if (pillEls.length === 0) return;

  const resetButton = board.querySelector<HTMLButtonElement>('[data-tech-reset]');
  const bodies: PhysicsBody[] = [];
  let width = 0;
  let height = 0;
  let raf = 0;
  let elapsed = 0;
  let lastTime = 0;
  let idleFrames = 0;
  let drag: DragState | null = null;
  let resizeFrame = 0;
  let activated = false;
  let settleDeadline = Number.POSITIVE_INFINITY;

  const measure = () => {
    width = board.clientWidth;
    height = board.clientHeight;
    bodies.forEach((body, index) => {
      body.w = pillEls[index]?.offsetWidth ?? body.w;
      body.h = pillEls[index]?.offsetHeight ?? body.h;
    });
  };

  const wake = (body: PhysicsBody) => {
    body.sleeping = false;
    body.restFrames = 0;
  };

  const wakeAll = () => bodies.forEach(wake);

  const freezeAll = () => {
    bodies.forEach((body) => {
      if (body.dragging) return;
      body.vx = 0;
      body.vy = 0;
      body.va = 0;
      body.sleeping = true;
      renderBody(body);
    });
    idleFrames = 0;
  };

  const resetLayout = () => {
    measure();
    const gap = 10;
    const margin = 16;
    let cursorX = margin;
    let cursorY = height - margin;
    let rowHeight = 0;
    bodies.forEach((body) => {
      body.angle = 0;
      body.vx = 0;
      body.vy = 0;
      body.va = 0;
      body.dragging = false;
      body.sleeping = false;
      body.restFrames = 0;
      if (cursorX + body.w > width - margin) {
        cursorX = margin;
        cursorY -= rowHeight + gap;
        rowHeight = 0;
      }
      body.x = cursorX + body.w / 2;
      body.y = cursorY - body.h / 2;
      cursorX += body.w + gap;
      rowHeight = Math.max(rowHeight, body.h);
      renderBody(body);
    });
    idleFrames = 0;
    settleDeadline = performance.now() + 900;
  };

  const drop = () => {
    measure();
    const margin = 16;
    const usable = Math.max(1, width - margin * 2);
    elapsed = 0;
    idleFrames = 0;
    settleDeadline = performance.now() + 3200;
    bodies.forEach((body, index) => {
      body.vx = ((index % 3) - 1) * 28;
      body.vy = 0;
      body.va = 0;
      body.angle = ((index % 5) - 2) * 0.08;
      body.x = margin + ((index * 137 + 31) % usable);
      body.y = -body.h / 2 - (index % 5) * 38 - 24;
      body.dropDelay = index * 0.045;
      body.dragging = false;
      body.sleeping = false;
      body.restFrames = 0;
      renderBody(body);
    });
    start();
  };

  const wall = (body: PhysicsBody) => {
    const extent = projectedExtents(body);
    const inset = 3;
    if (body.x - extent.x < inset) {
      body.x = extent.x + inset;
      if (body.vx < 0) body.vx *= -0.32;
    } else if (body.x + extent.x > width - inset) {
      body.x = width - extent.x - inset;
      if (body.vx > 0) body.vx *= -0.32;
    }

    if (body.y + extent.y > height - inset) {
      body.y = height - extent.y - inset;
      if (body.vy > 110) {
        body.vy *= -0.2;
      } else {
        body.vy = 0;
      }
      body.vx *= 0.86;
      body.va *= 0.82;
    } else if (body.y - extent.y < inset && body.vy < 0) {
      body.y = extent.y + inset;
      body.vy *= -0.2;
    }
  };

  const collide = (a: PhysicsBody, b: PhysicsBody) => {
    if (a.sleeping && b.sleeping) return;
    if (a.y < -a.h || b.y < -b.h) return;
    const [a0, a1] = capsuleEnds(a);
    const [b0, b1] = capsuleEnds(b);
    const [pa, pb] = closestSegmentPoints(a0, a1, b0, b1);
    let nx = pb.x - pa.x;
    let ny = pb.y - pa.y;
    let distance = Math.hypot(nx, ny);
    const minDistance = a.h / 2 + b.h / 2;
    if (distance >= minDistance) return;

    if (distance < 0.001) {
      nx = b.x - a.x;
      ny = b.y - a.y;
      distance = Math.hypot(nx, ny) || 1;
    }
    nx /= distance;
    ny /= distance;
    const overlap = minDistance - distance;
    const invA = a.dragging || a.sleeping ? 0 : 1 / a.w;
    const invB = b.dragging || b.sleeping ? 0 : 1 / b.w;
    const invSum = invA + invB || 1;

    a.x -= nx * overlap * (invA / invSum);
    a.y -= ny * overlap * (invA / invSum);
    b.x += nx * overlap * (invB / invSum);
    b.y += ny * overlap * (invB / invSum);

    const relX = b.vx - a.vx;
    const relY = b.vy - a.vy;
    const along = relX * nx + relY * ny;
    if (along < 0) {
      const impulse = (-(1 + 0.12) * along) / invSum;
      a.vx -= impulse * nx * invA;
      a.vy -= impulse * ny * invA;
      b.vx += impulse * nx * invB;
      b.vy += impulse * ny * invB;
    }
  };

  const step = (time: number) => {
    raf = 0;
    if (!drag && performance.now() > settleDeadline) {
      freezeAll();
      lastTime = 0;
      return;
    }
    if (!lastTime) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.025);
    lastTime = time;
    elapsed += dt;
    const substeps = 3;
    const subDt = dt / substeps;
    let moving = false;

    for (let sub = 0; sub < substeps; sub += 1) {
      for (const body of bodies) {
        if (body.sleeping || body.dragging || elapsed < body.dropDelay) continue;
        body.vy += 1480 * subDt;
        body.vx *= Math.pow(0.995, 60 * subDt);
        body.va *= Math.pow(0.986, 60 * subDt);
        body.x += body.vx * subDt;
        body.y += body.vy * subDt;
        body.angle = clamp(body.angle + body.va * subDt, -0.44, 0.44);
        body.va = clamp(body.va, -3.2, 3.2);
        wall(body);
      }

      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < bodies.length; i += 1) {
          for (let j = i + 1; j < bodies.length; j += 1) {
            const a = bodies[i];
            const b = bodies[j];
            if (!a || !b) continue;
            if (elapsed < a.dropDelay || elapsed < b.dropDelay) continue;
            collide(a, b);
          }
        }
      }
    }

    bodies.forEach((body) => {
      if (!body.sleeping && !body.dragging && elapsed > body.dropDelay) {
        const speed = Math.hypot(body.vx, body.vy);
        if (speed < 14 && Math.abs(body.va) < 0.025) {
          body.restFrames += 1;
          if (body.restFrames > 16) {
            body.sleeping = true;
            body.vx = 0;
            body.vy = 0;
            body.va = 0;
          }
        } else {
          body.restFrames = 0;
        }
      }

      renderBody(body);
      if (
        !body.sleeping &&
        !body.dragging &&
        elapsed > body.dropDelay &&
        (Math.abs(body.vx) > 8 || Math.abs(body.vy) > 8 || Math.abs(body.va) > 0.035)
      ) {
        moving = true;
      }
    });

    const dropPending = bodies.some((body) => elapsed < body.dropDelay);
    if (drag || moving || dropPending) {
      idleFrames = 0;
    } else {
      idleFrames += 1;
    }

    if (idleFrames > 32) {
      lastTime = 0;
      return;
    }
    raf = window.requestAnimationFrame(step);
  };

  const start = () => {
    if (reducedMotion) {
      resetLayout();
      return;
    }
    if (!raf) {
      lastTime = 0;
      raf = window.requestAnimationFrame(step);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    const pill = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tech-pill]');
    if (!pill) return;
    const index = Number(pill.dataset.index);
    const body = bodies[index];
    if (!body) return;
    wakeAll();
    settleDeadline = Number.POSITIVE_INFINITY;
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    try {
      pill.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers and some embedded browsers do not support capture.
    }
    pill.classList.add('is-dragging');
    body.dragging = true;
    body.vx = 0;
    body.vy = 0;
    body.va = 0;
    drag = {
      body,
      pointerId: event.pointerId,
      offsetX: x - body.x,
      offsetY: y - body.y,
      lastX: x,
      lastY: y,
      lastTime: event.timeStamp,
    };
    start();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const body = drag.body;
    const extent = projectedExtents(body);
    body.x = clamp(x - drag.offsetX, extent.x + 3, width - extent.x - 3);
    body.y = clamp(y - drag.offsetY, extent.y + 3, height - extent.y - 3);
    const dt = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
    body.vx = clamp((body.x - (drag.lastX - drag.offsetX)) / dt, -1800, 1800);
    body.vy = clamp((body.y - (drag.lastY - drag.offsetY)) / dt, -1800, 1800);
    body.angle += (body.x - (drag.lastX - drag.offsetX)) * 0.0016;
    body.angle = clamp(body.angle, -0.44, 0.44);
    drag.lastX = body.x + drag.offsetX;
    drag.lastY = body.y + drag.offsetY;
    drag.lastTime = event.timeStamp;
    renderBody(body);
    start();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.body.dragging = false;
    pillEls.forEach((pill) => pill.classList.remove('is-dragging'));
    drag = null;
    settleDeadline = performance.now() + 2200;
    start();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const pill = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tech-pill]');
    if (!pill) return;
    const vectors: Record<string, Point> = {
      ArrowLeft: { x: -18, y: 0 },
      ArrowRight: { x: 18, y: 0 },
      ArrowUp: { x: 0, y: -18 },
      ArrowDown: { x: 0, y: 18 },
    };
    const vector = vectors[event.key];
    if (!vector) return;
    event.preventDefault();
    const body = bodies[Number(pill.dataset.index)];
    if (!body) return;
    const extent = projectedExtents(body);
    body.x = clamp(body.x + vector.x, extent.x + 3, width - extent.x - 3);
    body.y = clamp(body.y + vector.y, extent.y + 3, height - extent.y - 3);
    body.vx = vector.x * 4;
    body.vy = vector.y * 4;
    wake(body);
    settleDeadline = performance.now() + 1800;
    renderBody(body);
    start();
  };

  const onResize = () => {
    if (!activated || resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (board.clientWidth === width && board.clientHeight === height) return;
      if (reducedMotion) {
        resetLayout();
      } else {
        drop();
      }
    });
  };

  pillEls.forEach((pill) => {
    const index = Number(pill.dataset.index);
    bodies.push({
      el: pill,
      x: 0,
      y: 0,
      w: pill.offsetWidth || 120,
      h: pill.offsetHeight || 48,
      angle: 0,
      vx: 0,
      vy: 0,
      va: 0,
      dropDelay: index * 0.045,
      dragging: false,
      sleeping: false,
      restFrames: 0,
    });
  });

  const activate = () => {
    if (activated) return;
    activated = true;
    board.classList.add('is-physics');
    board.dataset.physics = 'ready';
    measure();
    if (reducedMotion) {
      resetLayout();
    } else {
      drop();
    }

    if (!reducedMotion) {
      board.addEventListener('pointerdown', onPointerDown, { signal: controller.signal });
      window.addEventListener('pointermove', onPointerMove, { signal: controller.signal });
      window.addEventListener('pointerup', onPointerUp, { signal: controller.signal });
      window.addEventListener('pointercancel', onPointerUp, { signal: controller.signal });
      board.addEventListener('keydown', onKeyDown, { signal: controller.signal });
    }
    resetButton?.addEventListener(
      'click',
      () => {
        resetLayout();
        if (!reducedMotion) start();
      },
      { signal: controller.signal },
    );

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(onResize);
      observer.observe(board);
      cleanups.push(() => observer.disconnect());
    }
  };

  if (reducedMotion) {
    activate();
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        activate();
        observer.disconnect();
      },
      { threshold: 0.06 },
    );
    observer.observe(board);
    cleanups.push(() => observer.disconnect());
  } else {
    activate();
  }

  cleanups.push(() => {
    if (raf) window.cancelAnimationFrame(raf);
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    raf = 0;
    drag = null;
    bodies.forEach((body) => body.el.classList.remove('is-dragging'));
  });
}
