/* «Мята и шампань» · гладь воды (раунд 5, часть 10).
   Тёмная вода в сумерках, камера низко над поверхностью. На горизонте — тонкая полоса света шампани,
   над ней мягкое мятное свечение. Слева вода неспокойна: свет рассыпается на беспорядочные блики (хаос).
   К правому краю волна стихает, вода становится зеркалом: свет ложится ровными горизонтальными линиями
   длинной зыби и чистой дорожкой под полосой (порядок). Солнца, кругов и людей в кадре нет.
   Рендер — один фрагментный шейдер (WebGL): плоскость воды из суммы волн, отражение неба по Френелю,
   мелкие волны, которые не помещаются в пиксель, переходят в шероховатость отражения, а не в шум. */
window.render = async (W, H, P) => {
  const { rng, hex, canvas, grain, bloom } = HG;
  const v3 = (h) => hex(h).map((x) => (x / 255).toFixed(4)).join(',');
  const f = (x) => x.toFixed(5);

  /* горизонт чуть ниже середины кадра; свет — правее центра, там же точка, куда едет камера */
  const YH = 0.535;
  const LX = 0.685;
  const TF = 0.36;
  const ASP = W / H;

  /* волны: неспокойный набор (много направлений, короткие и средние) и зыбь (гребни вдоль горизонта) */
  const r = rng(20261113);
  const waves = [];
  for (let i = 0; i < 30; i++) {
    const lam = 0.11 * Math.pow(30, r());
    const a = (r() * 2 - 1) * 1.45 + 0.25;
    waves.push({ set: 'c', dx: Math.sin(a), dz: Math.cos(a), k: (2 * Math.PI) / lam, s: 0.075 * (0.6 + 0.8 * r()), ph: r() * 6.283 });
  }
  for (let i = 0; i < 6; i++) {
    const lam = 1.8 + 4.2 * r();
    const a = (r() * 2 - 1) * 0.12;
    waves.push({ set: 's', dx: Math.sin(a), dz: Math.cos(a), k: (2 * Math.PI) / lam, s: 0.026 * (0.7 + 0.6 * r()), ph: r() * 6.283 });
  }
  for (let i = 0; i < 6; i++) {
    const lam = 0.25 + 0.4 * r();
    const a = (r() * 2 - 1) * 1.2;
    waves.push({ set: 's', dx: Math.sin(a), dz: Math.cos(a), k: (2 * Math.PI) / lam, s: 0.007, ph: r() * 6.283 });
  }
  const waveCode = waves
    .map((w) => `{ vec2 d = vec2(${f(w.dx)}, ${f(w.dz)}); float k = ${f(w.k)}; float s = ${f(w.s)}${w.set === 'c' ? ' * ch' : ''};
    float l = k * length(d * fp); float a = exp(-0.5 * l * l);
    g += d * (s * a * cos(k * dot(d, q) + ${f(w.ph)})); rough += s * s * (1. - a * a) * 0.5; }`)
    .join('\n    ');

  const fs = `
precision highp float;
uniform vec2 R;
const float YH = ${f(YH)};
const float TF = ${f(TF)};
const float ASP = ${f(ASP)};
const float AZ0 = ${f(Math.atan((LX - 0.5) * 2 * TF * ASP))};
const vec3 BG = vec3(${v3(P.bg)});
const vec3 DARK = vec3(${v3(P.dark)});
const vec3 BASE = vec3(${v3(P.base)});
const vec3 LIGHT = vec3(${v3(P.light)});
const vec3 HI = vec3(${v3(P.hi)});
const vec3 SEC = vec3(${v3(P.second)});
float sm(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
float gs(float x, float w){ float t = x / w; return exp(-t * t); }

/* небо: у горизонта чуть светлее, над светом мягкая мята, на горизонте полоса шампани с ярким ядром.
   rough — разброс отражённых лучей: полоса расширяется и тускнеет, свет сохраняется */
vec3 sky(vec3 r, float rough){
  float el = r.y / max(length(r.xz), 1e-4);
  float az = atan(r.x, r.z);
  float e = max(el, 0.);
  float g1 = gs(az - AZ0, 0.46);
  float g2 = gs(az - AZ0, 0.17);
  vec3 c = mix(BG * 0.95 + DARK * 0.16, BG * 0.38, sm(0., 0.3, e));
  c += DARK * 0.75 * g1 * exp(-e / 0.06);
  c += BASE * 0.2 * (0.35 * g1 + g2) * exp(-e / 0.035);
  c += mix(SEC, LIGHT, 0.25) * 0.26 * g2 * exp(-e / 0.016);
  c += SEC * 0.16 * g2 * exp(-e / 0.05);
  float w1 = sqrt(0.011 * 0.011 + rough * rough);
  c += mix(SEC, LIGHT, 0.2) * 0.75 * (0.42 + 0.58 * g1) * (0.011 / w1) * gs(el, w1);
  float w2 = sqrt(0.0032 * 0.0032 + rough * rough);
  c += mix(HI, SEC, 0.82) * 2.1 * (0.3 + 0.7 * g2) * (0.0032 / w2) * gs(el, w2);
  return c;
}

void waves(vec2 q, vec2 fp, float ch, out vec2 g, out float rough){
  g = vec2(0.);
  rough = 0.;
  ${waveCode}
}

vec3 shade(vec2 px){
  float u = px.x / R.x;
  float v = 1. - px.y / R.y;
  vec3 d = vec3((u - 0.5) * 2. * TF * ASP, (YH - v) * 2. * TF, 1.);
  if (d.y >= 0.) return sky(d, 0.);
  float t = 1. / -d.y;
  vec2 q = vec2(d.x * t, t);
  float pix = 2. * TF / R.y;
  vec2 fp = vec2(t * pix, t * t * pix);
  /* хаос слева, зеркало справа */
  float ch = 1. - sm(0.2, 0.74, u);
  vec2 g; float rough;
  waves(q, fp, ch, g, rough);
  vec3 n = normalize(vec3(-g.x, 1., -g.y));
  vec3 dn = normalize(d);
  vec3 rr = reflect(dn, n);
  rr.y = abs(rr.y);
  float ci = max(dot(-dn, n), 0.);
  float F = 0.02 + 0.98 * pow(1. - ci, 5.);
  vec3 body = BG * 0.85 + DARK * 0.06;
  return mix(body, sky(rr, sqrt(rough) * 2.), F);
}

void main(){
  /* четыре луча на пиксель по повёрнутой решётке */
  vec2 o = gl_FragCoord.xy;
  vec3 c = shade(o + vec2(0.125, 0.375)) + shade(o + vec2(-0.375, 0.125)) + shade(o + vec2(0.375, -0.125)) + shade(o + vec2(-0.125, -0.375));
  c *= 0.25;
  /* виньетка и затемнение сверху под меню и заголовок */
  vec2 p = gl_FragCoord.xy / R;
  float vg = 1. - 0.35 * pow(length((p - vec2(0.62, 0.5)) * vec2(0.9, 1.2)), 2.2);
  c *= clamp(vg, 0., 1.);
  c = 1. - exp(-c * 1.35);
  gl_FragColor = vec4(pow(c, vec3(1. / 1.05)), 1.);
}`;

  const cv = canvas(W, H);
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false });
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(pr, 'R'), W, H);
  gl.viewport(0, 0, W, H);
  /* полосами, чтобы один вызов не держал видеокарту слишком долго */
  gl.enable(gl.SCISSOR_TEST);
  const STRIPS = 12;
  for (let i = 0; i < STRIPS; i++) {
    const y0 = Math.floor((i * H) / STRIPS);
    const y1 = Math.floor(((i + 1) * H) / STRIPS);
    gl.scissor(0, y0, W, y1 - y0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  }

  const out = canvas(W, H);
  const ctx = out.getContext('2d');
  ctx.drawImage(cv, 0, 0);
  /* лёгкое свечение бликов */
  const layer = canvas(W, H);
  layer.getContext('2d').drawImage(cv, 0, 0);
  bloom(ctx, layer, [[W * 0.003, 0.14], [W * 0.012, 0.1]]);
  grain(ctx, W, H, 3, 11);

  /* импульсы бегут по горизонту в правой, спокойной части */
  return { canvas: out, paths: { lines: [[0.5, YH, 1, YH]], x0: 0.52 } };
};
