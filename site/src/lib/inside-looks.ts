/* Блок «Внутри агента»: своя сцена у каждой палитры, движение по прокрутке секции.
   Каждая сцена живёт в gsap.context: при смене палитры откатывается целиком. На телефоне и при
   prefers-reduced-motion сцена сразу в конечном состоянии */
import { gsap, $, $$, reduced, isMobile } from './ax';

export type InsideMode = { kill(): void };
/* redraw: перерисовать сцену по текущим значениям. При пересчёте ScrollTrigger возвращает шкалу на место
   без onUpdate, и без этого сцена остаётся в начальном кадре, хотя прокрутка уже в конце блока */
type Spec = { scrub(tl: gsap.core.Timeline): void; final(): void; live?(): () => void; redraw?(): void };

const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* повторяемый разброс: картинка одна и та же при каждой загрузке */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grow<T extends Element>(g: Element, n: number, tag: string): T[] {
  while (g.children.length > n) g.lastChild!.remove();
  while (g.children.length < n) g.appendChild(document.createElementNS(SVG_NS, tag));
  return [...g.children] as T[];
}

function run(spec: Spec): InsideMode {
  const sec = $('[data-ex]')!;
  const ctx = gsap.context(() => {});
  ctx.add(() => {
    if (reduced || isMobile()) return spec.final();
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        invalidateOnRefresh: true,
        onRefresh: () => spec.redraw && requestAnimationFrame(() => spec.redraw!()),
      },
      defaults: { ease: 'none' },
    });
    spec.scrub(tl);
    tl.to({}, { duration: 0.12 }, 0.88);
  });
  const stop = spec.live?.();
  return {
    kill() {
      stop?.();
      ctx.revert();
    },
  };
}

/* ---------- Сигнал: просторный веер гладких нитей стягивается в одну линию ----------
   Из плашки «Виртуальный сотрудник» выходит широкий веер плавных нитей; на них глазурованные бусины — двенадцать
   составляющих трёх слоёв. По прокрутке фронт идёт слева направо: нити сходятся, бусины садятся на линию
   по своим местам, подписи гаснут, под линией появляются три слоя. Порядок ярче хаоса: нити серые,
   а там, где сошлись, — оранжевые; линия — градиент меди с мягким свечением */
