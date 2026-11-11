/* «Градиент» · поток и пиксель (раунд 5, часть 9).
   Референсы заказчика из папки AX: Nexora (градиент, который у края рассыпается на крупные пиксели)
   и Signale (мягкие волны оранжевого, белого и синего на чёрном).
   Слева нити концепции A, окрашенные градиентом, под ними размытое свечение тех же цветов.
   К центру нити выпрямляются в мягкий поток, поток идёт чуть вверх, а справа тот же градиент
   становится крупными пикселями: размытое становится чётким. Цвет идёт по диагонали
   (синий слева снизу, белый в сердцевине, оранжевый справа сверху), полос нет. Хаос темнее порядка. */
window.render = async (W, H, P) => {
  const { rng, clamp, smooth, lerp, hex, mix, canvas, bloom, grain, FOCUS } = HG;
  const r = rng(29);
  const yc = FOCUS.y;
  /* шкала цвета: 0 — тёмно-красный, 1 — глубокий синий */
  const STOPS = [
    [0.0, hex(P.deep2)],
    [0.16, hex(P.warm)],
    [0.34, hex(P.coral)],
    [0.5, hex(P.hi)],
    [0.64, hex(P.light)],
    [0.82, hex(P.base)],
    [1.0, hex(P.dark)],
  ];
  const ramp = (u) => {
    u = clamp(u, 0, 1);
    for (let i = 1; i < STOPS.length; i++) {
      if (u <= STOPS[i][0]) {
        const [a, ca] = STOPS[i - 1];
        const [b, cb] = STOPS[i];
        return mix(ca, cb, (u - a) / (b - a));
      }
    }
    return STOPS[STOPS.length - 1][1];
  };
  /* цвет точки потока: s — место в пучке (-1 верх, +1 низ), x — вдоль кадра.
     Цвет меняется в основном вдоль потока: синий хаос, белая сердцевина, оранжевый порядок;
     поперёк пучка только лёгкий сдвиг, поэтому полос нет */
  const hue = (x, s) => lerp(0.74, 0.12, smooth(0.32, 1.0, x)) + s * 0.17;
  const HB = 0.12;
  const XM = 0.58; // здесь поток становится пикселями
  const order = (x) => smooth(0.18, 0.5, x);
  /* порядок: прямой пучок, к правому краю чуть поднимается; хаос: волна и разлёт */
  const centre = (x, s) => {
    const k = 1 - order(x);
    const lift = -0.07 * smooth(0.45, 1.1, x);
    const straight = yc + lift + s * HB;
    const wavy = yc + s * HB * 1.6 + 0.12 * Math.sin(x * 5.2 + 0.4 + s * 0.9) + 0.05 * Math.sin(x * 10.5 + 1.3 - s * 1.6);
    return lerp(straight, wavy, k);
  };
  const strip = (ctx, x0, x1, dx, yOf, colOf) => {
    let px = x0;
    let py = yOf(x0);
    for (let x = x0 + dx; x <= x1 + 1e-6; x += dx) {
      const y = yOf(x);
      ctx.strokeStyle = `rgb(${colOf(x - dx / 2)})`;
      ctx.beginPath();
      ctx.moveTo(px * W, py * H);
      ctx.lineTo(x * W, y * H);
      ctx.stroke();
      px = x;
      py = y;
    }
  };

  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);

  /* 1. мягкий поток через весь кадр: толстые мазки, сильно размытые */
  const raw = canvas(W, H);
  const g = raw.getContext('2d');
  g.lineCap = 'round';
  for (let s = -1; s <= 1.001; s += 0.04) {
    g.lineWidth = H * 0.06;
    g.globalAlpha = 0.3 * (1 - 0.62 * Math.abs(s));
    strip(g, -0.06, 1.06, 0.02, (x) => centre(x, s), (x) => ramp(hue(x, s)));
  }
  const glow = canvas(W, H);
  const gg = glow.getContext('2d');
  gg.filter = `blur(${Math.round(H * 0.05)}px)`;
  gg.drawImage(raw, 0, 0);
  gg.filter = 'none';

  /* слева свечение приглушено: хаос темнее порядка */
  const soft = canvas(W, H);
  const sc = soft.getContext('2d');
  sc.drawImage(glow, 0, 0);
  sc.globalCompositeOperation = 'destination-in';
  const dl = sc.createLinearGradient(0, 0, W, 0);
  dl.addColorStop(0, 'rgba(0,0,0,0.3)');
  dl.addColorStop(0.3, 'rgba(0,0,0,0.5)');
  dl.addColorStop(XM - 0.06, 'rgba(0,0,0,0.85)');
  dl.addColorStop(XM + 0.12, 'rgba(0,0,0,0.8)');
  dl.addColorStop(1, 'rgba(0,0,0,0.45)');
  sc.fillStyle = dl;
  sc.fillRect(0, 0, W, H);
  ctx.drawImage(soft, 0, 0);

  /* 2. нити: своя спутанность слева, к центру выпрямляются и уходят в пиксели */
  const thr = canvas(W, H);
  const t = thr.getContext('2d');
  t.lineCap = 'round';
  const N = 240;
  for (let i = 0; i < N; i++) {
    const s = -1 + (2 * (i + r())) / N;
    const ph = r() * 6.28;
    const f1 = 9 + r() * 14;
    const f2 = 3 + r() * 5;
    const amp = 0.04 + r() * 0.07;
    const ds = (r() - 0.5) * 0.3;
    t.lineWidth = H * (0.0007 + r() * 0.001);
    t.globalAlpha = 0.3 + 0.4 * r();
    const yOf = (x) => {
      const k = 1 - order(x);
      return centre(x, s) + k * k * (amp * Math.sin(x * f1 + ph) + amp * 0.6 * Math.sin(x * f2 * 2.3 + ph * 1.7) + 0.03 * Math.sin(x * 37 + ph * 3.1));
    };
    strip(t, -0.04, XM + 0.04, 0.004, yOf, (x) => ramp(hue(x, s + ds)));
  }
  t.globalAlpha = 1;
  t.globalCompositeOperation = 'destination-in';
  const fade = t.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0.32)');
  fade.addColorStop(0.3, 'rgba(0,0,0,0.55)');
  fade.addColorStop(0.46, 'rgba(0,0,0,0.7)');
  fade.addColorStop(XM - 0.03, 'rgba(0,0,0,0.45)');
  fade.addColorStop(XM + 0.03, 'rgba(0,0,0,0)');
  t.fillStyle = fade;
  t.fillRect(0, 0, W, H);
  bloom(ctx, thr, [[H * 0.012, 0.45], [H * 0.004, 0.55], [0, 0.85]]);

  /* 3. пиксели: тот же поток справа, посчитанный по клеткам. Клетка вплотную к клетке; у границы
     и по краям пучка пиксели редеют и смешиваются с мягким свечением, как в референсе */
  const cell = Math.round(H * 0.056);
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const px = canvas(W, H);
  const q = px.getContext('2d');
  const pr = rng(7);
  const xm = XM * W;
  const sOf = (x, y) => (y - (yc - 0.07 * smooth(0.45, 1.1, x))) / HB;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cell;
      const into = (cx - xm) / cell;
      if (into < -3) continue;
      const x = (cx + cell / 2) / W;
      const s = sOf(x, (j * cell + cell / 2) / H);
      /* огибающая пучка: ровная середина, мягкий спад к краям */
      const env = Math.exp(-Math.pow(Math.abs(s) / 1.2, 4));
      const p = smooth(-2, 4, into + (pr() - 0.5) * 3) * smooth(0.06, 0.45, env + (pr() - 0.5) * 0.2);
      if (pr() > p) continue;
      const jitter = pr() < 0.1 ? 0.55 : 0.84 + 0.22 * pr();
      const lum = clamp((0.25 + 0.75 * env) * jitter, 0, 1);
      /* тусклые клетки по краям уходят в насыщенную тёмную часть шкалы, а не в серый:
         сверху к красному, снизу к синему */
      const edgeShift = (1 - env) * 0.34 * Math.sign(s);
      const col = ramp(hue(x, s) + edgeShift + (pr() - 0.5) * 0.06);
      q.fillStyle = `rgb(${col.map((v) => Math.round(v * lum))})`;
      q.fillRect(cx, j * cell, cell, cell);
    }
  }
  /* тонкая тень между клетками: читается как экран, а не таблица */
  q.globalCompositeOperation = 'source-atop';
  q.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i <= cols; i++) q.fillRect(i * cell - 1, 0, 2, H);
  for (let j = 0; j <= rows; j++) q.fillRect(0, j * cell - 1, W, 2);
  bloom(ctx, px, [[cell * 1.2, 0.2], [cell * 0.3, 0.14]]);
  ctx.drawImage(px, 0, 0);

  /* 4. к верху и низу кадра темнее: место для текста */
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, 'rgba(0,0,0,0.5)');
  v.addColorStop(0.22, 'rgba(0,0,0,0)');
  v.addColorStop(0.78, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 5, 11);

  /* импульсы бегут по рядам пикселей, где поток светится */
  const lines = [];
  for (let s = -0.8; s <= 0.81; s += 0.4) {
    const pts = [];
    for (let x = XM - 0.02; x <= 1.0001; x += 0.04) {
      const y = Math.floor((centre(x, s) * H) / cell) * cell + cell / 2;
      pts.push(+x.toFixed(4), +(y / H).toFixed(4));
    }
    lines.push(pts);
  }
  /* thick — высота клетки в долях кадра: импульс идёт светом во весь ряд */
  return { canvas: c, paths: { lines, x0: XM - 0.02, thick: +(cell / H).toFixed(4) } };
};
