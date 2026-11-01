/* АИТЕХ · Концепция B «Пиксель»: максимально простая. Без библиотек, без постоянных циклов. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { clamp, reduced } = AX;

  AX.initStub();
  AX.initMenu();
  AX.initFaq();
  AX.initForm();

  /* Появления */
  const rise = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      rise.unobserve(e.target);
    }
  }), { rootMargin: '0px 0px -8% 0px' });
  if (!reduced) $$('[data-rise]').forEach((el) => rise.observe(el));
  else $$('[data-rise]').forEach((el) => el.classList.add('is-in'));

  /* Портрет: проявляется из шума при прокрутке. Рисуем только когда значение меняется */
  const BUST = 'data:image/png;base64,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';
  const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map((v) => (v + 0.5) / 64);
  const OR = [255, 94, 26], TE = [14, 143, 134];
  const box = $('[data-emp]');
  const canvas = $('[data-emp-canvas]');
  const label = $('[data-emp-noise]');
  const ctx = canvas.getContext('2d');
  let src = null, cols = 0, rows = 0, img = null, noise = reduced ? 0 : 1, drawn = -1;
  /* постоянный псевдослучай: в покое картинка не мерцает */
  const hash = (x, y, s) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
    return n - Math.floor(n);
  };
  const draw = () => {
    if (!src || !img) return;
    const seed = noise > 0.02 ? Math.round(noise * 40) : 1;
    const nz = Math.max(noise, 0.012);
    const px = img.data;
    for (let y = 0; y < rows; y++) {
      const v = Math.min(179, (y / rows * 180) | 0);
      for (let x = 0; x < cols; x++) {
        const u = Math.min(179, (x / cols * 180) | 0);
        let g = src[v * 180 + u] / 255;
        g = Math.pow(g, 1.08);
        if (g > 0.92) g = 1;
        const th = BAYER[(y & 7) * 8 + (x & 7)];
        const base = g < th;
        const on = g * (1 - nz) + hash(x, y, seed) * nz < th;
        const c = base ? OR : TE;
        const i = (y * cols + x) * 4;
        px[i] = c[0];
        px[i + 1] = c[1];
        px[i + 2] = c[2];
        px[i + 3] = on ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    drawn = noise;
  };
  const size = () => {
    const cell = innerWidth < 900 ? 3 : Math.max(3, Math.round(innerWidth / 360));
    const r = canvas.getBoundingClientRect();
    cols = canvas.width = Math.max(8, Math.floor(r.width / cell));
    rows = canvas.height = Math.max(8, Math.floor(r.height / cell));
    img = ctx.createImageData(cols, rows);
    draw();
  };
  const onScroll = () => {
    if (reduced) return;
    const r = box.getBoundingClientRect();
    const a = innerHeight * 0.92, b = innerHeight * 0.52 - r.height / 2;
    const t = clamp((a - r.top) / (a - b), 0, 1);
    noise = 1 - t * t * (3 - 2 * t);
    if (Math.abs(noise - drawn) > 0.004 && r.bottom > 0 && r.top < innerHeight) {
      draw();
      label.textContent = 'Шум ' + Math.round(noise * 100) + '%';
    }
  };
  let tick = false;
  addEventListener('scroll', () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => {
      tick = false;
      onScroll();
    });
  }, { passive: true });
  addEventListener('resize', size);
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, 180, 180).data;
    src = new Uint8Array(180 * 180);
    for (let i = 0; i < src.length; i++) src[i] = d[i * 4];
    size();
    onScroll();
  };
  im.src = BUST;

  /* Карточка должности */
  const CARDS = [
    { role: 'ИИ-менеджер по продажам', duty: 'Инициирует коммуникацию, работает по холодной базе, реанимирует «спящих» клиентов, работает с CRM' },
    { role: 'ИИ-менеджер клиентской поддержки', duty: 'Мгновенно отвечает клиентам, всегда вежлив и эмоционально устойчив, соблюдает корпоративный стиль' },
    { role: 'ИИ-ассистент для руководителей', duty: 'Работает с голосом и текстом, ищет и резюмирует информацию, управляет календарём и коммуникацией' },
  ];
  const tabs = $$('[data-idc]');
  tabs.forEach((b) =>
    b.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', t === b));
      const c = CARDS[+b.dataset.idc];
      $('[data-idc-role]').textContent = c.role;
      $('[data-idc-duty]').textContent = c.duty;
    })
  );
})();
