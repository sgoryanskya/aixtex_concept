/* «Олива и латунь» · гравюра.
   Разрозненные штрихи гравёра (хаос) выстраиваются в гильошированную ленту, как на ценной бумаге:
   два семейства синусоид со сдвигом фазы сплетаются в ровный узор, сверху и снизу ленту держат линейки.
   Колец и розеток нет: узор линейный, идёт вдоль камеры.
   С раунда 5 (вторая часть) лента проходит через центр кадра: над ней и под ней стоят слова первого экрана,
   камера при прокрутке наезжает в середину ленты. */
window.render = async (W, H, P) => {
  const { FOCUS, rng, smooth, lerp, hex, mix, rgba, gauss, canvas, bloom, grain, samplePath } = HG;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const C = { bg: hex(P.bg), dark: hex(P.dark), base: hex(P.base), light: hex(P.light), hi: hex(P.hi), second: hex(P.second) };
  const yc = 0.5;
  void FOCUS;

  /* фон: тёмная олива, у ленты чуть теплее */
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(0.56 * W, yc * H, 0, 0.56 * W, yc * H, 0.6 * W);
  g.addColorStop(0, rgba(C.dark, 0.55));
  g.addColorStop(1, rgba(C.dark, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* лента: огибающая растёт от x 0,1 до 0,42 и дальше держится до правого края */
  const X0 = 0.1;
  /* волна пологая (длина больше размаха), иначе узор читается как пружина */
  const Ab = (x) => 0.1 * smooth(X0, 0.42, x);
  const A = (x) => Ab(x) * (0.9 + 0.1 * Math.cos((Math.PI * 2 * x) / 0.5));
  const k = (2 * Math.PI) / 0.3;
  const N = 20;
  /* два вложенных размаха: внешняя сетка и внутренняя, как кружево на купюре */
  const famA = (i) => (x) => yc + A(x) * (i % 2 ? 0.66 : 1) * (Math.sin(k * x + (2 * Math.PI * i) / N) * 0.86 + 0.14 * Math.sin(3 * k * x + (6 * Math.PI * i) / N));
  const famB = (i) => (x) => yc + A(x) * 0.42 * Math.sin(2 * k * x + (2 * Math.PI * i) / N + 0.4);

  /* штрихи: пачки параллельных насечек, ближе к ленте поворачиваются вдоль неё и густеют */
  const hatch = canvas(W, H);
  const hx = hatch.getContext('2d');
  const r = rng(11);
  hx.lineCap = 'round';
  for (let n = 0; n < 420; n++) {
    const u = Math.pow(r(), 0.9) * 0.44;
    const order = smooth(0.12, 0.4, u);
    const sy = lerp(0.3, 0.06, smooth(0.0, 0.4, u));
    const v = yc + gauss(r) * sy;
    if (v < 0.04 || v > 0.96) continue;
    const ang = lerp((r() - 0.5) * Math.PI, (r() - 0.5) * 0.22, order);
    const L = (50 + r() * 190) * (1 + order * 1.4);
    const lines = 4 + ((r() * 8) | 0);
    const gap = 8 + r() * 5;
    const bow = (r() - 0.5) * L * 0.18;
    const a = (0.08 + r() * 0.2) * lerp(0.35, 1, smooth(0, 0.5, u)) * (u > 0.34 ? 1 - smooth(0.36, 0.44, u) * 0.6 : 1);
    const col = mix(C.base, C.light, r() * 0.6);
    const cross = r() < 0.18 && order < 0.6;
    for (let pass = 0; pass < (cross ? 2 : 1); pass++) {
      const t = ang + (pass ? Math.PI / 2 : 0);
      const ca = Math.cos(t);
      const sa = Math.sin(t);
      for (let j = 0; j < lines; j++) {
        const off = (j - lines / 2) * gap;
        const cx = u * W - sa * off;
        const cy = v * H + ca * off;
        /* насечка тоньше к концам: два прохода, второй короче */
        const len = L * (0.7 + 0.3 * Math.sin((Math.PI * (j + 0.5)) / lines));
        hx.strokeStyle = rgba(col, a);
        hx.lineWidth = 1.4;
        hx.beginPath();
        hx.moveTo(cx - (ca * len) / 2, cy - (sa * len) / 2);
        hx.quadraticCurveTo(cx - sa * bow, cy + ca * bow, cx + (ca * len) / 2, cy + (sa * len) / 2);
        hx.stroke();
      }
    }
  }
  bloom(ctx, hatch, [[3, 0.25], [0, 1]]);

  /* гильош: каждая линия — путь из 900 точек, яркость растёт к правому краю */
  const band = canvas(W, H);
  const bx = band.getContext('2d');
  const stroke = (fn, col, a, w) => {
    const gr = bx.createLinearGradient(X0 * W, 0, W, 0);
    gr.addColorStop(0, rgba(col, 0));
    gr.addColorStop(0.1, rgba(col, a * 0.12));
    gr.addColorStop(0.26, rgba(col, a * 0.6));
    gr.addColorStop(0.55, rgba(col, a));
    gr.addColorStop(1, rgba(col, a * 0.9));
    bx.strokeStyle = gr;
    bx.lineWidth = w;
    bx.beginPath();
    for (let s = 0; s <= 900; s++) {
      const x = X0 + ((1.02 - X0) * s) / 900;
      const y = fn(x);
      if (s) bx.lineTo(x * W, y * H);
      else bx.moveTo(x * W, y * H);
    }
    bx.stroke();
  };
  for (let i = 0; i < N; i++) stroke(famA(i), mix(C.light, C.hi, 0.25), 0.62, 2.1);
  for (let i = 0; i < N; i++) stroke(famB(i), C.second, 0.42, 1.6);
  /* линейки: двойная сверху и снизу, как рамка на ценной бумаге */
  [[1.16, 1.6, 0.45], [1.24, 1.1, 0.28]].forEach(([m, w, a]) => {
    [-1, 1].forEach((s) => stroke((x) => yc + s * Ab(x) * m, C.light, a, w));
  });
  /* мелкая насечка между линейками: ровный шаг — знак порядка */
  bx.save();
  for (let s = 0; s < 400; s++) {
    const x = 0.4 + s * 0.0016;
    if (x > 1.01) break;
    const a = Ab(x);
    const al = 0.32 * smooth(0.4, 0.5, x);
    bx.strokeStyle = rgba(C.light, al);
    bx.lineWidth = 1.1;
    [-1, 1].forEach((sg) => {
      bx.beginPath();
      bx.moveTo(x * W, (yc + sg * a * 1.16) * H);
      bx.lineTo(x * W, (yc + sg * a * 1.24) * H);
      bx.stroke();
    });
  }
  bx.restore();
  bloom(ctx, band, [[60, 0.35], [14, 0.45], [3, 0.4], [0, 1]]);

  grain(ctx, W, H, 5, 3);
  const lines = [];
  for (let i = 0; i < N; i += 2) lines.push(samplePath(famA(i), 0.36, 1.0, 90));
  for (let i = 1; i < N; i += 3) lines.push(samplePath(famB(i), 0.36, 1.0, 90));
  return { canvas: c, paths: { lines, x0: 0.36 } };
};
