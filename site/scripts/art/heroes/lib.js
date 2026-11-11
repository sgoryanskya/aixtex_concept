/* Общие инструменты генераторов первого экрана (раунд 5).
   Каждый генератор рисует кадр 2:1 по той же схеме, что кадр A: слева хаос, справа порядок,
   порядок собран вокруг точки, к которой едет камера (53,6% × 48,4%, см. .hero__media). */
window.HG = (() => {
  const FOCUS = { x: 0.536, y: 0.484 };
  /* детерминированный генератор: один и тот же кадр при каждой сборке */
  const rng = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  /* нормальное распределение (Бокса — Мюллера) */
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const canvas = (W, H) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  /* свечение: слой ложится на основной кадр несколькими размытыми копиями, потом резким */
  const bloom = (ctx, layer, passes) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    passes.forEach(([blur, a]) => {
      ctx.filter = blur ? `blur(${blur}px)` : 'none';
      ctx.globalAlpha = a;
      ctx.drawImage(layer, 0, 0);
    });
    ctx.restore();
  };
  /* мелкое зерно против полос в градиентах после сжатия в webp */
  const grain = (ctx, W, H, amount, seed) => {
    const r = rng(seed);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() + r() - 1) * amount;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  };
  /* путь для импульсов: точки [x, y] в долях кадра, x растёт */
  const samplePath = (fn, x0, x1, n) => {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      out.push(+x.toFixed(4), +fn(x).toFixed(4));
    }
    return out;
  };
  return { FOCUS, rng, clamp, smooth, lerp, hex, mix, rgba, gauss, canvas, bloom, grain, samplePath };
})();
