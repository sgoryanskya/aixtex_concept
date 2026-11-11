/* «Ультрамарин» · оптика.
   Рассеянные блики (хаос) собираются стеклянной призмой в один точный луч (порядок).
   Проводов нет: слева осколки света разной резкости, как в расфокусе, по центру вертикальная
   стеклянная пластина, справа пучок из ядра и шести тонких лучей. Оттенки только в синем диапазоне. */
window.render = async (W, H, P) => {
  const { FOCUS, rng, smooth, lerp, hex, mix, rgba, gauss, canvas, bloom, grain, samplePath } = HG;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const C = { bg: hex(P.bg), dark: hex(P.dark), base: hex(P.base), light: hex(P.light), hi: hex(P.hi), accent: hex(P.accent) };
  const violet = [112, 92, 255];
  const cyan = [86, 170, 255];
  const yc = FOCUS.y;
  const GX = 0.535; /* стекло */

  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  /* глубина: тёмно-синяя дымка за стеклом и вдоль луча */
  [[GX, yc, 0.42, 0.55], [0.82, yc, 0.36, 0.32], [0.18, 0.3, 0.4, 0.22]].forEach(([x, y, rr, a]) => {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, rr * W);
    g.addColorStop(0, rgba(C.dark, a));
    g.addColorStop(1, rgba(C.dark, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  /* блики: короткие световые черты под разными углами, часть в расфокусе */
  const r = rng(7);
  const shards = canvas(W, H);
  const sx = shards.getContext('2d');
  sx.lineCap = 'round';
  const pts = [];
  /* осколки стекла: мягкое тело и одна резкая освещённая грань; дальние в лёгком расфокусе */
  for (let n = 0; n < 150; n++) {
    const u = Math.pow(r(), 0.8) * 0.5;
    const sy = lerp(0.3, 0.1, smooth(0, 0.5, u));
    const v = yc + gauss(r) * sy;
    if (v < 0.04 || v > 0.96) continue;
    const order = smooth(0.28, 0.5, u);
    const ang = lerp((r() - 0.5) * Math.PI, (r() - 0.5) * 0.4, order);
    const depth = r();
    const blur = depth < 0.5 ? 0 : (depth - 0.5) * 22;
    const L = 70 + Math.pow(r(), 1.6) * 420;
    const T = 8 + Math.pow(r(), 2) * 46;
    const col = r() < 0.22 ? mix(C.base, violet, 0.55) : r() < 0.4 ? mix(C.light, cyan, 0.35) : mix(C.base, C.light, 0.3 + r() * 0.5);
    const a = (0.22 + r() * 0.4) * lerp(0.28, 1, smooth(0, 0.42, u)) * (1 - depth * 0.35);
    const x = u * W;
    const y = v * H;
    sx.save();
    sx.translate(x, y);
    sx.rotate(ang);
    sx.filter = blur ? `blur(${blur.toFixed(1)}px)` : 'none';
    /* тело: свет гаснет от грани внутрь и к концам */
    const gb = sx.createLinearGradient(0, -T / 2, 0, T / 2);
    gb.addColorStop(0, rgba(col, a * 0.55));
    gb.addColorStop(1, rgba(col, 0));
    sx.fillStyle = gb;
    sx.globalCompositeOperation = 'lighter';
    sx.fillRect(-L / 2, -T / 2, L, T);
    /* резкая грань: тонкая линия, ярче в середине */
    const ge = sx.createLinearGradient(-L / 2, 0, L / 2, 0);
    ge.addColorStop(0, rgba(C.hi, 0));
    ge.addColorStop(0.5, rgba(mix(col, C.hi, 0.55), Math.min(1, a * 1.6)));
    ge.addColorStop(1, rgba(C.hi, 0));
    sx.strokeStyle = ge;
    sx.lineWidth = 1.6;
    sx.beginPath();
    sx.moveTo(-L / 2, -T / 2);
    sx.lineTo(L / 2, -T / 2);
    sx.stroke();
    /* торцы чуть светятся: читается толщина стекла */
    sx.fillStyle = rgba(mix(col, C.hi, 0.4), a * 0.35);
    sx.fillRect(L / 2 - 2, -T / 2, 2, T * 0.7);
    sx.restore();
    if (u > 0.12 && r() < 0.4) pts.push([x, y, a]);
  }
  sx.filter = 'none';
  bloom(ctx, shards, [[36, 0.35], [8, 0.4], [0, 1]]);

  /* сбор: едва заметные лучи от бликов к входной грани стекла */
  const rays = canvas(W, H);
  const rx = rays.getContext('2d');
  pts.forEach(([x, y, a]) => {
    const ty = (yc + gauss(r) * 0.012) * H;
    const tx = (GX - 0.006) * W;
    const g = rx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, rgba(C.light, 0));
    g.addColorStop(1, rgba(C.light, 0.07 * a + 0.015));
    rx.strokeStyle = g;
    rx.lineWidth = 1.2;
    rx.beginPath();
    rx.moveTo(x, y);
    rx.lineTo(tx, ty);
    rx.stroke();
  });
  bloom(ctx, rays, [[4, 0.4], [0, 0.9]]);

  /* стекло: тонкая наклонная пластина, грани ярче у луча и гаснут к краям */
  const glass = canvas(W, H);
  const gx = glass.getContext('2d');
  const top = 0.17;
  const bot = 0.8;
  const tilt = 0.012;
  const gw = 0.016;
  const at = (y) => GX + tilt * ((yc - y) / (bot - top));
  const vg = (a) => {
    const g = gx.createLinearGradient(0, top * H, 0, bot * H);
    g.addColorStop(0, rgba(C.light, 0));
    g.addColorStop((yc - top) / (bot - top) - 0.22, rgba(C.light, a * 0.35));
    g.addColorStop((yc - top) / (bot - top), rgba(C.hi, a));
    g.addColorStop((yc - top) / (bot - top) + 0.22, rgba(C.light, a * 0.35));
    g.addColorStop(1, rgba(C.light, 0));
    return g;
  };
  gx.fillStyle = vg(0.07);
  gx.beginPath();
  gx.moveTo(at(top) * W, top * H);
  gx.lineTo((at(top) + gw) * W, top * H);
  gx.lineTo((at(bot) + gw) * W, bot * H);
  gx.lineTo(at(bot) * W, bot * H);
  gx.closePath();
  gx.fill();
  [[0, 2, 0.5], [gw, 1.5, 0.36], [gw * 0.42, 1, 0.16]].forEach(([o, w, a]) => {
    gx.strokeStyle = vg(a);
    gx.lineWidth = w;
    gx.beginPath();
    gx.moveTo((at(top) + o) * W, top * H);
    gx.lineTo((at(bot) + o) * W, bot * H);
    gx.stroke();
  });
  /* свет внутри стекла: короткое вертикальное отражение на уровне луча */
  const ig = gx.createRadialGradient((GX + gw / 2) * W, yc * H, 0, (GX + gw / 2) * W, yc * H, 0.09 * H);
  ig.addColorStop(0, rgba(C.hi, 0.3));
  ig.addColorStop(1, rgba(C.light, 0));
  gx.save();
  gx.translate((GX + gw / 2) * W, yc * H);
  gx.scale(0.35, 1.6);
  gx.translate(-(GX + gw / 2) * W, -yc * H);
  gx.fillStyle = ig;
  gx.fillRect(0, 0, W, H);
  gx.restore();
  bloom(ctx, glass, [[22, 0.45], [4, 0.5], [0, 1]]);

  /* луч: ядро и шесть параллельных лучей, длина расходимости ничтожна — точность */
  const X1 = GX + gw;
  const beam = canvas(W, H);
  const bx = beam.getContext('2d');
  const RAYS = [
    [0, 6, C.hi, 1],
    [-0.0055, 1.6, C.light, 0.75],
    [0.0055, 1.6, C.light, 0.75],
    [-0.0125, 1.3, mix(C.accent, violet, 0.3), 0.55],
    [0.0125, 1.3, mix(C.accent, cyan, 0.3), 0.55],
    [-0.022, 1, C.base, 0.38],
    [0.022, 1, C.base, 0.38],
  ];
  const beamY = (off) => (x) => yc + off * (1 + 0.12 * smooth(X1, 1, x));
  RAYS.forEach(([off, w, col, a]) => {
    const g = bx.createLinearGradient(X1 * W, 0, W, 0);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.55, rgba(col, a * 0.92));
    g.addColorStop(1, rgba(col, a * 0.7));
    bx.strokeStyle = g;
    bx.lineWidth = w;
    bx.beginPath();
    for (let s = 0; s <= 60; s++) {
      const x = X1 + ((1.02 - X1) * s) / 60;
      if (s) bx.lineTo(x * W, beamY(off)(x) * H);
      else bx.moveTo(x * W, beamY(off)(x) * H);
    }
    bx.stroke();
  });
  /* выход из стекла: короткая вспышка, без анаморфного шлейфа через весь кадр */
  /* объём луча: мягкая полоса вокруг ядра */
  const vol = bx.createLinearGradient(0, (yc - 0.08) * H, 0, (yc + 0.08) * H);
  vol.addColorStop(0, rgba(C.base, 0));
  vol.addColorStop(0.5, rgba(C.base, 0.26));
  vol.addColorStop(1, rgba(C.base, 0));
  bx.fillStyle = vol;
  bx.fillRect(X1 * W, (yc - 0.08) * H, (1 - X1) * W, 0.16 * H);
  const fl = bx.createRadialGradient(X1 * W, yc * H, 0, X1 * W, yc * H, 0.03 * W);
  fl.addColorStop(0, rgba(C.hi, 0.45));
  fl.addColorStop(0.3, rgba(C.light, 0.18));
  fl.addColorStop(1, rgba(C.base, 0));
  bx.fillStyle = fl;
  bx.fillRect(0, 0, W, H);
  bloom(ctx, beam, [[160, 0.75], [48, 0.7], [12, 0.7], [0, 1]]);

  grain(ctx, W, H, 4, 5);
  const lines = RAYS.slice(0, 5).map(([off]) => samplePath(beamY(off), X1, 1.0, 24));
  return { canvas: c, paths: { lines, x0: X1 } };
};
