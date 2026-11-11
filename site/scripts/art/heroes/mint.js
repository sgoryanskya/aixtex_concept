/* «Мята и шампань» · полосы.
   Слева разлетевшиеся пластинки света в расфокусе (хаос, как в референсе с радиальными полосами),
   к центру они поворачиваются и выстраиваются в ровную лесенку горизонтальных полос (порядок):
   ступенчатый переход яркости, как в знаке MarketLytics, и мягкая мятная аура, как у aclitec. */
window.render = async (W, H, P) => {
  const { FOCUS, rng, smooth, lerp, hex, mix, rgba, gauss, canvas, bloom, grain, samplePath } = HG;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const C = { bg: hex(P.bg), dark: hex(P.dark), base: hex(P.base), light: hex(P.light), hi: hex(P.hi), accent: hex(P.accent), second: hex(P.second) };
  const yc = FOCUS.y;

  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  /* аура: два размытых пятна, тёмная мята и чуть шампани, только вокруг полос */
  [[0.74, yc, 0.42, C.dark, 0.95], [0.6, yc + 0.06, 0.22, C.base, 0.28], [0.92, yc - 0.12, 0.2, C.second, 0.07]].forEach(([x, y, rr, col, a]) => {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, rr * W);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  /* полосы порядка: 13 ступеней, яркость растёт к середине, начало каждой чуть сдвинуто — лесенка */
  const N = 13;
  const PITCH = 0.0215;
  const TH = 0.0095;
  const rows = Array.from({ length: N }, (_, i) => {
    const m = i - (N - 1) / 2;
    const t = 1 - Math.abs(m) / ((N - 1) / 2);
    return {
      y: yc + m * PITCH,
      x0: 0.555 + Math.abs(m) * 0.008 + (i % 3) * 0.004,
      col: t > 0.85 ? mix(C.light, C.hi, 0.3) : t > 0.55 ? C.light : t > 0.3 ? C.accent : t > 0.12 ? C.base : mix(C.base, C.dark, 0.5),
      a: 0.45 + 0.55 * t,
      champagne: i === 2 || i === N - 3,
    };
  });

  /* хаос: пластинки разной длины и угла, дальние размыты, ближе к полосам поворачиваются вдоль них */
  const r = rng(21);
  const chips = canvas(W, H);
  const cx = chips.getContext('2d');
  for (let n = 0; n < 220; n++) {
    const u = Math.pow(r(), 0.8) * 0.56;
    const order = smooth(0.3, 0.56, u);
    const sy = lerp(0.3, 0.13, smooth(0, 0.54, u));
    let v = yc + gauss(r) * sy;
    /* у самых правых пластинок место уже есть: они садятся на свою полосу */
    const row = rows[Math.max(0, Math.min(N - 1, Math.round((v - yc) / PITCH + (N - 1) / 2)))];
    v = lerp(v, row.y, smooth(0.42, 0.56, u));
    if (v < 0.04 || v > 0.96) continue;
    const ang = lerp((r() - 0.5) * Math.PI * 0.9, 0, order);
    const L = (40 + Math.pow(r(), 1.4) * 300) * (1 + order * 0.8);
    const T = TH * H * (0.9 + r() * 1.8) * (1 - order * 0.45);
    /* почти всё в расфокусе: мягкие пятна света, резкие только у самых полос */
    const depth = r() * (1 - order * 0.85);
    const blur = depth < 0.18 ? 0 : 5 + (depth - 0.18) * 48;
    const col = r() < 0.12 ? C.second : mix(C.base, C.light, r() * 0.8);
    const a = (0.2 + r() * 0.45) * lerp(0.3, 1, smooth(0, 0.45, u));
    cx.save();
    cx.translate(u * W, v * H);
    cx.rotate(ang);
    cx.filter = blur ? `blur(${blur.toFixed(1)}px)` : 'none';
    const g = cx.createLinearGradient(-L / 2, 0, L / 2, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.35, rgba(col, a * 0.7));
    g.addColorStop(1, rgba(mix(col, C.hi, 0.3), a));
    cx.fillStyle = g;
    cx.globalCompositeOperation = 'lighter';
    cx.beginPath();
    cx.roundRect(-L / 2, -T / 2, L, T, T / 2);
    cx.fill();
    cx.restore();
  }
  bloom(ctx, chips, [[30, 0.35], [6, 0.35], [0, 1]]);

  /* сами полосы: резкие края, свет нарастает слева направо */
  const bars = canvas(W, H);
  const bx = bars.getContext('2d');
  rows.forEach((rw) => {
    const col = rw.champagne ? mix(C.second, C.hi, 0.2) : rw.col;
    const g = bx.createLinearGradient(rw.x0 * W, 0, W, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.07, rgba(col, rw.a * 0.55));
    g.addColorStop(0.4, rgba(col, rw.a * 0.85));
    g.addColorStop(1, rgba(col, rw.a));
    bx.fillStyle = g;
    bx.fillRect(rw.x0 * W, (rw.y - TH / 2) * H, (1.02 - rw.x0) * W, TH * H);
    /* верхняя грань светлее: полоса читается как пластина, а не как линия */
    bx.fillStyle = rgba(C.hi, rw.a * 0.35);
    bx.fillRect((rw.x0 + 0.04) * W, (rw.y - TH / 2) * H, (1 - rw.x0) * W, 2);
  });
  bloom(ctx, bars, [[120, 0.42], [30, 0.36], [6, 0.3], [0, 0.92]]);

  grain(ctx, W, H, 4, 13);
  const lines = rows.filter((_, i) => i % 2 === 0).map((rw) => samplePath(() => rw.y, rw.x0 + 0.03, 1.0, 4));
  return { canvas: c, paths: { lines, x0: 0.58, thick: TH } };
};
