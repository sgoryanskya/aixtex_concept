/* «Оранжевый перелив», блок «Кто это»: рука из точек (виртуальный сотрудник) тянется к живой руке человека.
   Точки — зеркало живой руки в полутоне (scripts/art/hands.py → public/img/art/hand-dots.json), три байта на точку.
   По прокрутке точки слетаются из потоков работы слева и собирают руку от запястья к кончику пальца (хаос → порядок),
   живая рука подходит навстречу, в зазоре загорается искра и над ней — результат роли.
   Потом по руке изредка проходит волна света к кончику пальца; при смене роли волна ярче и искра вспыхивает.
   Рисуется в canvas 2D только пока блок виден; при уменьшенном движении рука сразу собрана и стоит. */
import { gsap, $, reduced, isMobile } from './ax';

type HandData = {
  ratio: number;
  s: number;
  tip: [number, number];
  tipD: [number, number];
  wrist: [number, number];
  live: [number, number];
  n: number;
  dots: string;
};

let cache: Promise<HandData> | null = null;
const load = (url: string) => (cache ??= fetch(url).then((r) => r.json() as Promise<HandData>));

/* цвет по пути от запястья (0) к кончику (1); предплечье — меньше нуля. Те же ступени, что в hands.py */
const STOPS: [number, number, number, number][] = [
  [-1, 185, 166, 255],
  [-0.45, 255, 110, 142],
  [0, 255, 94, 26],
  [0.25, 255, 178, 94],
  [0.6, 255, 222, 200],
  [1, 255, 246, 240],
];
const NC = 20;
const NA = 6;
const tOf = (c: number) => -1 + (2.05 * c) / (NC - 1);
const cOf = (t: number) => Math.max(0, Math.min(NC - 1, Math.round(((t + 1) / 2.05) * (NC - 1))));
const FILL: string[] = [];
for (let c = 0; c < NC; c++) {
  const t = tOf(c);
  /* ступень выше последней (кончик пальца в волне) берёт самый светлый цвет */
  let k = STOPS.findIndex((s) => s[0] >= t);
  if (k < 0) k = STOPS.length - 1;
  if (k === 0) k = 1;
  const [t0, r0, g0, b0] = STOPS[k - 1];
  const [t1, r1, g1, b1] = STOPS[Math.min(k, STOPS.length - 1)];
  const f = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
  const rgb = [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f].map(Math.round).join(' ');
  for (let a = 0; a < NA; a++) FILL.push(`rgb(${rgb} / ${((a + 1) / NA).toFixed(3)})`);
}

/* детерминированный шум: одна и та же сборка при каждой загрузке */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FLY = 0.42; // доля прокрутки, за которую летит одна точка