type Strand = { s: number; f: number; ph: number; w: number; o: number };
type Bead = { st: number; xi: number; u: number; end: boolean };
function signal(el: HTMLElement) {
  const svg = $<SVGSVGElement>('[data-iw-web]', el)!;
  const face = $('[data-iw-face]', el)!;
  const caps = $$('[data-iw-cap]', el);
  const tags = $$('[data-iw-tag]', el);
  const line = $('[data-iw-line]', svg)!;
  const glow = $('[data-iw-glow]', svg)!;
  const sheet = $('[data-iw-sheet]', svg)!;
  const gStr = $('[data-iw-str]', svg)!;
  const sStops = $$('stop', gStr);
  const gLine = $('[data-iw-lg]', svg)!;
  const gSheet = $('[data-iw-shg]', svg)!;
  const mob = isMobile();
  const R = rng(7);
  const LY = mob ? 0.52 : 0.6;
  const XE = mob ? 1.02 : 1.035;
  const M = mob ? 30 : 48;
  const box = { W: 1, H: 1, x0: 0, x1: 1, top: 0, hx: 0, hy: 0, bot: 1 };

  /* линия: от правого края плашки до правого поля; веер не заходит под заголовок и строку внизу */
  const measure = () => {
    box.W = svg.clientWidth || 1;
    box.H = svg.clientHeight || 1;
    const b = svg.getBoundingClientRect();
    const f = face.getBoundingClientRect();
    const head = $('.ex__head')?.getBoundingClientRect();
    const foot = $('.ex__foot')?.getBoundingClientRect();
    box.x0 = mob ? 0 : (f.right - b.left + 18) / box.W;
    box.x1 = 1 - (mob || !head ? 0 : head.left - b.left) / box.W;
    box.top = mob ? 14 : Math.max(96, box.H * 0.12);
    box.hx = mob || !head ? -1 : head.right - b.left + 30;
    box.hy = mob || !head ? 0 : head.bottom - b.top + 44;
    box.bot = mob || !foot ? box.H - 14 : foot.top - b.top - 30;
    svg.setAttribute('viewBox', `0 0 ${box.W.toFixed(0)} ${box.H.toFixed(0)}`);
    gStr.setAttribute('x1', (box.x0 * box.W).toFixed(1));
    gStr.setAttribute('x2', (XE * box.W).toFixed(1));
    gLine.setAttribute('x1', (box.x0 * box.W).toFixed(1));
    gLine.setAttribute('x2', (box.x1 * box.W).toFixed(1));
    gSheet.setAttribute('y1', box.top.toFixed(1));
    gSheet.setAttribute('y2', box.bot.toFixed(1));
    $$('stop', gSheet)[1].setAttribute('offset', ((LY * box.H - box.top) / (box.bot - box.top)).toFixed(3));
    if (!mob) {
      const seg = (box.x1 - box.x0) / 3;
      caps.forEach((c, g) => {
        c.style.left = ((box.x0 + seg * (g + 0.04)) * 100).toFixed(2) + '%';
        c.style.width = Math.max(180, seg * box.W - 36).toFixed(0) + 'px';
      });
    }
  };
  measure();

  /* нити: подписанные идут через бусины, остальные заполняют веер, гуще к середине */
  const strands: Strand[] = [];
  const beads: Bead[] = [];
  const named = [-0.55, 0.5, -0.95, 0.08, -0.32, 0.85, -0.74, 0.3, -0.12, 0.98, -0.6, 0.6];
  const ups = mob ? [] : named;
  tags.forEach((_, k) => {
    const g = Math.floor(k / 4), j = k % 4;
    const u = (g + 0.04 + j * 0.24) / 3;
    const xi = lerp(box.x0, box.x1, 0.07 + u * 0.9) + (R() - 0.5) * 0.02;
    const s = ups[k] ?? (k % 2 ? 0.6 : -0.6);
    const f = 0.7 + R() * 0.9;
    strands.push({ s, f, ph: -f * xi, w: 1.15, o: 0.78 });
    beads.push({ st: strands.length - 1, xi, u, end: xi > 0.8 });
  });
  const fill = mob ? 12 : 24;
  for (let i = 0; i < fill; i++) {
    const v = -1 + (2 * (i + 0.5)) / fill + (R() - 0.5) * 0.06;
    const s = Math.sign(v) * Math.abs(v) ** 1.25;
    strands.push({ s, f: 0.6 + R() * 1.3, ph: R(), w: 0.6 + R() * 0.55, o: 0.62 - 0.36 * Math.abs(s) });
  }

  const paths = grow<SVGPathElement>($('[data-iw-strands]', svg)!, strands.length, 'path');
  paths.forEach((p, i) => {
    p.setAttribute('stroke-width', strands[i].w.toFixed(2));
    p.style.opacity = strands[i].o.toFixed(2);
  });
  /* бусина: тень, жемчужная глазурь и поверх неё оранжевая — проявляется, когда бусина садится на линию */
  const gB = $('[data-iw-beads]', svg)!;
  const shadows = grow<SVGEllipseElement>(gB, beads.length, 'ellipse');
  const pearls = grow<SVGCircleElement>(gB, beads.length * 2, 'circle').slice(beads.length);
  const ambers = grow<SVGCircleElement>(gB, beads.length * 3, 'circle').slice(beads.length * 2);
  const rB = mob ? 4.2 : 5.6;
  shadows.forEach((e) => (e.setAttribute('fill', 'url(#iw-drop)'), e.setAttribute('rx', (rB * 1.9).toFixed(1)), e.setAttribute('ry', (rB * 1.1).toFixed(1))));
  pearls.forEach((c) => (c.setAttribute('fill', 'url(#iw-pearl)'), c.setAttribute('r', rB.toFixed(1))));
  ambers.forEach((c) => (c.setAttribute('fill', 'url(#iw-amber)'), c.setAttribute('r', rB.toFixed(1))));
  tags.forEach((t, k) => t.classList.toggle('is-end', beads[k].end));
  const capAt = [0.5, 0.68, 0.86];

  const st = { T: 0 };
  const prog = (u: number, T: number) => smooth(clamp01((T - clamp01(u) * 0.55) / 0.45));
  const draw = () => {
    const { W, H, x0, x1, top, hx, hy, bot } = box;
    const T = st.T;
    const ly = LY * H;
    /* высота нити в точке x (доля ширины) */
    const yAt = (sd: Strand, x: number) => {
      const u = (x - x0) / (x1 - x0);
      const px = x * W;
      const pinch = 0.16 + 0.84 * smooth(clamp01((x - x0) / 0.12));
      const g = sd.s * 0.8 + 0.2 * Math.sin(2 * Math.PI * (sd.f * x + sd.ph));
      const ceil = px < hx ? hy : lerp(hy, top, smooth(clamp01((px - hx) / 160)));
      const span = g < 0 ? ly - Math.max(top, hx < 0 ? top : ceil) : bot - ly;
      return ly + g * span * pinch * (1 - prog(u, T));
    };
    const lo: number[] = [], hi: number[] = [];
    const xs = Array.from({ length: M + 1 }, (_, i) => lerp(x0, XE, i / M));
    strands.forEach((sd, k) => {
      const pts = xs.map((x) => [x * W, yAt(sd, x)]);
      pts.forEach(([, y], i) => {
        lo[i] = Math.min(lo[i] ?? y, y);
        hi[i] = Math.max(hi[i] ?? y, y);
      });
      paths[k].setAttribute('d', curve(pts));
    });
    const top_ = xs.map((x, i) => [x * W, lo[i]]);
    const bot_ = xs.map((x, i) => [x * W, hi[i]]).reverse();
    sheet.setAttribute('d', curve(top_) + 'L' + curve(bot_).slice(1) + 'Z');
    /* граница цвета нитей идёт вместе с фронтом схождения */
    const uf = (T - 0.225) / 0.55;
    const off = clamp01((lerp(x0, x1, uf) - x0) / (XE - x0));
    sStops[1].setAttribute('offset', Math.max(0, off - 0.03).toFixed(3));
    sStops[2].setAttribute('offset', Math.min(1, off + 0.12).toFixed(3));
    beads.forEach((b, k) => {
      const p = prog(b.u, T);
      const x = lerp(b.xi, lerp(x0, x1, b.u), p);
      const y = lerp(yAt(strands[b.st], b.xi), ly, p);
      const px = x * W;
      shadows[k].setAttribute('cx', px.toFixed(1));
      shadows[k].setAttribute('cy', (y + rB * 0.9).toFixed(1));
      pearls[k].setAttribute('cx', px.toFixed(1));
      pearls[k].setAttribute('cy', y.toFixed(1));
      ambers[k].setAttribute('cx', px.toFixed(1));
      ambers[k].setAttribute('cy', y.toFixed(1));
      ambers[k].style.opacity = smooth(clamp01(p * 1.25)).toFixed(3);
      shadows[k].style.opacity = (1 - 0.6 * p).toFixed(3);
      const t = tags[k];
      t.style.transform = `translate(${px.toFixed(1)}px, ${y.toFixed(1)}px)`;
      t.style.opacity = (1 - smooth(clamp01(p * 3))).toFixed(3);
    });
    const ul = clamp01((T - 0.2) / 0.6);
    const d = ul > 0 ? `M${(x0 * W).toFixed(1)} ${ly.toFixed(1)}H${(lerp(x0, x1, ul) * W).toFixed(1)}` : '';
    line.setAttribute('d', d);
    glow.setAttribute('d', d);
    if (!mob) caps.forEach((c, g) => {
      const o = smooth(clamp01((T - capAt[g]) / 0.1));
      c.style.opacity = o.toFixed(3);
      c.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
    });
  };
  return run({
    redraw: draw,
    final() {
      st.T = mob ? 0.55 : 1;
      draw();
    },
    scrub(tl) {
      st.T = 0;
      draw();
      tl.to(st, { T: 1, duration: 0.64, onUpdate: draw }, 0.06);
    },
    live() {
      const re = () => {
        measure();
        draw();
      };
      addEventListener('resize', re);
      return () => {
        removeEventListener('resize', re);
        caps.forEach((c) => c.removeAttribute('style'));
        tags.forEach((t) => t.removeAttribute('style'));
      };
    },
  });
}

