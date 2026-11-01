/* АИТЕХ · Концепция C «Лёгкость» */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { clamp, lerp, reduced, isMobile } = AX;
  const ss = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  AX.initStub();
  AX.initMenu();
  AX.initFaq();
  AX.initForm();

  /* ========== Стеклянная форма: рэймарчинг, сложность падает со скроллом ========== */
  const FRAG = `
  precision highp float;
  uniform vec2 uRes; uniform float uT; uniform float uK;
  const float PI=3.14159265;
  mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
  // узел (5,2): запутанная форма, которую видит клиент в начале
  float knot(vec3 p){
    float r=length(p.xz);
    float a=atan(p.z,p.x);
    vec2 q=vec2(r-1.02,p.y);
    vec2 q1=rot(a*2.5)*q;
    vec2 q2=rot((a+2.*PI)*2.5)*q;
    float d1=length(q1-vec2(.46,0.));
    float d2=length(q2-vec2(.46,0.));
    return min(d1,d2)-.205;
  }
  float map(vec3 p){
    vec3 q=p;
    q.xz*=rot(uT*.13);
    q.yz*=rot(.92+sin(uT*.1)*.16);
    q.xy*=rot(uT*.06);
    float s=length(q)-.94;
    float wob=.016*sin(q.x*6.+uT*.6)*sin(q.y*7.-uT*.4)*sin(q.z*6.5+uT*.5);
    float k=uK;
    float d=k>.001?mix(s,knot(q),k):s;
    return (d+wob*(.35+k))*.7;
  }
  vec3 nrm(vec3 p){
    vec2 e=vec2(.0018,-.0018);
    return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
  }
  vec3 env(vec3 d){
    float y=d.y*.5+.5;
    vec3 c=mix(vec3(.10,.03,.01),vec3(1.,.37,.10),smoothstep(.02,.56,y));
    c=mix(c,vec3(1.,.90,.82),smoothstep(.56,1.,y));
    c+=vec3(1.)*smoothstep(.70,.97,dot(d,normalize(vec3(-.62,.68,.42))))*1.25;
    c+=vec3(1.,.72,.5)*smoothstep(.84,.99,dot(d,normalize(vec3(.82,.14,.52))))*1.05;
    c+=vec3(1.,.5,.2)*smoothstep(.84,.99,dot(d,normalize(vec3(-.32,-.82,.48))))*.8;
    c+=vec3(1.,.88,.78)*smoothstep(.9,1.,sin(d.x*5.+d.y*3.2+d.z*2.))*.34;
    return c;
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.-uRes)/uRes.y;
    vec3 ro=vec3(0.,0.,4.);
    vec3 rd=normalize(vec3(uv,-2.));
    float b=dot(ro,rd),h=b*b-(dot(ro,ro)-1.76*1.76);
    if(h<0.){gl_FragColor=vec4(0.);return;}
    float t=max(-b-sqrt(h),0.),tMax=-b+sqrt(h);
    bool hit=false;
    for(int i=0;i<64;i++){
      float d=map(ro+rd*t);
      if(d<.0014){hit=true;break;}
      t+=d;
      if(t>tMax)break;
    }
    if(!hit){gl_FragColor=vec4(0.);return;}
    vec3 p=ro+rd*t;
    vec3 n=nrm(p);
    float nv=max(dot(n,-rd),0.);
    float F=.05+.95*pow(1.-nv,4.6);
    // второй отрезок луча внутри стекла
    vec3 ri=refract(rd,n,.69);
    vec3 pi=p-n*.01;
    float t2=.02;
    for(int i=0;i<26;i++){
      float d=-map(pi+ri*t2);
      if(d<.002)break;
      t2+=max(d,.008);
      if(t2>3.6)break;
    }
    vec3 pe=pi+ri*t2;
    vec3 n2=-nrm(pe);
    vec3 ro2=refract(ri,n2,1.45);
    if(dot(ro2,ro2)<.01)ro2=reflect(ri,n2);
    vec3 refr=vec3(env(normalize(ro2+n2*.035)).r,env(ro2).g,env(normalize(ro2-n2*.035)).b);
    refr*=exp(-t2*vec3(.04,.22,.45)*(.25+.75*uK));
    vec3 refl=env(reflect(rd,n));
    vec3 col=mix(refr,refl,F);
    // тонкоплёночная радужка в тёплой гамме
    float film=nv*1.5+dot(n,vec3(.3,.5,.2))*.6+uT*.015;
    vec3 ir=.5+.5*cos(6.2831*(film+vec3(.0,.14,.3)));
    col+=(ir-.5)*vec3(.10,.07,.03);
    vec3 R=reflect(rd,n);
    col+=vec3(1.)*pow(max(dot(R,normalize(vec3(-.5,.75,.5))),0.),260.)*2.2;
    col+=vec3(1.,.92,.85)*pow(max(dot(R,normalize(vec3(.7,.2,.6))),0.),160.)*1.;
    // чем проще форма, тем она светлее
    col=mix(col,col*.62+vec3(.48,.32,.22),(1.-uK)*.82);
    col=col/(1.+col*.14);
    col=clamp(col,0.,1.);
    float a=smoothstep(.0,.13,nv)*.985;
    gl_FragColor=vec4(col*a,a);
  }`;
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  function initBlob() {
    const wrap = $('[data-blob]');
    const canvas = $('[data-blob-canvas]');
    const state = { k: 1 };
    const gl = reduced ? null : canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) {
      document.documentElement.classList.add('no-webgl');
      return state;
    }
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(pr));
      document.documentElement.classList.add('no-webgl');
      return state;
    }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = { res: gl.getUniformLocation(pr, 'uRes'), t: gl.getUniformLocation(pr, 'uT'), k: gl.getUniformLocation(pr, 'uK') };
    let scale = Math.min(devicePixelRatio || 1, isMobile() ? 1 : 1.4);
    const size = () => {
      const r = wrap.getBoundingClientRect();
      const w = r.width || wrap.offsetWidth;
      const px = Math.round(w * scale);
      canvas.width = px;
      canvas.height = px;
      gl.viewport(0, 0, px, px);
      gl.uniform2f(U.res, px, px);
    };
    size();
    addEventListener('resize', size);
    let vis = true, last = performance.now(), slow = 0, t = 7;
    const loop = (now) => {
      if (!vis) return;
      requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      // на слабых устройствах снижаем разрешение
      if (dt > 34) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 40 && scale > 0.6) {
        scale = Math.max(0.6, scale * 0.8);
        size();
        slow = 0;
      }
      t += Math.min(dt, 50) / 1000;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.t, t);
      gl.uniform1f(U.k, state.k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (vis) {
        last = performance.now();
        requestAnimationFrame(loop);
      }
    }).observe(wrap);
    return state;
  }

  /* ========== Герой: сценарий скролла ========== */
  function initHero() {
    const blob = initBlob();
    const chips = $$('[data-chips] li');
    const dark = $('[data-hero-dark]');
    const bloom = $('[data-hero-bloom]');
    const ghost = $('[data-hero-ghost]');
    const copy = $('[data-hero-copy]');
    const after = $('[data-hero-after]');
    const hint = $('[data-hero-hint]');
    const blobEl = $('[data-blob]');
    const fa = $('[data-fb-a]'), fb = $('[data-fb-b]');
    if (reduced) return;
    // появление
    gsap.set(copy.children, { opacity: 0, y: 28 });
    gsap.set(chips, { opacity: 0 });
    gsap.set(blobEl, { opacity: 0, scale: 0.86 });
    gsap.set(ghost, { opacity: 0 });
    const intro = gsap.timeline();
    intro.to(blobEl, { opacity: 1, scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    intro.to(ghost, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0.2);
    intro.to(copy.children, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.25);
    intro.to(chips, { opacity: 1, duration: 0.9, stagger: { each: 0.05, from: 'random' } }, 0.75);
    // парение чипов
    const floats = chips.map((c, i) => ({ c, a: Math.random() * 6.28, s: 0.4 + Math.random() * 0.5, amp: 5 + Math.random() * 6 }));
    let p = 0;
    const setChips = () => {
      if (p >= 0.999) return;
      const now = performance.now() / 1000;
      const W = innerWidth, H = innerHeight;
      floats.forEach((f, i) => {
        const x0 = parseFloat(f.c.style.getPropertyValue('--x')) / 100 * W;
        const y0 = parseFloat(f.c.style.getPropertyValue('--y')) / 100 * H;
        const cx = W * 0.5, cy = H * 0.66;
        const q = ss(0.04 + i * 0.012, 0.42 + i * 0.012, p);
        const x = (cx - x0) * q;
        const y = (cy - y0) * q + Math.sin(now * f.s + f.a) * f.amp * (1 - q);
        f.c.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${(1 - q * 0.7).toFixed(3)})`;
        if (p > 0.001) f.c.style.opacity = (1 - ss(0.72, 1, q)).toFixed(3);
      });
    };
    gsap.ticker.add(setChips);
    const apply = (raw) => {
      p = raw;
      // форма упрощается
      blob.k = 1 - ss(0.04, 0.62, p);
      // рассвет: свет поднимается снизу и заливает экран
      const bq = ss(0.14, 0.7, p);
      bloom.style.opacity = ss(0.1, 0.2, p).toFixed(3);
      bloom.style.transform = `scale(${lerp(0.16, 1.5, bq * bq).toFixed(4)})`;
      const m = isMobile();
      const s = lerp(1, m ? 0.74 : 0.84, ss(0.1, 0.72, p));
      const y = lerp(0, 4, ss(0.3, 0.8, p));
      blobEl.style.transform = `translate(-50%, calc(-50% + ${y.toFixed(2)}vh)) scale(${s.toFixed(4)})`;
      if (p > 0.001) ghost.style.transform = `translateY(-50%) scale(${(1 + p * 0.12).toFixed(3)})`;
      copy.style.opacity = (1 - ss(0.1, 0.28, p)).toFixed(3);
      copy.style.transform = `translateY(${(-p * 90).toFixed(1)}px)`;
      copy.style.pointerEvents = p > 0.25 ? 'none' : '';
      after.style.opacity = ss(0.62, 0.78, p).toFixed(3);
      after.style.transform = `translateY(${((1 - ss(0.62, 0.78, p)) * 24).toFixed(1)}px)`;
      hint.style.opacity = p > 0.02 ? 0 : 1;
      if (fa) {
        fa.style.opacity = 1 - ss(0.2, 0.6, p);
        fb.style.opacity = ss(0.2, 0.6, p);
      }
    };
    ScrollTrigger.create({
      trigger: '[data-hero]',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (t) => apply(t.progress),
    });
    apply(0);
  }

  /* ========== Карта процесса ========== */
  function initMap() {
    const box = $('[data-map-box]');
    const svg = $('[data-map-svg]');
    const holder = $('[data-map-nodes]');
    const count = $('[data-map-count]');
    const aT = $('[data-map-a]'), bT = $('[data-map-b]');
    const thumb = $('[data-map-thumb]');
    const btns = $$('[data-map-set]');
    const NS = 'http://www.w3.org/2000/svg';
    const N = [
      ['Заявка', 9, 30, 8, 50, 'end'],
      ['Звонок', 26, 13],
      ['Таблица', 44, 28],
      ['CRM', 67, 11],
      ['Письмо', 87, 22],
      ['Менеджер', 21, 50],
      ['Согласование', 44, 58],
      ['Руководитель', 68, 42],
      ['Отчёт', 89, 56],
      ['Мессенджер', 9, 74],
      ['Договор', 31, 86],
      ['Повторный звонок', 57, 80],
      ['Напоминание', 79, 88],
      ['Результат', 94, 38, 92, 50, 'end'],
    ];
    const E = [[0, 1], [0, 5], [0, 9], [1, 2], [1, 5], [2, 3], [2, 6], [3, 4], [3, 7], [4, 7], [4, 8], [5, 6], [5, 9], [5, 10], [6, 7], [6, 10], [6, 11], [7, 8], [7, 11], [8, 12], [9, 10], [10, 11], [11, 12], [12, 13], [8, 13], [4, 13], [2, 7], [1, 6], [3, 8], [9, 6]];
    const nodes = N.map((n) => {
      const el = document.createElement('div');
      el.className = 'mnode' + (n[5] === 'end' ? ' mnode--end' : '');
      el.textContent = n[0];
      holder.appendChild(el);
      return { el, x0: n[1], y0: n[2], x1: n[3] === undefined ? 50 : n[3], y1: n[4] === undefined ? 50 : n[4], end: n[5] === 'end', w: 0, h: 0, cur: { x: 0, y: 0 }, seed: Math.random() * 6.28 };
    });
    const core = document.createElement('div');
    core.className = 'mnode mnode--core';
    core.textContent = 'Виртуальный сотрудник';
    holder.appendChild(core);
    const edges = E.map(([a, b]) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'map__edge');
      svg.appendChild(p);
      return { a, b, p, bend: (Math.random() - 0.5) * 0.55 };
    });
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'map__line');
    svg.appendChild(line);
    let W = 0, H = 0;
    const size = () => {
      W = box.clientWidth;
      H = box.clientHeight;
      nodes.forEach((n) => {
        n.w = n.el.offsetWidth;
        n.h = n.el.offsetHeight;
      });
      core.w = core.offsetWidth;
      core.h = core.offsetHeight;
    };
    size();
    addEventListener('resize', size);
    const st = { p: 0, target: 0 };
    let dashOff = 0, visible = false, manual = false;
    const paint = () => {
      const p = st.p;
      const now = performance.now() / 1000;
      nodes.forEach((n, i) => {
        const q = n.end ? ss(0.1, 0.8, p) : ss(0.05 + (i % 7) * 0.03, 0.55 + (i % 7) * 0.03, p);
        const fl = (1 - p) * 4;
        const x = lerp(n.x0, n.x1, q) * 0.01 * W + Math.sin(now * 0.7 + n.seed) * fl;
        const y = lerp(n.y0, n.y1, q) * 0.01 * H + Math.cos(now * 0.6 + n.seed) * fl;
        n.cur.x = x;
        n.cur.y = y;
        n.el.style.transform = `translate(${(x - n.w / 2).toFixed(1)}px, ${(y - n.h / 2).toFixed(1)}px)` + (n.end ? '' : ` scale(${(1 - q * 0.5).toFixed(3)})`);
        if (!n.end) n.el.style.opacity = (1 - ss(0.6, 1, q)).toFixed(3);
      });
      edges.forEach((e) => {
        const a = nodes[e.a].cur, b = nodes[e.b].cur;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const cx = mx - dy * e.bend, cy = my + dx * e.bend;
        e.p.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
        e.p.style.opacity = (1 - ss(0.25, 0.72, p)).toFixed(3);
      });
      const coreQ = ss(0.48, 0.74, p);
      core.style.opacity = coreQ.toFixed(3);
      core.style.transform = `translate(${(W * 0.5 - core.w / 2).toFixed(1)}px, ${(H * 0.5 - core.h / 2).toFixed(1)}px) scale(${(0.7 + coreQ * 0.3).toFixed(3)})`;
      const a = nodes[0].cur, b = nodes[nodes.length - 1].cur;
      line.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)}C${(W * 0.3).toFixed(1)} ${(H * 0.5 - H * 0.06 * (1 - coreQ)).toFixed(1)} ${(W * 0.7).toFixed(1)} ${(H * 0.5 + H * 0.06 * (1 - coreQ)).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      dashOff -= 0.6;
      line.style.strokeDashoffset = dashOff;
      line.style.opacity = ss(0.56, 0.78, p).toFixed(3);
      aT.style.opacity = (1 - ss(0.4, 0.56, p)).toFixed(3);
      bT.style.opacity = ss(0.5, 0.66, p).toFixed(3);
      const c = Math.round(lerp(14, 3, ss(0.08, 0.72, p)));
      count.textContent = c;
      count.nextSibling.textContent = c < 5 ? ' шага' : ' шагов';
      const on = p > 0.5 ? 1 : 0;
      thumb.style.transform = `translateX(${(p * 100).toFixed(2)}%)`;
      btns.forEach((x, i) => x.classList.toggle('is-on', i === on));
    };
    const loop = () => {
      if (!visible) return;
      requestAnimationFrame(loop);
      st.p = lerp(st.p, st.target, 0.12);
      paint();
    };
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) loop();
    }, { rootMargin: '10% 0px' }).observe(box);
    if (!reduced && !isMobile()) {
      ScrollTrigger.create({
        trigger: '[data-map]',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (t) => {
          if (!manual) st.target = ss(0.08, 0.86, t.progress);
          manual = false;
        },
      });
    } else if (!reduced) {
      ScrollTrigger.create({
        trigger: '[data-map]',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (t) => (st.target = ss(0.05, 0.9, t.progress)),
      });
    }
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        const v = +b.dataset.mapSet;
        const s = $('[data-map]');
        if (reduced) {
          st.p = st.target = v;
          return paint();
        }
        const top = s.getBoundingClientRect().top + scrollY;
        const span = s.offsetHeight - innerHeight;
        const y = top + span * (v ? 0.9 : 0.04);
        scrollTo({ top: y, behavior: 'smooth' });
      })
    );
    if (reduced) {
      st.p = st.target = 1;
      visible = true;
      paint();
      visible = false;
    }
  }

  /* ========== Телефон ========== */
  const DIALOGS = [
    {
      badge: 'Детали отправлены на почту',
      msgs: [
        ['ai', 'Здравствуйте! Это СтарлайтТелеком. Могу проинформировать о текущих акциях?'],
        ['me', 'Расскажите'],
        ['ai', 'Сейчас можно получить скидку 15% при подключении новых SIM-карт. Вам интересно?'],
        ['me', 'Да, пришлите детали на почту'],
      ],
    },
    {
      badge: 'Возражение снято без менеджера',
      msgs: [
        ['me', 'Это мошенничество?'],
        ['ai', 'Понимаю ваши опасения. Мы официальный партнёр и всегда открыты для проверки: можно позвонить на бесплатный номер 8 800 xxx-xx-xx.'],
        ['me', 'А как я могу убедиться, что это правда?'],
        ['ai', 'Хороший вопрос! Сверьте наши данные с официальным сайтом или задайте уточняющие вопросы.'],
        ['me', 'Спасибо, это звучит разумно'],
      ],
    },
    {
      badge: 'Клиент получил ссылку',
      msgs: [
        ['ai', 'Добрый день!'],
        ['me', 'Кто вы и чего хотите?'],
        ['ai', 'Я Дмитрий, менеджер онлайн-школы Future. Хотите попробовать бесплатный пробный урок программирования для ребёнка?'],
        ['me', 'Интересно, сколько стоит'],
        ['ai', 'Занятия один или два раза в неделю. Чтобы понять, подходит ли курс, можно начать с бесплатного урока.'],
        ['me', 'Скиньте ссылку на сайт'],
      ],
    },
  ];
  function initTalk() {
    const chat = $('[data-phone-chat]');
    const badge = $('[data-phone-badge]');
    const status = $('[data-phone-status]');
    const steps = $$('[data-talk-steps] li');
    let tl = null, cur = -1, auto = null, inView = false;
    const add = (who, text) => {
      const m = document.createElement('div');
      m.className = 'msg msg--' + who;
      m.textContent = text;
      chat.appendChild(m);
      requestAnimationFrame(() => m.classList.add('is-in'));
      return m;
    };
    const play = (i) => {
      cur = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const d = DIALOGS[i];
      if (tl) tl.kill();
      clearTimeout(auto);
      chat.innerHTML = '';
      badge.classList.remove('is-in');
      if (reduced) {
        d.msgs.forEach(([w, t]) => add(w, t).classList.add('is-in'));
        badge.textContent = d.badge;
        badge.classList.add('is-in');
        return;
      }
      tl = gsap.timeline();
      let typing = null;
      d.msgs.forEach(([who, text], k) => {
        if (who === 'ai') {
          tl.call(() => {
            typing = document.createElement('div');
            typing.className = 'msg msg--ai msg--typing is-in';
            typing.innerHTML = '<i></i><i></i><i></i>';
            chat.appendChild(typing);
            status.textContent = 'печатает…';
          }, null, k === 0 ? 0.3 : '+=0.5');
          tl.call(() => {
            if (typing) typing.remove();
            add('ai', text);
            status.textContent = 'на связи';
          }, null, `+=${Math.min(1.1, 0.5 + text.length / 220)}`);
        } else {
          tl.call(() => add('me', text), null, k === 0 ? 0.3 : '+=0.9');
        }
      });
      tl.call(() => {
        badge.textContent = d.badge;
        badge.classList.add('is-in');
      }, null, '+=0.35');
      tl.call(() => {
        auto = setTimeout(() => inView && play((cur + 1) % DIALOGS.length), 2600);
      });
    };
    $$('[data-talk]').forEach((b) => b.addEventListener('click', () => play(+b.dataset.talk)));
    ScrollTrigger.create({
      trigger: '.talk',
      start: 'top 62%',
      end: 'bottom 20%',
      onToggle: (t) => {
        inView = t.isActive;
        if (t.isActive && cur < 0) play(0);
        else if (t.isActive) {
          if (!tl || !tl.isActive()) play(cur);
        } else clearTimeout(auto);
      },
    });
  }

  /* ========== Каталог: вкладки ========== */
  function initTabs() {
    const btns = $$('[data-tabs] button');
    const cards = $$('[data-cat] > .c');
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        btns.forEach((x) => x.classList.toggle('is-on', x === b));
        const f = b.dataset.t;
        const show = cards.filter((c) => f === 'all' || c.dataset.g === f || c.dataset.g === 'all');
        cards.forEach((c) => c.classList.toggle('is-off', !show.includes(c)));
        $('[data-cat]').dataset.n = show.length - 1;
        if (!reduced) gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 });
        ScrollTrigger.refresh();
      })
    );
  }

  /* ========== Цифры ========== */
  function initFigures() {
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
      if (reduced) return;
      const st = { v: dec ? 1 : 0 };
      const fmt = (v) => v.toFixed(dec).replace('.', ',');
      el.textContent = fmt(st.v);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 86%',
        once: true,
        onEnter: () => gsap.to(st, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(st.v)) }),
      });
    });
    const line = $('[data-chart-line]'), fill = $('[data-chart-fill]'), ring = $('[data-ring]');
    const C = 2 * Math.PI * 52;
    ring.style.strokeDasharray = C;
    if (reduced) {
      ring.style.strokeDashoffset = C * 0.27;
      return;
    }
    const L = line.getTotalLength();
    gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set(fill, { opacity: 0 });
    ring.style.strokeDashoffset = C;
    ScrollTrigger.create({
      trigger: '[data-chart]',
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.to(line, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' });
        gsap.to(fill, { opacity: 1, duration: 1.4, delay: 0.7 });
      },
    });
    ScrollTrigger.create({
      trigger: ring,
      start: 'top 86%',
      once: true,
      onEnter: () => gsap.to(ring, { strokeDashoffset: C * 0.27, duration: 2, ease: 'power3.out' }),
    });
  }

  /* ========== Появления ========== */
  function initReveals() {
    if (reduced) return;
    $$('[data-blur]').forEach((el) => {
      const words = AX.splitWords(el);
      gsap.set(words, { opacity: 0, y: 22 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(words, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05 }),
      });
    });
    $$('[data-rise], .sub--c, .bento > *, .cat__grid > *, .fig__grid > *, .faq__i, [data-lay-l]').forEach((el) => {
      gsap.set(el, { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', delay: 0.04 }),
      });
    });
    // слои: диски разъезжаются и плывут
    if (!isMobile()) {
      gsap.set('[data-lay-img]', { x: 0, y: 0, xPercent: -50, yPercent: -50 });
      gsap.fromTo('[data-lay-img]', { yPercent: -45, scale: 0.94 }, { yPercent: -55, scale: 1.02, ease: 'none', scrollTrigger: { trigger: '[data-lay]', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    }
    if (!isMobile()) gsap.fromTo('[data-who-img]', { yPercent: 5 }, { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.who', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    // жемчужина в финале
    gsap.to('[data-end-pearl]', { y: 40, ease: 'none', scrollTrigger: { trigger: '.end', start: 'top bottom', end: 'top top', scrub: 0.6 } });
    // лента на карте
    gsap.to('.map__rib', { y: 120, rotation: 24, ease: 'none', scrollTrigger: { trigger: '[data-map]', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }

  initHero();
  initMap();
  initTalk();
  initTabs();
  initFigures();
  AX.afterFonts(initReveals);
})();
