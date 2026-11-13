/* «Оранжевый перелив» · световой занавес (раунд 5, часть 10).
   Референсы заказчика: WMT AI, Nexora Biosystems (оранжевое и сиреневое свечение на тёмном), Kontour.
   На тёплом чёрном висит занавес света, как полярное сияние: нижняя кромка янтарная и оранжевая,
   выше свет уходит в розовый и гаснет сиренью. Слева несколько занавесов сложены в складки и перекрывают
   друг друга (хаос), к центру они сходятся в один, и вправо уходит ровная дуга с лучами через равный шаг
   (порядок). Солнца, кругов, лент и людей в кадре нет.
   Рендер — WebGL: занавес набирается из тысяч тонких вертикальных полос со сложением света в буфере
   с плавающей точкой; в складках полосы ложатся плотнее, поэтому складки светятся ярче, как у настоящего сияния. */
window.render = async (W, H, P) => {
  const { rng, smooth, lerp, hex, canvas, grain, bloom, samplePath } = HG;
  const v3 = (h) => hex(h).map((x) => (x / 255).toFixed(4)).join(',');

  /* нижняя кромка порядка: дуга поднимается от центра к правому краю */
  const arc = (x) => 0.6 - 0.27 * Math.pow(smooth(0.44, 1.08, x), 1.2);
  const r = rng(77141);
  /* шум по одной оси для лучей хаоса */
  const NS = Array.from({ length: 4096 }, () => r());
  const noise1 = (t) => {
    const i = Math.floor(t);
    const f = t - i;
    const a = NS[((i % 4096) + 4096) % 4096];
    const b = NS[(((i + 1) % 4096) + 4096) % 4096];
    return lerp(a, b, f * f * (3 - 2 * f));
  };
  const fbm = (t) => 0.55 * noise1(t) + 0.3 * noise1(t * 2.3 + 17) + 0.15 * noise1(t * 5.1 + 41);

  /* занавесы хаоса: свой уровень, свои складки; первый продолжается дугой порядка */
  const LAY = [
    { y: 0.55, A: 0.02, f: 2.6, ph: 0.4, g: 1.3, gp: 0.6, wa: 0.07, h: 0.1, e: 1 },
    { y: 0.5, A: 0.02, f: 3.3, ph: 2.1, g: 2.2, gp: 2.4, wa: 0.1, h: 0.08, e: 0.85 },
    { y: 0.58, A: 0.018, f: 3.9, ph: 4.4, g: 2.9, gp: 4.2, wa: 0.085, h: 0.07, e: 0.7 },
    { y: 0.46, A: 0.02, f: 2.2, ph: 5.6, g: 1.8, gp: 5.5, wa: 0.09, h: 0.075, e: 0.6 },
    { y: 0.52, A: 0.016, f: 4.4, ph: 1.2, g: 3.4, gp: 3.1, wa: 0.06, h: 0.06, e: 0.5 },
  ];
  const N = 26000;
  const ds = 1 / N;
  const verts = [];
  LAY.forEach((L, j) => {
    const keep = j === 0;
    const xOf = (s) => s * 1.1 - 0.05 + L.A * (1 - smooth(0.26, 0.56, s)) * Math.sin(2 * Math.PI * L.f * s + L.ph);
    for (let i = 0; i <= N; i++) {
      const s = i * ds;
      const x = xOf(s);
      const dx = (xOf(Math.min(1, s + ds)) - xOf(Math.max(0, s - ds))) / 2;
      /* порядок: после середины уровень кромки сходится к дуге */
      const o = smooth(0.42, 0.64, s);
      const wave = L.wa * Math.sin(2 * Math.PI * L.g * s + L.gp) * (0.6 + 0.4 * Math.sin(2 * Math.PI * L.g * 1.7 * s + L.gp * 2)) * (1 - o);
      const yb = lerp(L.y + wave, arc(x), o);
      /* хаос: лучи случайной яркости и высоты; порядок: лучи через равный шаг */
      const rays = 0.45 + 0.55 * fbm(s * 140 + j * 37);
      const comb = 0.48 + 0.52 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * s * 118), 3);
      const k = keep ? lerp(rays, comb, smooth(0.55, 0.72, s)) : rays;
      const fade = keep ? 1 : 1 - smooth(0.46, 0.62, s);
      const edge = smooth(-0.02, 0.14, x) * (1 - smooth(1.0, 1.06, x));
      const e = L.e * k * fade * edge * (keep ? 1 + 0.5 * smooth(0.5, 0.9, s) : 1);
      if (e < 0.002) continue;
      const h = lerp(L.h * (0.75 + 0.5 * fbm(s * 9 + j * 11)), 0.19 + 0.04 * smooth(0.6, 1, x), keep ? o : 0);
      /* ширина полосы в пикселях: шаг по экрану, но не уже 0,35 % кадра, иначе складки горят столбами;
         свет на пиксель — обратно ширине */
      const wpx = Math.max(Math.abs(dx) * W, W * 0.004);
      const I = (e * ds * W) / wpx;
      const x0 = ((x * W - wpx / 2) / W) * 2 - 1;
      const x1 = ((x * W + wpx / 2) / W) * 2 - 1;
      /* полоса начинается чуть ниже кромки: под ней короткое мягкое свечение */
      const yB = 1 - (yb + 0.025) * 2;
      const yT = 1 - (yb - h) * 2;
      /* p.x, p.y, поперёк (-1..1), вдоль (0 — кромка, 1 — верх), свет, номер занавеса */
      const vb = -0.025 / h;
      verts.push(x0, yB, -1, vb, I, j, x1, yB, 1, vb, I, j, x0, yT, -1, 1, I, j, x0, yT, -1, 1, I, j, x1, yB, 1, vb, I, j, x1, yT, 1, 1, I, j);
    }
  });

  const cv = canvas(W, H);
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
  const fl = gl.getExtension('OES_texture_float') && gl.getExtension('WEBGL_color_buffer_float');
  const hf = !fl && gl.getExtension('OES_texture_half_float');
  if (!fl) gl.getExtension('EXT_color_buffer_half_float');
  const TYPE = fl ? gl.FLOAT : hf ? hf.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  /* 1. Накопление света */
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, TYPE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const SCALE = TYPE === gl.UNSIGNED_BYTE ? 0.25 : 1;
  const pA = prog(
    `attribute vec2 p; attribute vec2 t; attribute vec2 a;
     varying vec2 vt; varying float vi; varying float vj;
     void main(){ vt = t; vi = a.x; vj = a.y; gl_Position = vec4(p, 0., 1.); }`,
    `precision highp float;
     varying vec2 vt; varying float vi; varying float vj;
     const vec3 OR = vec3(${v3(P.base)});
     const vec3 AM = vec3(${v3(P.amber)});
     const vec3 RO = vec3(${v3(P.rose)});
     const vec3 VI = vec3(${v3(P.violet)});
     const vec3 PE = vec3(${v3(P.peri)});
     const vec3 HI = vec3(${v3(P.hi)});
     float sm(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
     void main(){
       float v = vt.y;
       /* яркая резкая нижняя кромка, выше свет мягко гаснет; у дальних занавесов кромка мягче */
       float core = 0.7 * exp(-max(v, 0.) * 3.) + 0.3 * exp(-max(v, 0.) * 0.9);
       float lower = exp(-pow(min(v, 0.) / 0.05, 2.));
       float a = core * lower * mix(0.22, 1., sm(-0.01, 0.06 + 0.03 * vj, v)) * (1. - sm(0.6, 1., v));
       vec3 c = mix(HI, AM, sm(0., 0.025, v));
       c = mix(c, OR, sm(0.02, 0.12, v));
       c = mix(c, RO, sm(0.12, 0.42, v));
       c = mix(c, VI, sm(0.4, 0.75, v));
       /* дальние занавесы холоднее: больше розового и сирени */
       c = mix(c, mix(RO, VI, 0.45), 0.22 * vj * sm(0.03, 0.3, v));
       c = mix(c, PE, sm(0.75, 1., v) * 0.6);
       float across = exp(-vt.x * vt.x * 2.2);
       gl_FragColor = vec4(c * a * across * vi * ${SCALE.toFixed(2)}, 1.);
     }`,
  );
  gl.useProgram(pA);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const at = (name, size, off) => {
    const l = gl.getAttribLocation(pA, name);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 24, off);
  };
  at('p', 2, 0);
  at('t', 2, 8);
  at('a', 2, 16);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  const count = verts.length / 6;
  const STEP = 60000;
  for (let i = 0; i < count; i += STEP) {
    gl.drawArrays(gl.TRIANGLES, i, Math.min(STEP, count - i));
    gl.finish();
  }
  gl.disable(gl.BLEND);

  /* 2. Сведение: тёплый чёрный, свет занавеса, мягкий отсвет у земли, тональная кривая */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const pB = prog(
    `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0., 1.); }`,
    `precision highp float;
     varying vec2 uv;
     uniform sampler2D T;
     const vec3 BG = vec3(${v3(P.bg)});
     const vec3 DEEP = vec3(${v3(P.deep)});
     const vec3 OR = vec3(${v3(P.base)});
     const vec3 VI = vec3(${v3(P.violet)});
     void main(){
       vec3 L = texture2D(T, uv).rgb / ${SCALE.toFixed(2)};
       float y = 1. - uv.y;
       vec3 c = BG;
       /* за занавесом слабое тёплое свечение неба, вверху слева чуть сирени */
       c += DEEP * 0.06 * exp(-pow((y - 0.42) / 0.22, 2.));
       c += VI * 0.035 * exp(-pow((y - 0.18) / 0.25, 2.)) * (1. - uv.x);
       c += L * 1.65;
       c = 1. - exp(-c * 1.5);
       gl_FragColor = vec4(c, 1.);
     }`,
  );
  gl.useProgram(pB);
  const qb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pB, 'p');
  gl.enableVertexAttribArray(lp);
  gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(pB, 'T'), 0);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.finish();

  const out = canvas(W, H);
  const ctx = out.getContext('2d');
  ctx.drawImage(cv, 0, 0);
  const layer = canvas(W, H);
  layer.getContext('2d').drawImage(cv, 0, 0);
  bloom(ctx, layer, [[W * 0.003, 0.2], [W * 0.014, 0.16], [W * 0.045, 0.1]]);
  grain(ctx, W, H, 3.5, 23);

  /* импульсы бегут по нижней кромке дуги порядка */
  return { canvas: out, paths: { lines: [samplePath(arc, 0.58, 1, 48)], x0: 0.6 } };
};