export function mountHands(sec: HTMLElement): { kill(): void } | null {
  const found = $<HTMLElement>('[data-hands]', sec);
  if (!found || !found.getClientRects().length) return null;
  const el: HTMLElement = found;
  const cv = $<HTMLCanvasElement>('[data-hands-dots]', el)!;
  const spark = $<HTMLElement>('[data-hands-spark]', el)!;
  const stage = $<HTMLElement>('.asst__stage', sec)!;
  const ctx = cv.getContext('2d')!;

  let dead = false;
  let raf = 0;
  let idle = 0;
  let visible = false;
  let p = reduced ? 1 : 0;
  let wave = -1;
  let strong = false;
  let flashed = false;

  /* точки: координаты в долях слоя, яркость, путь к кончику, откуда летит, когда стартует */
  let N = 0;
  let I: Uint8Array, J: Uint8Array;
  let X: Float32Array, Y: Float32Array, K: Float32Array, T: Float32Array, C: Uint8Array;
  let SX: Float32Array, SY: Float32Array, WV: Float32Array, D: Float32Array;
  let use: Uint8Array;
  let data: HandData | null = null;
  let step = 0;
  let thin = 1;

  const setVars = () => {
    el.style.setProperty('--ah-in', p.toFixed(3));
    const on = Math.max(0, Math.min(1, (p - 0.86) / 0.14));
    stage.style.setProperty('--ah-on', on.toFixed(3));
  };

  function prepare(d: HandData) {
    data = d;
    const raw = atob(d.dots);
    N = d.n;
    I = new Uint8Array(N);
    J = new Uint8Array(N);
    X = new Float32Array(N);
    Y = new Float32Array(N);
    K = new Float32Array(N);
    T = new Float32Array(N);
    C = new Uint8Array(N);
    SX = new Float32Array(N);
    SY = new Float32Array(N);
    WV = new Float32Array(N);
    D = new Float32Array(N);
    use = new Uint8Array(N);
    const [wx, wy] = d.wrist;
    const [tx, ty] = d.tipD;
    const ax = tx - wx;
    const ay = (ty - wy) * d.ratio;
    const l2 = ax * ax + ay * ay;
    const r = rng(20261113);
    for (let n = 0; n < N; n++) {
      const i = raw.charCodeAt(n * 3);
      const j = raw.charCodeAt(n * 3 + 1);
      I[n] = i;
      J[n] = j;
      X[n] = (i + 0.5) * d.s;
      Y[n] = ((j + 0.5) * d.s) / d.ratio;
      K[n] = raw.charCodeAt(n * 3 + 2) / 255;
      const t = Math.max(-1, Math.min(1.05, ((X[n] - wx) * ax + (Y[n] - wy) * d.ratio * ay) / l2));
      T[n] = t;
      C[n] = cOf(t);
      /* хаос: точки приходят слева потоками работы, разброс по высоте как у входящих линий */
      SX[n] = wx - 0.05 - 0.24 * r();
      SY[n] = wy + (r() - 0.5) * 0.95;
      WV[n] = (r() - 0.5) * 0.18;
      D[n] = (1 - FLY) * Math.max(0, Math.min(1, (t + 0.35) / 1.4)) * 0.92 + 0.08 * (1 - FLY) * r();
    }
  }

  function size() {
    if (!data) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    /* шаг сетки на экране: если точки мельче 3,4 px, берётся каждая вторая — рука остаётся полутоном, а не шумом */
    const css = data.s * w;
    thin = css < 1.8 ? 3 : css < 3.4 ? 2 : 1;
    for (let n = 0; n < N; n++) use[n] = I[n] % thin === 0 && J[n] % thin === 0 ? 1 : 0;
    step = data.s * cv.width * thin;
    draw(performance.now());
  }

  function boostAt(t: number, now: number) {
    if (wave < 0) return 0;
    const u = (now - wave) / (strong ? 1300 : 1700);
    const c = -0.4 + 1.55 * u;
    const z = (t - c) / 0.13;
    return Math.exp(-z * z) * (strong ? 1 : 0.6);
  }

  function draw(now: number) {
    if (!data || !cv.width) return;
    const W = cv.width;
    const H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const paths: (Path2D | undefined)[] = new Array(NC * NA);
    for (let n = 0; n < N; n++) {
      if (!use[n]) continue;
      const local = p >= 1 ? 1 : Math.max(0, Math.min(1, (p - D[n]) / FLY));
      if (local <= 0.002) continue;
      const e = ease(local);
      const b = boostAt(T[n], now);
      const x = (SX[n] + (X[n] - SX[n]) * e) * W;
      const y = (SY[n] + (Y[n] - SY[n]) * e + Math.sin(e * Math.PI) * WV[n]) * H;
      const k = K[n];
      const rad = step * (0.12 + 0.3 * k) * (1 + 0.55 * b) * (0.45 + 0.55 * e);
      const a = Math.min(1, (0.3 + 0.7 * k) * (0.25 + 0.75 * e) * (1 + 0.9 * b));
      const c = Math.min(NC - 1, C[n] + Math.round(b * 5));
      const lv = Math.min(NA - 1, Math.floor(a * NA));
      const key = c * NA + lv;
      const path = (paths[key] ??= new Path2D());
      path.moveTo(x + rad, y);
      path.arc(x, y, rad, 0, TAU);
    }
    for (let q = 0; q < paths.length; q++) {
      const path = paths[q];
      if (!path) continue;
      ctx.fillStyle = FILL[q];
      ctx.fill(path);
    }
  }

  function frame(now: number) {
    raf = 0;
    if (dead) return;
    if (wave >= 0) {
      const u = (now - wave) / (strong ? 1300 : 1700);
      if (!flashed && -0.4 + 1.55 * u > 1) {
        flashed = true;
        spark.classList.remove('is-flash');
        void spark.offsetWidth;
        spark.classList.add('is-flash');
      }
      if (u > 1) {
        wave = -1;
        armIdle();
      }
    }
    draw(now);
    if (wave >= 0 && visible) schedule();
  }
  const schedule = () => {
    if (!raf && !dead) raf = requestAnimationFrame(frame);
  };

  function startWave(isStrong: boolean) {
    if (reduced || dead || !visible || p < 1) return;
    wave = performance.now();
    strong = isStrong;
    flashed = false;
    clearTimeout(idle);
    schedule();
  }
  /* тихая волна раз в несколько секунд, пока блок на экране и посетитель не меняет роли */
  function armIdle() {
    clearTimeout(idle);
    if (reduced || dead || !visible) return;
    idle = window.setTimeout(() => startWave(false), 5200);
  }
  const onBurst = () => startWave(true);
  sec.addEventListener('asst-burst', onBurst);

  /* сборка по прокрутке: от входа слоя снизу до момента, когда блок встал в экран */
  const proxy = { p };
  const tween = reduced
    ? null
    : gsap.to(proxy, {
        p: 1,
        ease: 'none',
        /* к моменту, когда блок встал в экран, рука собрана: на компьютере слой начинается ниже заголовка, на телефоне идёт в потоке */
        scrollTrigger: { trigger: el, start: 'top bottom', end: () => (isMobile() ? 'center 62%' : 'top 34%'), scrub: 0.8, invalidateOnRefresh: true },
        onUpdate: () => {
          const was = p;
          p = proxy.p;
          setVars();
          schedule();
          if (was < 1 && p >= 1) armIdle();
        },
      });
  setVars();

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        schedule();
        if (p >= 1 && wave < 0) armIdle();
      } else {
        clearTimeout(idle);
        cancelAnimationFrame(raf);
        raf = 0;
        wave = -1;
      }
    },
    { rootMargin: '10% 0px' },
  );
  io.observe(el);
  const ro = new ResizeObserver(() => size());
  ro.observe(el);

  load(el.dataset.src!).then(
    (d) => {
      if (dead) return;
      prepare(d);
      size();
    },
    () => {
      /* точки не загрузились: остаются живая рука и искра */
    },
  );

  return {
    kill() {
      dead = true;
      clearTimeout(idle);
      cancelAnimationFrame(raf);
      tween?.scrollTrigger?.kill();
      tween?.kill();
      io.disconnect();
      ro.disconnect();
      sec.removeEventListener('asst-burst', onBurst);
      el.style.removeProperty('--ah-in');
      stage.style.removeProperty('--ah-on');
      ctx.clearRect(0, 0, cv.width, cv.height);
    },
  };
}
