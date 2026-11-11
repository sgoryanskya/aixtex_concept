/* Мята · рифлёное стекло на первом экране.
   Слева от кромки видна сцена как есть, приглушённо: тёмная зелень и тонкие запутанные нити.
   Справа её показывает рифлёное стекло. Стекло матовое: под ним сцена сильно размыта, каждая рифля берёт
   узкую полосу размытой сцены и растягивает её на всю ширину рифли. Нити превращаются в ровные вертикальные
   полосы света мяты и шампани, без рваных отрезков. Кромка едет по прокрутке (state.edge), свет медленно
   дрейфует во времени. Курсор не участвует. Заголовок — обычный текст поверх холста. */
import { reduced, isMobile } from './ax';

export type Glass = {
  /* edge — кромка стекла в долях ширины, zoom — наезд камеры на сцену */
  state: { edge: number; zoom: number };
  start(): void;
  stop(): void;
};

type RGB = [number, number, number];
const hexRgb = (h: string): RGB => {
  let m = h.trim().replace('#', '');
  if (m.length === 3) m = [...m].map((c) => c + c).join('');
  const n = parseInt(m, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* постоянное зерно: картина нитей одна и та же при каждой загрузке */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* во сколько раз уменьшена сцена под стеклом: уменьшение и обратное растяжение и дают матовое размытие */
const LO = 10;

export function createGlass(cv: HTMLCanvasElement, onEdge?: (px: number) => void): Glass | null {
  const ctx = cv.getContext('2d');
  const lo = document.createElement('canvas');
  const lx = lo.getContext('2d');
  if (!ctx || !lx) return null;

  const state = { edge: 0.58, zoom: 1 };
  const cs = getComputedStyle(document.documentElement);
  const col = {
    ink: hexRgb(cs.getPropertyValue('--ink') || '#050A0A'),
    mint: hexRgb(cs.getPropertyValue('--signal') || '#3FD9B4'),
    base: hexRgb(cs.getPropertyValue('--metal-base') || '#19A486'),
    deep: hexRgb(cs.getPropertyValue('--metal-dark') || '#053329'),
    light: hexRgb(cs.getPropertyValue('--metal-light') || '#93EBD3'),
    champ: hexRgb(cs.getPropertyValue('--ice') || '#E2D3B5'),
  };

  const mob = isMobile();
  const R = rng(11);
  /* нити: кубические кривые через всю сцену, концы и изгибы медленно дрожат */
  const threads = Array.from({ length: mob ? 12 : 20 }, (_, i) => ({
    y0: 0.1 + R() * 0.8,
    y1: 0.1 + R() * 0.8,
    c1: R() * 1.4 - 0.2,
    c2: R() * 1.4 - 0.2,
    ph: R() * Math.PI * 2,
    sp: 0.06 + R() * 0.1,
    w: 0.7 + R() * 0.8,
    a: 0.16 + R() * 0.22,
    c: [col.champ, col.light, col.mint][i % 3],
  }));
  /* световые поля: под стеклом они дают ровные полосы мяты и шампани, в хаосе — едва заметный отсвет */
  const fields = [
    { x: 0.78, y: 0.32, r: 0.46, c: col.mint, a: 0.7, f: 0.05 },
    { x: 0.94, y: 0.78, r: 0.4, c: col.champ, a: 0.55, f: 0.04 },
    { x: 0.56, y: 0.86, r: 0.38, c: col.base, a: 0.5, f: 0.06 },
    { x: 0.66, y: 0.08, r: 0.3, c: col.light, a: 0.32, f: 0.07 },
  ];

  let W = 0;
  let H = 0;
  let dpr = 1;
  let fw = 28;
  let raf = 0;
  let on = false;
  let seen = true;
  let shade: CanvasGradient | null = null;
  const t0 = performance.now();

  const size = () => {
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(devicePixelRatio || 1, mob ? 1.25 : 1.5);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    lo.width = Math.ceil(W / LO);
    lo.height = Math.ceil(H / LO);
    fw = mob ? 20 : Math.max(26, Math.min(40, W * 0.024));
    /* одна рифля: мягкий блик у левой грани, лёгкая тень у правой */
    shade = ctx.createLinearGradient(0, 0, fw, 0);
    shade.addColorStop(0, 'rgba(255,255,255,0.13)');
    shade.addColorStop(0.18, 'rgba(255,255,255,0.03)');
    shade.addColorStop(0.55, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.16)');
  };

  /* общий рисунок сцены: s — масштаб холста, k — толщина нитей (в уменьшенной сцене нити толще, чтобы дать свет) */
  const paint = (g: CanvasRenderingContext2D, s: number, t: number, k: number, light: number) => {
    g.setTransform(s, 0, 0, s, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgba(col.ink, 1));
    bg.addColorStop(0.55, rgba(col.deep, 0.92));
    bg.addColorStop(1, rgba(col.ink, 1));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const z = state.zoom;
    g.translate(W / 2, H * 0.46);
    g.scale(z, z);
    g.translate(-W / 2, -H * 0.46);
    g.globalCompositeOperation = 'lighter';
    fields.forEach((f, i) => {
      const x = (f.x + 0.05 * Math.sin(t * f.f + i * 1.7)) * W;
      const y = (f.y + 0.06 * Math.cos(t * f.f * 0.8 + i)) * H;
      const r = f.r * Math.max(W, H);
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(f.c, f.a * light));
      rg.addColorStop(0.5, rgba(f.c, f.a * light * 0.32));
      rg.addColorStop(1, rgba(f.c, 0));
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'source-over';
    g.lineCap = 'round';
    threads.forEach((th) => {
      const a = Math.sin(t * th.sp + th.ph);
      const q = Math.cos(t * th.sp * 0.7 + th.ph * 1.3);
      g.strokeStyle = rgba(th.c, th.a);
      g.lineWidth = th.w * k;
      g.beginPath();
      g.moveTo(-0.08 * W, (th.y0 + 0.03 * q) * H);
      g.bezierCurveTo(0.3 * W, (th.c1 + 0.12 * a) * H, 0.66 * W, (th.c2 - 0.12 * q) * H, 1.08 * W, (th.y1 + 0.03 * a) * H);
      g.stroke();
    });
  };

  const draw = (t: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ex = Math.max(0, Math.min(W, state.edge * W));
    onEdge?.(ex);
    /* хаос слева от кромки — приглушённый: беспорядок тусклее порядка */
    if (ex > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, ex, H);
      ctx.clip();
      paint(ctx, dpr, t, 1, 0.55);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (ex >= W) return;
    /* под стеклом: уменьшенная сцена, свет ярче. Каждая рифля растягивает узкую полосу на всю свою ширину */
    paint(lx, 1 / LO, t, 5, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const sw = (fw * 0.45) / LO;
    for (let x = ex; x < W; x += fw) {
      const c = (x + fw / 2) / LO;
      const s0 = Math.max(0, Math.min(lo.width - sw, c - sw / 2));
      ctx.drawImage(lo, s0, 0, sw, lo.height, x, 0, fw + 0.5, H);
    }
    ctx.save();
    ctx.fillStyle = shade!;
    for (let x = ex; x < W; x += fw) {
      ctx.setTransform(dpr, 0, 0, dpr, x * dpr, 0);
      ctx.fillRect(0, 0, fw, H);
    }
    ctx.restore();
    /* кромка стекла: мягкая тень на сцене и тонкая светлая грань */
    if (ex > 1) {
      const sh = ctx.createLinearGradient(ex - 28, 0, ex, 0);
      sh.addColorStop(0, 'rgba(0,0,0,0)');
      sh.addColorStop(1, 'rgba(0,0,0,0.24)');
      ctx.fillStyle = sh;
      ctx.fillRect(ex - 28, 0, 28, H);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillRect(ex, 0, 1, H);
    }
  };

  const frame = () => {
    raf = 0;
    if (!on) return;
    if (seen && !document.hidden) draw((performance.now() - t0) / 1000);
    if (!reduced) raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
  const onResize = () => {
    size();
    if (reduced && on) draw(0);
  };

  return {
    state,
    start() {
      if (on) return;
      on = true;
      size();
      io.observe(cv);
      addEventListener('resize', onResize);
      if (reduced) draw(0);
      else raf = requestAnimationFrame(frame);
    },
    stop() {
      on = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      removeEventListener('resize', onResize);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
    },
  };
}