/* гладкая кривая через точки: Catmull-Rom в кубические Безье */
function curve(pts: number[][]) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ---------- Ультрамарин: матрица нейронов на трёх пластинах сходится в один луч ----------
   Слои — три стеклянные пластины, на каждой четыре нейрона-составляющие; соседние слои связаны каждый с каждым.
   По прокрутке сигнал проходит матрицу слой за слоем, затем строки сходятся к оси и вся матрица
   становится одним лучом, который выходит из узла «Виртуальный сотрудник» */
function ultra(el: HTMLElement) {
  const bench = $('[data-iu-bench]', el)!;
  const slots = $$('[data-iu-slot]', el);
  const caps = $$('[data-iu-cap]', el);
  const face = $('[data-iu-face]', el)!;
  const svg = $<SVGSVGElement>('[data-iu-rays]', el)!;
  const parts: string[][] = JSON.parse(el.dataset.iuParts || '[]');
  const mob = isMobile();
  const pIn = grow<SVGPathElement>($('[data-iu-in]', svg)!, 12, 'path');
  const pMid = grow<SVGPathElement>($('[data-iu-mid]', svg)!, 32, 'path');
  const pConv = grow<SVGPathElement>($('[data-iu-conv]', svg)!, 4, 'path');
  const pOut = grow<SVGPathElement>($('[data-iu-out]', svg)!, 3, 'path');
  const gNodes = $('[data-iu-nodes]', svg)!;
  const halos = grow<SVGCircleElement>(gNodes, 13, 'circle');
  const cores = grow<SVGCircleElement>(gNodes, 26, 'circle').slice(13);
  halos.slice(0, 13).forEach((c) => c.setAttribute('class', 'iu-halo'));
  cores.forEach((c) => c.setAttribute('class', 'iu-core'));
  const labels = grow<SVGTextElement>($('[data-iu-labels]', svg)!, 12, 'text');
  labels.forEach((t, k) => (t.textContent = (parts[Math.floor(k / 4)]?.[k % 4] || '').replace(/ /g, ' ')));
  /* рассеянный свет на входе: разброс задан заранее */
  const jit = [0.12, -0.31, 0.44, -0.07, 0.29, -0.46, 0.18, -0.22, 0.38, -0.4, 0.05, 0.33];
  const B = mob ? [0.16, 0.46, 0.76] : [0.2, 0.44, 0.68];
  const XO = mob ? 0.93 : 0.85;
  const st = { a: 0, c: 0 };
  const draw = () => {
    const W = bench.clientWidth;
    const plate = slots[0].firstElementChild as HTMLElement;
    const br = bench.getBoundingClientRect();
    const pr = plate.getBoundingClientRect();
    if (!W || !pr.height) return;
    const H = svg.getBoundingClientRect().height;
    const ay = pr.top - br.top + pr.height / 2;
    const spread = (pr.height / 2) * 0.56 * (1 - smooth(st.c));
    const xs = B.map((b) => b * W);
    const xo = XO * W;
    slots.forEach((s, i) => (s.style.left = B[i] * 100 + '%'));
    if (!mob) caps.forEach((c, i) => (c.style.left = B[i] * 100 + '%'));
    face.style.left = XO * 100 + '%';
    bench.style.setProperty('--iu-c', smooth(st.c).toFixed(3));
    svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
    const ny = (k: number) => ay + (k - 1.5) * spread;
    const L = (x0: number, y0: number, x1: number, y1: number) => `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    /* сигнал проходит отрезки по очереди: вход, I→II, II→III, III→выход, луч */
    const lit = [0, 1, 2, 3, 4].map((s) => smooth(clamp01((st.a - s * 0.18) / 0.26)));
    pIn.forEach((p, k) => {
      const n = k % 4;
      p.setAttribute('d', L(-20, ay + jit[k] * H * 1.1, xs[0], ny(n)));
      p.style.opacity = (0.14 + 0.3 * lit[0]).toFixed(3);
    });
    pMid.forEach((p, k) => {
      const col = k < 16 ? 0 : 1;
      const m = k % 16;
      p.setAttribute('d', L(xs[col], ny(Math.floor(m / 4)), xs[col + 1], ny(m % 4)));
      p.style.opacity = ((0.07 + 0.43 * lit[col + 1]) * (1 - 0.6 * smooth(st.c))).toFixed(3);
    });
    pConv.forEach((p, k) => {
      p.setAttribute('d', L(xs[2], ny(k), xo, ay));
      p.style.opacity = (0.05 + 0.6 * lit[3]).toFixed(3);
    });
    pOut.forEach((p) => p.setAttribute('d', L(xo, ay, W + 30, ay)));
    ($('[data-iu-out]', svg) as SVGGElement).style.opacity = (0.15 + 0.85 * lit[4]).toFixed(3);
    const at = (c: SVGCircleElement, x: number, y: number, r: number, o: number) => {
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', r.toFixed(1));
      c.style.opacity = o.toFixed(3);
    };
    for (let k = 0; k < 12; k++) {
      const col = Math.floor(k / 4);
      const o = 0.3 + 0.7 * lit[col];
      at(halos[k], xs[col], ny(k % 4), mob ? 9 : 13, o * (1 - 0.5 * smooth(st.c)));
      at(cores[k], xs[col], ny(k % 4), mob ? 2.6 : 3.4, o);
      const t = labels[k];
      t.setAttribute('x', (xs[col] + pr.width / 2 + 12).toFixed(1));
      t.setAttribute('y', (ny(k % 4) + 4.5).toFixed(1));
      t.style.opacity = ((1 - smooth(clamp01(st.c * 2.2))) * (0.5 + 0.5 * lit[col])).toFixed(3);
    }
    at(halos[12], xo, ay, mob ? 14 : 22, lit[3]);
    at(cores[12], xo, ay, mob ? 4 : 5.5, 0.25 + 0.75 * lit[3]);
  };
  return run({
    redraw: draw,
    final() {
      st.a = 1;
      st.c = mob ? 0.42 : 1;
      if (mob) gsap.set(face, { autoAlpha: 0 });
      draw();
    },
    scrub(tl) {
      st.a = 0;
      st.c = 0;
      draw();
      gsap.set(face, { autoAlpha: 0, y: 10 });
      tl.to(st, { a: 1, duration: 0.36, onUpdate: draw }, 0.06);
      tl.to(st, { c: 1, duration: 0.26, ease: 'power1.inOut', onUpdate: draw }, 0.4);
      tl.to(face, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.6);
      gsap.set(caps, { autoAlpha: 0, y: 14 });
      tl.to(caps, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.05 }, 0.56);
    },
    live() {
      const re = () => draw();
      addEventListener('resize', re);
      document.fonts?.ready.then(re);
      return () => removeEventListener('resize', re);
    },
  });
}

/* ---------- Сталь: прибор раскрывается на три пластины-слоя, по связям между узлами бежит сигнал ----------
   Закрыто: три пластины сложены в один корпус, над ним плашка «Виртуальный сотрудник». По прокрутке пластины
   расходятся, на каждой проступают четыре узла — составляющие слоя — и связи к узлам следующего слоя. Сигнал
   входит с углов верхней пластины (каналы), проходит слои сверху вниз, собирается в центре нижней и по оси
   поднимается к плашке: внутри три слоя, снаружи один результат. Числа те же, что в InsideLooks.astro */
type Pulse = { t0: number; a: number; b: number; c: number; dot: SVGCircleElement; leg: number };
function steel(el: HTMLElement) {
  const SA = 104;
  const SB = 46;
  const ST = 12;
  const SX = 232;
  const YM = 300;
  const GAP = 128;
  const N = [[-SA, 0], [0, -SB], [SA, 0], [0, SB]];
  const C = [[-2 * SA, 0], [0, -2 * SB], [2 * SA, 0], [0, 2 * SB]];
  const byKey = <T extends Element>(sel: string, attr: string) => {
    const out: T[] = [];
    $$<T>(sel, el).forEach((n) => (out[Number(n.getAttribute(attr))] = n));
    return out;
  };
  const svg = $<SVGSVGElement>('[data-is-svg]', el)!;
  const plates = byKey<SVGGElement>('[data-is-plate]', 'data-is-plate');
  const calls = byKey<SVGGElement>('[data-is-call]', 'data-is-call');
  const links = byKey<SVGGElement>('[data-is-links]', 'data-is-links');
  const spines = byKey<SVGPathElement>('[data-is-spine]:not([data-is-spine="top"])', 'data-is-spine');
  const top = $<SVGPathElement>('[data-is-spine="top"]', el)!;
  const groups = byKey<SVGGElement>('[data-is-p]', 'data-is-p');
  const nets = plates.map((p) => $<SVGGElement>('[data-is-net]', p)!);
  const lines = links.map((g) => grow<SVGLineElement>(g, 16, 'line'));
  const pill = $<SVGGElement>('[data-is-pill]', el)!;
  const rows = $$('[data-is-row]', el);
  const st = { g: 1, n: 1 };
  const ys = () => {
    const g = ST + (GAP - ST) * st.g;
    return [YM - g, YM, YM + g];
  };
  const tr = (x: number, y: number) => `translate(${x} ${y.toFixed(1)})`;
  /* что нарисовано сейчас: при пересчёте ScrollTrigger тянет шкалу без onUpdate, и кадр сверяет значения сам */
  const drawn = { g: -1, n: -1 };
  const draw = () => {
    drawn.g = st.g;
    drawn.n = st.n;
    const y = ys();
    plates.forEach((p, k) => p.setAttribute('transform', tr(SX, y[k])));
    calls.forEach((c, k) => c.setAttribute('transform', tr(SX, y[k])));
    pill.setAttribute('transform', tr(SX, y[0] - 2 * SB - 40));
    lines.forEach((ls, k) =>
      ls.forEach((l, i) => {
        const a = N[i >> 2];
        const b = N[i & 3];
        l.setAttribute('x1', String(SX + a[0]));
        l.setAttribute('y1', (y[k] + a[1]).toFixed(1));
        l.setAttribute('x2', String(SX + b[0]));
        l.setAttribute('y2', (y[k + 1] + b[1]).toFixed(1));
      }),
    );
    spines.forEach((s, k) => s.setAttribute('d', `M${SX} ${y[k + 1].toFixed(1)}V${y[k].toFixed(1)}`));
    top.setAttribute('d', `M${SX} ${y[0].toFixed(1)}V${(y[0] - 2 * SB - 22).toFixed(1)}`);
    /* узлы проступают сверху вниз, связи и ось — следом */
    nets.forEach((g, k) => (g.style.opacity = smooth(clamp01(st.n * 1.8 - k * 0.4)).toFixed(3)));
    const n = smooth(clamp01((st.n - 0.3) / 0.7)).toFixed(3);
    links.forEach((g) => (g.style.opacity = n));
    [...spines, top].forEach((s) => (s.style.opacity = n));
  };
  /* плашка по ширине надписи: шрифт и размер надписи разные на компьютере и телефоне */
  const fit = () => {
    const t = $<SVGTextElement>('[data-is-pill-t]', el)!;
    const w = t.getBBox().width;
    if (!w) return;
    const x0 = -(w + 46) / 2;
    const bg = $('[data-is-pill-bg]', el)!;
    bg.setAttribute('x', x0.toFixed(1));
    bg.setAttribute('width', (w + 46).toFixed(1));
    $('[data-is-pill-led]', el)!.setAttribute('cx', (x0 + 17).toFixed(1));
    t.setAttribute('x', (x0 + 29).toFixed(1));
  };
  /* путь сигнала: угол верхней пластины → узел → узел II → узел III → центр III → ось вверх до плашки.
     У каждого отрезка своя длительность и свой слой отрисовки, чтобы точка уходила под стекло верхних пластин */
  const LEG = [0.5, 0.85, 0.85, 0.4, 0.42, 0.42, 0.55];
  const LAYER = [0, 1, 2, 3, 2, 1, 0];
  const pos = (p: Pulse, leg: number, u: number): [number, number] => {
    const y = ys();
    const seg = (x0: number, y0: number, x1: number, y1: number): [number, number] => [lerp(x0, x1, u), lerp(y0, y1, u)];
    if (leg === 0) return seg(SX + C[p.a][0], y[0] + C[p.a][1], SX + N[p.a][0], y[0] + N[p.a][1]);
    if (leg === 1) return seg(SX + N[p.a][0], y[0] + N[p.a][1], SX + N[p.b][0], y[1] + N[p.b][1]);
    if (leg === 2) return seg(SX + N[p.b][0], y[1] + N[p.b][1], SX + N[p.c][0], y[2] + N[p.c][1]);
    if (leg === 3) return seg(SX + N[p.c][0], y[2] + N[p.c][1], SX, y[2]);
    if (leg === 4) return [SX, lerp(y[2], y[1], u)];
    if (leg === 5) return [SX, lerp(y[1], y[0], u)];
    return [SX, lerp(y[0], y[0] - 2 * SB - 22, u)];
  };
  return run({
    redraw: draw,
    final() {
      st.g = 1;
      st.n = 1;
      draw();
    },
    scrub(tl) {
      st.g = 0;
      st.n = 0;
      draw();
      gsap.set(calls, { autoAlpha: 0 });
      gsap.set(rows, { autoAlpha: 0, x: -14 });
      tl.to(st, { g: 1, duration: 0.4, ease: 'power2.inOut', onUpdate: draw }, 0.08);
      tl.to(calls, { autoAlpha: 1, duration: 0.08, stagger: 0.08 }, 0.26);
      tl.to(rows, { autoAlpha: 1, x: 0, duration: 0.1, stagger: 0.08 }, 0.28);
      tl.to(st, { n: 1, duration: 0.32, onUpdate: draw }, 0.32);
    },
    live() {
      const re = () => {
        draw();
        fit();
      };
      fit();
      document.fonts?.ready.then(fit);
      addEventListener('resize', re);
      if (reduced) return () => removeEventListener('resize', re);
      const R = rng(7);
      const pulses: Pulse[] = [];
      let raf = 0;
      let next = 0;
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (drawn.g !== st.g || drawn.n !== st.n) draw();
        const t = now / 1000;
        const on = clamp01((st.n - 0.6) / 0.4);
        if (on > 0 && t >= next) {
          next = t + 0.62;
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('class', 'is-dot');
          dot.setAttribute('r', '3');
          pulses.push({ t0: t, a: Math.floor(R() * 4), b: Math.floor(R() * 4), c: Math.floor(R() * 4), dot, leg: -1 });
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          let e = t - p.t0;
          let leg = 0;
          while (leg < LEG.length && e > LEG[leg]) e -= LEG[leg++];
          if (leg >= LEG.length) {
            p.dot.remove();
            pulses.splice(i, 1);
            continue;
          }
          if (leg !== p.leg) {
            p.leg = leg;
            groups[LAYER[leg]].appendChild(p.dot);
            p.dot.classList.toggle('is-up', leg >= 4);
          }
          const u = e / LEG[leg];
          const [x, y] = pos(p, leg, smooth(u));
          p.dot.setAttribute('cx', x.toFixed(1));
          p.dot.setAttribute('cy', y.toFixed(1));
          const fade = Math.min(1, (t - p.t0) / 0.25) * (leg === 6 ? 1 - smooth(clamp01((u - 0.5) / 0.5)) : 1);
          p.dot.style.opacity = (fade * on).toFixed(3);
        }
      };
      const io = new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !raf) raf = requestAnimationFrame(tick);
        if (!en.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
      io.observe(svg);
      return () => {
        io.disconnect();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        pulses.forEach((p) => p.dot.remove());
        pulses.length = 0;
        removeEventListener('resize', re);
      };
    },
  });
}

/* ---------- Мята: капсула из трёх полос раскрывается в три полосы с составляющими ---------- */
function mint(el: HTMLElement) {
  const bar = $('[data-im-bar]', el)!;
  const sec = $('[data-ex]')!;
  return run({
    final() {
      gsap.set(bar, { '--op': 1 });
    },
    scrub(tl) {
      tl.fromTo(bar, { '--op': 0 }, { '--op': 1, duration: 0.42, ease: 'power2.inOut' }, 0.14);
    },
    live() {
      if (reduced) return () => {};
      /* составляющие бегут, только пока блок на экране */
      const io = new IntersectionObserver(([e]) => el.classList.toggle('is-on', e.isIntersecting));
      io.observe(sec);
      return () => {
        io.disconnect();
        el.classList.remove('is-on');
      };
    },
  });
}

const LOOKS: Record<string, (el: HTMLElement) => InsideMode> = { signal, ultra, steel, mint };

export function mountInsideLook(id: string): InsideMode | null {
  const el = $(`[data-ix="${id}"]`);
  const fn = LOOKS[id];
  return el && fn ? fn(el) : null;
}
