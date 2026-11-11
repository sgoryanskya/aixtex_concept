/* «Сталь и жемчуг» · металл.
   Лист полированной стали: слева смят (хаос), к правому краю выглажен в ровные параллельные складки (порядок).
   Рендер — шейдер по карте высот: свет двух длинных софтбоксов, ровная часть листа отражает тёмную студию,
   поэтому фон остаётся тёмным, а светятся только гребни. Второй софтбокс тёплый — жемчужный отлив. */
window.render = async (W, H, P) => {
  const { FOCUS, hex, samplePath, canvas, grain } = HG;
  const gl3 = canvas(W, H);
  const gl = gl3.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  const v3 = (h) => hex(h).map((x) => (x / 255).toFixed(4)).join(',');
  const fs = `
precision highp float;
uniform vec2 R;
const float YC = ${FOCUS.y.toFixed(4)};
const vec3 BG = vec3(${v3(P.bg)});
const vec3 DK = vec3(${v3(P.dark)});
const vec3 BA = vec3(${v3(P.base)});
const vec3 LI = vec3(${v3(P.light)});
const vec3 HI = vec3(${v3(P.hi)});
const vec3 PE = vec3(${v3(P.second)});
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
/* смятый лист: острые гребни разного масштаба */
float crumple(vec2 p){ float a=0., w=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<6;i++){ a += w*(1.-abs(noise(p)*2.-1.)); p=m*p; w*=.5; } return a; }
float sm(float a,float b,float x){ float t=clamp((x-a)/(b-a),0.,1.); return t*t*(3.-2.*t); }
const float LAM = 0.2;
/* фаза плавно меняется вдоль кадра: складки идут мягкой S-волной, а не прямыми трубами */
float phase(float x){ return 3.0*sin(x*4.0+0.3) + 0.5*sin(x*7.3+1.1); }
float height(vec2 uv){
  float x = uv.x, y = uv.y;
  float w = sm(0.34, 0.66, x);
  /* складки: синусоида поперёк кадра, огибающая держит их в полосе вокруг центра */
  float env = exp(-pow((y-YC)/0.24, 2.));
  float folds = 0.034*env*sin(6.2832*(y-YC)/LAM + phase(x));
  /* смятость: сильнее слева, гаснет к складкам */
  float envc = exp(-pow((y-YC)/0.3, 2.));
  /* крупные грани, как у смятой фольги: низкая частота, мелочь слабее */
  float cr = 0.03*envc*(crumple(uv*vec2(3.2,3.6)+3.1) + 0.25*crumple(uv*vec2(9.,9.)));
  return mix(cr, folds, w);
}
vec3 env(vec3 r){
  /* студия: тёмная, два длинных горизонтальных софтбокса над и под листом */
  vec3 c = mix(BG, DK*0.6, 0.5+0.5*r.y);
  c += LI*1.5*exp(-pow((r.y-0.42)/0.22,2.));
  c += PE*0.8*exp(-pow((r.y+0.38)/0.24,2.));
  c += BA*0.5*exp(-pow((r.x-0.3)/0.3,2.));
  c += HI*0.45*exp(-pow((r.y-0.46)/0.06,2.));
  return c;
}
void main(){
  vec2 uv = gl_FragCoord.xy / R; uv.y = 1.-uv.y;
  float aspect = R.x/R.y;
  vec2 e = vec2(1./R.x, 1./R.y)*1.5;
  float h = height(uv);
  float hx = (height(uv+vec2(e.x,0.)) - height(uv-vec2(e.x,0.)))/(2.*e.x*aspect);
  float hy = (height(uv+vec2(0.,e.y)) - height(uv-vec2(0.,e.y)))/(2.*e.y);
  vec3 n = normalize(vec3(-hx*1.3, hy*1.3, 1.));
  vec3 v = vec3(0.,0.,1.);
  vec3 r = reflect(-v, n);
  vec3 col = env(r);
  /* металл окрашивает отражение в цвет стали, гребни чуть светлее */
  col *= mix(vec3(1.), BA*1.6, 0.35);
  /* шлифовка: продольные риски только в цвете, не в рельефе */
  col *= 0.96 + 0.08*noise(vec2(uv.x*5., uv.y*700.))*sm(0.4, 0.7, uv.x);
  float fres = pow(1.-n.z, 2.);
  col += LI*fres*0.6;
  /* лист гаснет к верху и низу кадра, чтобы не спорить с текстом */
  float fade = exp(-pow((uv.y-YC)/0.26, 2.));
  col = mix(BG, col, clamp(fade*1.15, 0., 1.));
  /* хаос темнее порядка */
  col = mix(BG, col, 0.32 + 0.68*sm(0.22, 0.64, uv.x));
  col = col/(1.+col*0.35);
  gl_FragColor = vec4(pow(col, vec3(1./1.1)), 1.);
}`;
  const vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';
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
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(pr, 'R'), W, H);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(gl3, 0, 0);
  grain(ctx, W, H, 4, 9);

  /* импульсы скользят по склонам складок, где горит верхний софтбокс */
  const LAM = 0.2;
  const phase = (x) => 3.0 * Math.sin(x * 4.0 + 0.3) + 0.5 * Math.sin(x * 7.3 + 1.1);
  const lines = [];
  for (let k = -1; k <= 2; k++) {
    for (const d of [0, 0.5]) lines.push(samplePath((x) => FOCUS.y + LAM * (k + d - phase(x) / (2 * Math.PI)), 0.6, 1.0, 40));
  }
  return { canvas: c, paths: { lines, x0: 0.6 } };
};
