/* «Перелив» · жидкая лента (раунд 5, часть 9).
   Референсы заказчика: WMT AI (глянцевые формы с оранжевым и фиолетовым переливом), Nexora Biosystems
   (оранжевое и сиреневое свечение на тёмном), Kontour (оранжевый свет на чёрном, крупный шрифт).
   Широкая глянцевая лента слева кувыркается и перекручивается (хаос), к правому краю раскручивается
   и выходит ровной гладкой полосой (порядок). Цвет — отражение тёмной студии с оранжевым, янтарным,
   розовым и сиреневым светом; по краям граней перелив, как у тонкой плёнки. Людей и шаров нет.
   Рендер — сетка в WebGL, кадр с прозрачным фоном: на сайте за лентой можно поставить крупное слово. */
window.render = async (W, H, P) => {
  const { FOCUS, hex, canvas, grain, smooth, lerp } = HG;
  const v3 = (h) => hex(h).map((x) => (x / 255).toFixed(4)).join(',');
  const gl3 = canvas(W, H);
  const gl = gl3.getContext('webgl', { preserveDrawingBuffer: true, antialias: true, alpha: true, premultipliedAlpha: false });
  const ext = gl.getExtension('OES_element_index_uint');

  /* камера: перспектива, смотрит вдоль -z */
  const CAMZ = 6.4;
  const FOV = (26 * Math.PI) / 180;
  const ASP = W / H;
  const HH = Math.tan(FOV / 2) * CAMZ; // полувысота кадра на z = 0
  /* высота точки порядка в мировых координатах на z = 0 */
  const fy = -(FOCUS.y * 2 - 1) * HH;

  /* три ленты разной ширины. u от 0 (слева, хаос) до 1 (справа, порядок): слева каждая кувыркается
     по-своему, к правому краю раскручивается и ложится параллельно соседним */
  const RIB = [
    { off: 0.0, w: 0.25, ph: 0.0, tw: 2.4, amp: 1.0 },
    { off: -0.4, w: 0.14, ph: 2.2, tw: 3.1, amp: 1.2 },
    { off: 0.36, w: 0.11, ph: 4.1, tw: 2.7, amp: 1.1 },
  ];
  const chaos = (u) => 1 - smooth(0.28, 0.62, u);
  const spineOf = (R) => (u) => {
    const a = chaos(u);
    const x = lerp(-HH * ASP * 1.25, HH * ASP * 1.25, u);
    const y = fy + R.off * (0.35 + 0.65 * smooth(0.3, 0.7, u)) + 0.16 * smooth(0.55, 1, u)
      + a * R.amp * (0.5 * Math.sin(u * 8.2 + 0.9 + R.ph) + 0.2 * Math.sin(u * 15.5 + 2.1 + R.ph * 1.7));
    /* ровная часть не плоская: мягкая волна по глубине, чтобы по ней тянулись блики */
    const z = a * R.amp * (0.9 * Math.sin(u * 6.1 + 0.4 + R.ph) - 0.3) + (1 - a) * 0.12 * Math.sin(u * 9 + R.ph);
    return [x, y, z];
  };
  const twistOf = (R) => (u) => 2 * Math.PI * R.tw * (1 - smooth(0.02, 0.6, u)) ** 1.4 + 0.22 * Math.sin(u * 3 + R.ph);
  const widthOf = (R) => (u) => R.w * (1 + 0.15 * smooth(0.5, 1, u));

  const NU = 1400;
  const NV = 40;
  const NR = RIB.length;
  const VERTS = (NU + 1) * (NV + 1);
  const pos = new Float32Array(VERTS * NR * 3);
  const uv = new Float32Array(VERTS * NR * 2);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  RIB.forEach((R, r) => {
    const spine = spineOf(R);
    const twist = twistOf(R);
    const width = widthOf(R);
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      const c = spine(u);
      const t = norm(sub(spine(Math.min(1, u + 1e-3)), spine(Math.max(0, u - 1e-3))));
      const n = norm([-t[1], t[0], 0]);
      const b = norm(cross(t, n));
      const th = twist(u);
      const d = [n[0] * Math.cos(th) + b[0] * Math.sin(th), n[1] * Math.cos(th) + b[1] * Math.sin(th), n[2] * Math.cos(th) + b[2] * Math.sin(th)];
      const e = cross(t, d);
      const w = width(u);
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1;
        /* лента выгнута поперёк, как атлас: блик тянется вдоль неё полосой */
        const bow = w * 0.2 * (1 - v * v);
        const k = r * VERTS + i * (NV + 1) + j;
        pos[k * 3] = c[0] + d[0] * v * w + e[0] * bow;
        pos[k * 3 + 1] = c[1] + d[1] * v * w + e[1] * bow;
        pos[k * 3 + 2] = c[2] + d[2] * v * w + e[2] * bow;
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
      }
    }
  });
  /* нормали по сетке */
  const nor = new Float32Array(pos.length);
  for (let r = 0; r < NR; r++) {
    const P3 = (i, j) => {
      const k = (r * VERTS + Math.max(0, Math.min(NU, i)) * (NV + 1) + Math.max(0, Math.min(NV, j))) * 3;
      return [pos[k], pos[k + 1], pos[k + 2]];
    };
    for (let i = 0; i <= NU; i++) {
      for (let j = 0; j <= NV; j++) {
        const n = norm(cross(sub(P3(i + 1, j), P3(i - 1, j)), sub(P3(i, j + 1), P3(i, j - 1))));
        const k = (r * VERTS + i * (NV + 1) + j) * 3;
        nor[k] = n[0];
        nor[k + 1] = n[1];
        nor[k + 2] = n[2];
      }
    }
  }
  const idx = new Uint32Array(NU * NV * 6 * NR);
  let q = 0;
  for (let r = 0; r < NR; r++) {
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = r * VERTS + i * (NV + 1) + j;
        const b = a + NV + 1;
        idx.set([a, b, a + 1, a + 1, b, b + 1], q);
        q += 6;
      }
    }
  }

  const vs = `
attribute vec3 p; attribute vec3 n; attribute vec2 t;
uniform mat4 M;
varying vec3 vp; varying vec3 vn; varying vec2 vt;
void main(){ vp = p; vn = n; vt = t; gl_Position = M * vec4(p, 1.); }`;
  const fs = `
precision highp float;
varying vec3 vp; varying vec3 vn; varying vec2 vt;
const vec3 CAM = vec3(0., 0., ${CAMZ.toFixed(3)});
const vec3 DEEP = vec3(${v3(P.deep)});
const vec3 OR = vec3(${v3(P.base)});
const vec3 AM = vec3(${v3(P.amber)});
const vec3 RO = vec3(${v3(P.rose)});
const vec3 VI = vec3(${v3(P.violet)});
const vec3 PE = vec3(${v3(P.peri)});
const vec3 HI = vec3(${v3(P.hi)});
float sm(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0., 1.); return t*t*(3.-2.*t); }
float strip(float x, float c, float w){ return exp(-pow((x - c) / w, 2.)); }
/* тёмная студия: большой оранжевый софтбокс справа сверху, янтарный ключ сверху,
   розовая полоса слева, сиреневый контровой снизу */
vec3 env(vec3 r){
  vec3 c = DEEP * 0.22 * (0.6 + 0.4 * r.y);
  float front = sm(-0.4, 0.4, r.z);
  c += OR * 1.7 * strip(r.y, 0.5, 0.2) * front;
  c += AM * 1.4 * strip(r.y, 0.62, 0.07) * sm(-0.2, 0.6, r.x + 0.3);
  c += HI * 1.8 * strip(r.y, 0.66, 0.018) * sm(-0.1, 0.5, r.x + 0.2);
  c += RO * 1.1 * strip(r.x, -0.62, 0.16) * front;
  c += OR * 1.0 * strip(r.x, 0.7, 0.14);
  c += VI * 1.1 * strip(r.y, -0.55, 0.22) * front;
  c += PE * 0.5 * strip(r.y, -0.8, 0.08);
  return c;
}
/* перелив тонкой плёнки: прямо на камеру — оранжевый и янтарный, к скользящему углу — розовый, сирень, голубой */
vec3 film(float x){
  vec3 c = mix(AM, OR, sm(0.95, 0.7, x));
  c = mix(c, RO, sm(0.62, 0.38, x));
  c = mix(c, VI, sm(0.34, 0.16, x));
  c = mix(c, PE, sm(0.14, 0.02, x));
  return c;
}
void main(){
  vec3 n = normalize(vn);
  vec3 v = normalize(CAM - vp);
  if (dot(n, v) < 0.) n = -n;
  float ndv = clamp(dot(n, v), 0., 1.);
  vec3 r = reflect(-v, n);
  vec3 col = env(r);
  vec3 f = film(ndv);
  col = col * mix(vec3(1.), f * 1.35, 0.7);
  /* глубина цвета в толще: грани, смотрящие на камеру, светятся тёплым изнутри */
  col += OR * 0.22 * pow(ndv, 3.) + RO * 0.05;
  /* кромка ленты чуть ярче */
  col += HI * 0.25 * sm(0.9, 1.0, abs(vt.y)) * (1. - ndv);
  /* хаос темнее порядка, дальние витки темнее ближних */
  col *= 0.42 + 0.58 * sm(0.12, 0.6, vt.x);
  col *= clamp(0.75 + 0.18 * vp.z, 0.35, 1.15);
  col = col / (1. + col * 0.42);
  gl_FragColor = vec4(pow(col, vec3(1. / 1.08)), 1.);
}`;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const attr = (name, data, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(pr, name);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  };
  attr('p', pos, 3);
  attr('n', nor, 3);
  attr('t', uv, 2);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  /* перспектива и сдвиг камеры (столбцы, как ждёт WebGL) */
  const f = 1 / Math.tan(FOV / 2);
  const near = 0.1;
  const far = 40;
  const M = new Float32Array([
    f / ASP, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far) - ((far + near) / (near - far)) * CAMZ, CAMZ,
  ]);
  gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'M'), false, M);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.drawElements(gl.TRIANGLES, idx.length, ext ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);

  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(gl3, 0, 0);
  /* мягкое свечение вокруг ленты: тот же слой, сильно размытый, под резким */
  const glow = canvas(W, H);
  const g = glow.getContext('2d');
  g.filter = `blur(${Math.round(H * 0.03)}px)`;
  g.globalAlpha = 0.55;
  g.drawImage(gl3, 0, 0);
  g.filter = 'none';
  g.globalAlpha = 1;
  g.drawImage(gl3, 0, 0);
  grain(g, W, H, 3, 5);
  /* по оси ровной части бегут импульсы */
  const lines = [];
  const toScreen = (p) => {
    const s = CAMZ / (CAMZ - p[2]);
    return [(p[0] * s) / (HH * ASP) / 2 + 0.5, 0.5 - (p[1] * s) / HH / 2];
  };
  for (const R of RIB) {
    const spine = spineOf(R);
    const pts = [];
    for (let u = 0.6; u <= 1.0001; u += 0.02) {
      const cc = spine(u);
      const sp = toScreen(cc);
      pts.push(+sp[0].toFixed(4), +sp[1].toFixed(4));
    }
    lines.push(pts);
  }
  return { canvas: glow, paths: { lines, x0: 0.6 } };
};
