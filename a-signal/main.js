/* АИТЕХ · Концепция A «Сигнал» */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { clamp, lerp, reduced, isMobile } = AX;
  const root = document.documentElement;
  const wordA = $('[data-word-a]');
  const wordB = $('[data-word-b]');

  AX.initStub();
  AX.initMenu();
  AX.initFaq();
  AX.initForm();

  /* ---------- Подгонка кегля: слова занимают ширину экрана точно ---------- */
  function fitAll() {
    const title = $('.hero__title');
    const avail = title.clientWidth;
    const F = parseFloat(getComputedStyle(title).fontSize);
    if (isMobile()) {
      const inner = (el) => [...el.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0);
      title.style.fontSize = (F * avail * 0.995) / Math.max(inner(wordA), inner(wordB)) + 'px';
    } else {
      title.style.fontSize = (F * (avail - avail * 0.012)) / (wordA.offsetWidth + wordB.offsetWidth) + 'px';
    }
    const zero = $('.end__zero');
    const zs = zero.children;
    const zw = zero.clientWidth;
    const zF = parseFloat(getComputedStyle(zero).fontSize);
    zero.style.fontSize = (zF * (zw - zw * 0.03)) / (zs[0].offsetWidth + zs[1].offsetWidth) + 'px';
    const logo = $('.foot__logo');
    const lW = logo.parentElement.clientWidth - parseFloat(getComputedStyle(logo.parentElement).paddingLeft) * 2;
    const lF = parseFloat(getComputedStyle(logo).fontSize);
    logo.style.fontSize = (lF * lW) / logo.offsetWidth + 'px';
  }
  let fitT;
  addEventListener('resize', () => {
    clearTimeout(fitT);
    fitT = setTimeout(() => {
      $('.hero__title').style.fontSize = '';
      $('.end__zero').style.fontSize = '';
      $('.foot__logo').style.fontSize = '';
      fitAll();
      ScrollTrigger.refresh();
    }, 160);
  });

  /* ---------- Шапка: после героя плашки, при прокрутке вниз ссылки прячутся ---------- */
  const nav = $('.nav');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (t) => {
      const y = t.scroll();
      nav.classList.toggle('is-past', y > innerHeight * 0.9);
      nav.classList.toggle('is-min', y > innerHeight * 0.9 && t.direction === 1);
    },
  });

  /* ---------- Переключение цвета интерфейса по секциям ---------- */
  $$('[data-ui]').forEach((s) => {
    const ui = s.dataset.ui;
    ScrollTrigger.create({ trigger: s, start: 'top 40px', end: 'bottom 40px', onToggle: (t) => t.isActive && (root.dataset.uiTop = ui) });
    ScrollTrigger.create({ trigger: s, start: 'top bottom-=30', end: 'bottom bottom-=30', onToggle: (t) => t.isActive && (root.dataset.uiBot = ui) });
  });

  /* ---------- Показания: сложность падает до нуля к финалу ---------- */
  const cx = $('[data-cx]');
  const rulerOn = $('[data-ruler]');
  ScrollTrigger.create({
    start: 0,
    endTrigger: '#contact',
    end: 'top 45%',
    onUpdate: (t) => {
      cx.textContent = Math.max(0, 100 - Math.round(t.progress * 100));
      rulerOn.style.clipPath = `inset(0 ${(100 - t.progress * 100).toFixed(2)}% 0 0)`;
    },
  });

  /* ---------- Герой ---------- */
  function splitLetters(el) {
    const txt = el.textContent;
    el.innerHTML = [...txt].map((c) => `<i>${c}</i>`).join('');
    return $$('i', el);
  }
  const lettersA = splitLetters(wordA);
  const lettersB = splitLetters(wordB);

  if (!reduced) {
    gsap.set([...lettersA, ...lettersB], { yPercent: 104 });
    gsap.set(['[data-hero-lead]', '[data-hero-in]', '[data-hero-out]'], { opacity: 0, y: 16 });
    gsap.set([wordA, wordB], { clipPath: 'inset(-6% -2% -10% -2%)' });
  }
  function heroIntro() {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('[data-hero-media]', { scale: 1.16 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0);
    tl.to(lettersA, { yPercent: 0, duration: 1.3, stagger: 0.035 }, 0.42);
    tl.to(lettersB, { yPercent: 0, duration: 1.3, stagger: 0.035 }, 0.6);
    tl.to('[data-hero-lead]', { opacity: 1, y: 0, duration: 1 }, 1);
    tl.to(['[data-hero-in]', '[data-hero-out]'], { opacity: 1, y: 0, duration: 1 }, 1.15);
    tl.add(() => {
      gsap.set([wordA, wordB], { clearProps: 'clipPath' });
      initHeroScrub();
      ScrollTrigger.refresh();
    }, 1.9);
  }
  function initHeroScrub() {
    const m = isMobile();
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      defaults: { ease: 'none' },
    });
    const scaleB = () => {
      const avail = $('.hero__title').clientWidth;
      return avail / wordB.offsetWidth;
    };
    tl.to('[data-hero-lead]', { opacity: 0, y: -24, duration: 0.16 }, 0);
    tl.to(['[data-hero-in]', '[data-hero-out]'], { opacity: 0, duration: 0.12 }, 0);
    // камера: от клубка к ровным линиям
    tl.to('[data-hero-media]', { scale: m ? 1.9 : 1.85, xPercent: m ? -20 : -30, duration: 1, ease: 'power1.inOut' }, 0);
    // «сложное» гаснет, «простое» занимает весь экран
    tl.to(lettersA, { yPercent: -36, opacity: 0, duration: 0.18, stagger: { each: 0.012 }, ease: 'power2.in' }, 0.02);
    if (m) tl.to(wordB, { y: () => -(innerHeight * 0.26), duration: 0.7, ease: 'power2.inOut' }, 0.16);
    else tl.to(wordB, { scale: scaleB, force3D: false, duration: 0.7, ease: 'power2.inOut' }, 0.16);
    tl.to('[data-hero-after]', { opacity: 1, duration: 0.12 }, 0.72);
    tl.to({}, { duration: 0.1 }, 0.9);
  }

  /* Импульсы бегут по волокнам: координаты линий сняты с исходного кадра */
  function heroPulses() {
    const c = $('[data-hero-pulse]');
    if (reduced || !c) return;
    const ctx = c.getContext('2d');
    const LINES = [0.3565, 0.3704, 0.3831, 0.3958, 0.4086, 0.4213, 0.434, 0.4479, 0.4606, 0.4734, 0.4861, 0.4988, 0.5127, 0.5255, 0.5394, 0.5521, 0.5648, 0.5775, 0.5891, 0.5984];
    const X0 = 0.56;
    let W = 0, H = 0, running = false;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const size = () => {
      const r = c.parentElement;
      W = r.offsetWidth;
      H = r.offsetHeight;
      c.width = W * dpr;
      c.height = H * dpr;
    };
    size();
    addEventListener('resize', size);
    const N = isMobile() ? 9 : 16;
    const pulses = Array.from({ length: N }, () => ({ l: LINES[(Math.random() * LINES.length) | 0], x: X0 + Math.random() * 0.45, v: 0.0009 + Math.random() * 0.0016, len: 0.02 + Math.random() * 0.05, a: 0.5 + Math.random() * 0.5 }));
    const tick = () => {
      if (!running) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      pulses.forEach((p) => {
        p.x += p.v;
        if (p.x - p.len > 1) {
          p.x = X0;
          p.l = LINES[(Math.random() * LINES.length) | 0];
          p.v = 0.0009 + Math.random() * 0.0016;
        }
        const y = p.l * H;
        const x2 = p.x * W, x1 = (p.x - p.len) * W;
        const g = ctx.createLinearGradient(x1, 0, x2, 0);
        g.addColorStop(0, 'rgba(255,94,26,0)');
        g.addColorStop(0.75, `rgba(255,126,60,${0.55 * p.a})`);
        g.addColorStop(1, `rgba(255,214,170,${p.a})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      });
      requestAnimationFrame(tick);
    };
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (t) => {
        running = t.isActive;
        if (running) tick();
      },
    });
    running = true;
    tick();
  }

  /* ---------- Манифест: слова загораются по мере прокрутки ---------- */
  function initHighlight() {
    $$('[data-highlight]').forEach((el) => {
      const html = el.innerHTML;
      const parts = html.split(/(\s+|&nbsp;)/);
      el.innerHTML = parts
        .map((p) => (/^(\s+|&nbsp;)$/.test(p) || !p ? p : `<span class="hl">${p}</span>`))
        .join('');
      const words = $$('.hl', el);
      if (reduced) return words.forEach((w) => w.classList.add('is-on'));
      ScrollTrigger.create({
        trigger: el,
        start: 'top 76%',
        end: 'bottom 46%',
        onUpdate: (t) => {
          const n = Math.round(t.progress * words.length);
          words.forEach((w, i) => w.classList.toggle('is-on', i < n));
        },
      });
    });
  }

  /* ---------- Появления ---------- */
  function initReveals() {
    if (reduced) return;
    $$('[data-split]').forEach((el) => {
      const words = AX.splitWords(el);
      gsap.set(words, { yPercent: 112 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 86%',
        once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045 }),
      });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.set(el, { opacity: 0, y: 22 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }),
      });
    });
    const cards = $$('.cards > *');
    gsap.set(cards, { opacity: 0, y: 36 });
    ScrollTrigger.batch(cards, {
      start: 'top 90%',
      once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }),
    });
  }

  /* ---------- Карточки: задачи по плюсу ---------- */
  $$('[data-card-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const card = b.closest('[data-card]');
      const on = card.classList.toggle('is-open');
      b.setAttribute('aria-label', on ? 'Скрыть задачи' : 'Показать задачи');
      b.setAttribute('aria-expanded', on);
    });
  });

  /* ---------- Диалоги ---------- */
  const DIALOGS = [
    {
      title: 'Диалог 01 · мессенджер',
      tone: 'корпоративный',
      result: 'детали на почте',
      msgs: [
        ['ai', 'Здравствуйте! Это СтарлайтТелеком. Могу проинформировать о текущих акциях?'],
        ['me', 'Расскажите'],
        ['ai', 'Сейчас вы можете получить скидку 15% при подключении новых SIM-карт. Вам интересно?'],
        ['me', 'Да, пришлите детали на почту'],
      ],
    },
    {
      title: 'Диалог 02 · поддержка',
      tone: 'спокойный',
      result: 'возражение снято',
      msgs: [
        ['me', 'Это мошенничество?'],
        ['ai', 'Понимаю ваши опасения. Мы официальный партнёр и всегда открыты для проверки: можете позвонить на бесплатный номер 8 800 xxx-xx-xx.'],
        ['me', 'А как я могу убедиться, что это правда?'],
        ['ai', 'Хороший вопрос! Сверьте наши данные с официальным сайтом или задайте уточняющие вопросы. Я постараюсь ответить подробно.'],
        ['me', 'Спасибо, это звучит разумно'],
      ],
    },
    {
      title: 'Диалог 03 · онлайн-школа',
      tone: 'дружелюбный',
      result: 'ссылка отправлена',
      msgs: [
        ['ai', 'Добрый день!'],
        ['me', 'Кто вы и чего хотите?'],
        ['ai', 'Я Дмитрий, менеджер по продажам онлайн-школы Future. Хотел бы рассказать о курсе программирования для детей. Интересно попробовать бесплатный пробный урок?'],
        ['me', 'Интересно, сколько стоит'],
        ['ai', 'Занятия проходят один или два раза в неделю. Чтобы понять, подходит ли курс ребёнку, можно записаться на бесплатный пробный урок.'],
        ['me', 'Скиньте ссылку на сайт'],
      ],
    },
  ];
  function initDialogs() {
    const chat = $('[data-chat]');
    const wave = $('[data-wave]');
    const tTitle = $('[data-panel-title]');
    const tTone = $('[data-panel-tone]');
    const tRes = $('[data-panel-result]');
    const steps = $$('[data-how-steps] li');
    let bars = [];
    const count = Math.floor(wave.clientWidth / 5) + 8;
    wave.innerHTML = Array.from({ length: count }, () => '<i></i>').join('');
    bars = $$('i', wave);
    let talking = false, visible = false;
    setInterval(() => {
      if (!visible) return;
      bars.forEach((b, i) => {
        const h = talking ? 4 + Math.abs(Math.sin(i * 0.5 + performance.now() / 180)) * (10 + Math.random() * 26) : 3 + Math.abs(Math.sin(i * 0.25 + performance.now() / 900)) * 4;
        b.style.setProperty('--h', h.toFixed(0) + 'px');
      });
    }, 130);
    let current = -1, tl = null;
    const addMsg = (who, text) => {
      const m = document.createElement('div');
      m.className = 'msg msg--' + who;
      m.innerHTML = `<small>${who === 'ai' ? 'АИТЕХ · агент' : 'Клиент'}</small>${text}`;
      chat.appendChild(m);
      requestAnimationFrame(() => m.classList.add('is-in'));
      return m;
    };
    const addTyping = () => {
      const m = document.createElement('div');
      m.className = 'msg msg--ai msg--typing is-in';
      m.innerHTML = '<i></i><i></i><i></i>';
      chat.appendChild(m);
      return m;
    };
    const play = (i) => {
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const d = DIALOGS[i];
      tTitle.textContent = d.title;
      tTone.textContent = d.tone;
      tRes.textContent = '…';
      if (tl) tl.kill();
      chat.innerHTML = '';
      talking = false;
      wave.classList.remove('is-talk');
      if (reduced) {
        d.msgs.forEach(([w, t]) => addMsg(w, t).classList.add('is-in'));
        tRes.textContent = d.result;
        return;
      }
      tl = gsap.timeline();
      let typing = null;
      d.msgs.forEach(([who, text], k) => {
        if (who === 'ai') {
          tl.call(() => {
            typing = addTyping();
            talking = true;
            wave.classList.add('is-talk');
          }, null, k === 0 ? 0.25 : '+=0.5');
          tl.call(() => {
            if (typing) typing.remove();
            addMsg('ai', text);
            talking = false;
            wave.classList.remove('is-talk');
          }, null, `+=${Math.min(1.1, 0.5 + text.length / 200)}`);
        } else {
          tl.call(() => addMsg('me', text), null, k === 0 ? 0.25 : '+=0.85');
        }
      });
      tl.call(() => (tRes.textContent = d.result), null, '+=0.35');
    };
    ScrollTrigger.create({ trigger: '[data-how]', start: 'top 60%', end: 'bottom top', onToggle: (t) => (visible = t.isActive), onEnter: () => play(0), onEnterBack: () => current < 0 && play(0) });
    if (!isMobile() && !reduced) {
      ScrollTrigger.create({
        trigger: '[data-how]',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (t) => play(clamp(Math.floor(t.progress * 3), 0, 2)),
      });
    }
    $$('[data-how-step]').forEach((b) => {
      b.addEventListener('click', () => {
        const i = +b.dataset.howStep;
        if (isMobile() || reduced) return play(i);
        const s = $('[data-how]');
        const top = s.getBoundingClientRect().top + scrollY;
        const span = s.offsetHeight - innerHeight;
        const y = top + span * ((i + 0.3) / 3);
        scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /* ---------- Анатомия: слои расходятся по скроллу ---------- */
  function initExploded() {
    const planes = $$('[data-plane]');
    const labels = $$('[data-ex-label]');
    const stage = $('[data-ex-stage]');
    const svg = $('[data-ex-lines]');
    const paths = $$('path', svg);
    const anchors = $$('[data-anchor]');
    const mobile = isMobile();
    const Z = mobile ? [64, 0, -64] : [1, 0, -1];
    const zUnit = () => Math.min(innerWidth * 0.16, innerHeight * 0.28);
    if (mobile || reduced) {
      const u = mobile ? 54 : zUnit() * 0.9;
      planes.forEach((p, i) => gsap.set(p, { z: [u, 0, -u][i] }));
      return;
    }
    gsap.set(planes, { z: (i) => [10, 0, -10][i] });
    const lay = () => {
      const s = stage.getBoundingClientRect();
      anchors.forEach((a, i) => {
        const r = a.getBoundingClientRect();
        const l = labels[i];
        const lr = l.getBoundingClientRect();
        const op = +getComputedStyle(l).opacity;
        const x1 = r.left - s.left, y1 = r.top - s.top;
        const x2 = lr.left - s.left - 10, y2 = lr.top - s.top + 13;
        paths[i].setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x2 - 28).toFixed(1)} ${y2.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
        paths[i].style.opacity = op;
      });
    };
    const posLabels = () => {
      const H = stage.offsetHeight;
      const ys = [0.2, 0.47, 0.73];
      labels.forEach((l, i) => gsap.set(l, { y: H * ys[i] }));
    };
    posLabels();
    addEventListener('resize', posLabels);
    const tl = gsap.timeline({
      onUpdate: lay,
      scrollTrigger: { trigger: '[data-ex]', start: 'top top', end: 'bottom bottom', scrub: 0.7, onRefresh: lay },
      defaults: { ease: 'none' },
    });
    const u = zUnit();
    tl.to(planes[0], { z: u, duration: 0.5, ease: 'power2.inOut' }, 0.06);
    tl.to(planes[2], { z: -u, duration: 0.5, ease: 'power2.inOut' }, 0.06);
    tl.to(labels[0], { opacity: 1, duration: 0.12 }, 0.2);
    tl.to(labels[1], { opacity: 1, duration: 0.12 }, 0.32);
    tl.to(labels[2], { opacity: 1, duration: 0.12 }, 0.44);
    tl.to('[data-ex-stack]', { rotationZ: -28, duration: 1, ease: 'none' }, 0);
    tl.to({}, { duration: 0.2 }, 0.8);
    lay();
  }

  /* ---------- Отрасли: вертикальный скролл в горизонталь ---------- */
  function initIndustries() {
    const sec = $('[data-ind]');
    const track = $('[data-ind-track]');
    const bar = $('[data-ind-bar]');
    const idx = $('[data-ind-i]');
    const panels = $$('[data-ind-p]');
    if (isMobile() || reduced) return;
    const dist = () => track.offsetWidth - innerWidth;
    const setH = () => (sec.style.height = dist() + innerHeight + 'px');
    setH();
    addEventListener('resize', () => {
      setH();
      ScrollTrigger.refresh();
    });
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (t) => {
          bar.style.transform = `scaleX(${t.progress.toFixed(4)})`;
          const vc = innerWidth / 2;
          let best = 0, bd = 1e9;
          panels.forEach((p, i) => {
            const r = p.getBoundingClientRect();
            const c = r.left + r.width / 2;
            const d = Math.abs(c - vc);
            if (d < bd) {
              bd = d;
              best = i;
            }
          });
          idx.textContent = String(best + 1).padStart(2, '0');
        },
      },
    });
  }

  /* ---------- Счётчики ---------- */
  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count);
      const dec = +(el.dataset.dec || 0);
      if (reduced) return;
      const st = { v: dec ? 1 : 0 };
      const fmt = (v) => v.toFixed(dec).replace('.', ',');
      el.textContent = fmt(st.v);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 86%',
        once: true,
        onEnter: () => gsap.to(st, { v: to, duration: 1.7, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(st.v)) }),
      });
    });
  }

  /* ---------- Линии: один приём на всю страницу. Прямые, спокойные, импульсы бегут только в видимом блоке ---------- */
  const fx = (v) => v.toFixed(1);
  function drawLn(svg, W, H, paths, pulses) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML =
      paths.map((d) => `<path class="ln__l" pathLength="1" d="${d}"/>`).join('') +
      pulses.map((p) => `<path class="ln__p ln__p--${p.c}" pathLength="100" d="${paths[p.i]}" style="animation-duration:${p.t}s;animation-delay:${p.d}s"/>`).join('');
  }
  const PULSES = (n, k) => Array.from({ length: k }, (_, j) => ({ i: Math.round(((j + 0.5) * n) / k) % n, c: j % 3 === 1 ? 'ice' : 'sig', t: 6 + (j % 3) * 2.2, d: -j * 1.7 }));
  const LN = {
    /* Полоса прямых линий: продолжение пучка из первого экрана */
    band(svg, W, H) {
      const n = isMobile() ? 7 : 12;
      const paths = Array.from({ length: n }, (_, i) => {
        const y = 1 + (i * (H - 2)) / (n - 1);
        return `M0 ${fx(y)}H${W}`;
      });
      drawLn(svg, W, H, paths, PULSES(n, 4));
    },
    /* Ассистент: сложное входит слева в голову, результат выходит из плеча направо */
    asst(svg, W, H) {
      const stage = svg.parentElement;
      const box = stage.getBoundingClientRect();
      const b = $('[data-asst-bust]').getBoundingClientRect();
      const hx = b.left - box.left + b.width * 0.56, hy = b.top - box.top + b.height * 0.32;
      const sx = b.left - box.left + b.width * 0.6, sy = b.top - box.top + b.height * 0.76;
      const inn = $$('.asst__tags--in li', stage).map((l) => (parseFloat(l.style.getPropertyValue('--y')) / 100) * H);
      const out = $$('.asst__tags--out li', stage).map((l) => (parseFloat(l.style.getPropertyValue('--y')) / 100) * H);
      const x0 = W * 0.27;
      const paths = [
        ...inn.map((y) => `M0 ${fx(y)}H${fx(x0)}C${fx(x0 + (hx - x0) * 0.55)} ${fx(y)} ${fx(x0 + (hx - x0) * 0.5)} ${fx(hy)} ${fx(hx)} ${fx(hy)}`),
        ...out.map((y) => `M${fx(sx)} ${fx(sy)}C${fx(sx + W * 0.08)} ${fx(sy)} ${fx(sx + W * 0.05)} ${fx(y)} ${fx(sx + W * 0.16)} ${fx(y)}H${W}`),
      ];
      const k = inn.length;
      drawLn(svg, W, H, paths, [
        { i: 0, c: 'sig', t: 5.6, d: 0 }, { i: 2, c: 'sig', t: 7, d: -2 }, { i: 4, c: 'sig', t: 6.2, d: -4 },
        { i: k, c: 'ice', t: 6, d: -1 }, { i: k + 1, c: 'ice', t: 4.8, d: -3 }, { i: k + 2, c: 'ice', t: 6.6, d: -5 },
      ]);
    },
    /* Рельс через всю ленту отраслей */
    rail(svg, W, H) {
      const n = 9, g = 11, y0 = H / 2 - ((n - 1) * g) / 2;
      const paths = Array.from({ length: n }, (_, i) => `M0 ${fx(y0 + i * g)}H${W}`);
      drawLn(svg, W, H, paths, PULSES(n, 7).map((p) => ({ ...p, t: p.t * 3 })));
    },
    /* Финал: все линии сходятся в одну */
    merge(svg, W, H) {
      const n = isMobile() ? 8 : 14, cy = H * 0.72, mx = W * 0.66;
      const paths = Array.from({ length: n }, (_, i) => {
        const y = 2 + (i * (H - 4)) / (n - 1);
        return `M0 ${fx(y)}H${fx(W * 0.3)}C${fx(W * 0.48)} ${fx(y)} ${fx(W * 0.5)} ${fx(cy)} ${fx(mx)} ${fx(cy)}H${W}`;
      });
      drawLn(svg, W, H, paths, PULSES(n, 5));
    },
  };
  function initLines() {
    const items = $$('[data-ln]').filter((svg) => !(svg.dataset.ln === 'rail' && isMobile()));
    const build = () =>
      items.forEach((svg) => {
        // рельс длиной с ленту: задаём ширину явно, иначе Safari вычисляет её из viewBox
        if (svg.dataset.ln === 'rail') svg.style.width = svg.parentElement.offsetWidth + 'px';
        const r = svg.getBoundingClientRect();
        if (r.width && r.height) LN[svg.dataset.ln](svg, Math.round(r.width), Math.round(r.height));
      });
    build();
    let t;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(build, 200);
    });
    addEventListener('load', build);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      e.target.classList.toggle('is-run', e.isIntersecting);
      if (e.isIntersecting) e.target.classList.add('is-in');
    }), { rootMargin: '5% 0px' });
    items.forEach((s) => io.observe(s));
  }

  /* ---------- Кто это: вкладки должностей ---------- */
  function initAssistant() {
    const DUTY = [
      'Инициирует коммуникацию, работает по холодной базе, реанимирует «спящих» клиентов, работает с CRM.',
      'Мгновенно отвечает клиентам, всегда вежлив и эмоционально устойчив, соблюдает корпоративный стиль.',
      'Работает с голосом и текстом, ищет и резюмирует информацию, управляет календарём и коммуникацией.',
    ];
    const duty = $('[data-asst-duty]');
    const tabs = $$('[data-asst-tab]');
    tabs.forEach((b) =>
      b.addEventListener('click', () => {
        tabs.forEach((t) => t.setAttribute('aria-selected', t === b));
        duty.textContent = DUTY[+b.dataset.asstTab];
      })
    );
  }

  /* ---------- Результат: линии сетки уходят за край экрана, график растёт по ним ---------- */
  function initResults() {
    const DATA = [
      { task: 'Один человек и на заявках, и на работе. Пока вы на объекте или спите, сообщения остаются без ответа.', title: 'Заявки в работе, в месяц', a: [18, 20, 19, 21, 20, 22], b: [18, 26, 34, 41, 47, 52], m1: ['Часов в неделю на переписку', 14, 3, 'ч'], m2: ['Ответ клиенту', '3 часа', '1 мин'] },
      { task: 'Несколько сотрудников и поток обращений, в котором теряются заявки. Новый менеджер пока не окупится.', title: 'Заявки в работе, в месяц', a: [40, 42, 41, 45, 44, 46], b: [40, 58, 74, 88, 101, 112], m1: ['Часов в неделю на рутину', 32, 9, 'ч'], m2: ['Потерянные заявки', '27%', '2%'] },
      { task: 'Отдел продаж не успевает обрабатывать базу, поддержка тонет в однотипных вопросах, штат растёт вслед за нагрузкой.', title: 'Обработанные контакты, в месяц', a: [210, 215, 224, 220, 231, 236], b: [210, 340, 480, 610, 720, 810], m1: ['Часов отдела в неделю на рутину', 160, 48, 'ч'], m2: ['Обзвон холодной базы', '12 дней', '2 дня'] },
      { task: 'Длинный цикл сделки, много согласований и систем. Нужен контроль, безопасность и размещение в своей инфраструктуре.', title: 'Квалифицированные лиды, в месяц', a: [120, 118, 126, 131, 128, 134], b: [120, 164, 212, 258, 296, 330], m1: ['Часов в месяц на типовые запросы', 640, 180, 'ч'], m2: ['Ответ на входящий запрос', '3 дня', '4 часа'] },
    ];
    const svg = $('[data-res-chart]');
    const tabs = $$('[data-res-tab]');
    const q = (k) => $(`[data-res-${k}]`);
    const cur = { a: DATA[0].a.slice(), b: DATA[0].b.slice(), max: 60, reveal: reduced ? 1 : 0 };
    let W = 0, H = 0, title = DATA[0].title;
    const smooth = (pts) => pts.reduce((d, p, i) => {
      if (!i) return `M${fx(p[0])} ${fx(p[1])}`;
      const o = pts[i - 1], oo = pts[i - 2] || o, n = pts[i + 1] || p;
      return `${d}C${fx(o[0] + (p[0] - oo[0]) / 6)} ${fx(o[1] + (p[1] - oo[1]) / 6)} ${fx(p[0] - (n[0] - o[0]) / 6)} ${fx(p[1] - (n[1] - o[1]) / 6)} ${fx(p[0])} ${fx(p[1])}`;
    }, '');
    const paint = () => {
      const m = isMobile();
      const pad = m ? 16 : Math.max(32, W * 0.04), top = 34, bot = 30, rows = 9;
      const x = (i) => pad + (i * (W - pad * 2 - (m ? 66 : 150))) / 5;
      const y = (v) => top + (1 - v / cur.max) * (H - top - bot);
      const A = cur.a.map((v, i) => [x(i), y(v)]), B = cur.b.map((v, i) => [x(i), y(v)]);
      let grid = '';
      for (let i = 0; i < rows; i++) {
        const gy = top + (i * (H - top - bot)) / (rows - 1);
        grid += `<path class="res__g" d="M0 ${fx(gy)}H${W}"/>`;
      }
      const lastA = A[5], lastB = B[5];
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML =
        grid +
        `<text class="res__t" x="${pad}" y="16">${title}</text>` +
        `<g clip-path="url(#res-clip)"><path class="res__a" d="${smooth(A)}H${W}"/><path class="res__fill" d="${smooth(B)}H${W}V${H - bot}H${fx(pad)}Z"/><path class="res__b" d="${smooth(B)}H${W}"/></g>` +
        `<clipPath id="res-clip"><rect width="${fx(W * cur.reveal)}" height="${H}"/></clipPath>` +
        (cur.reveal > 0.9
          ? `<rect class="res__dot" x="${fx(lastB[0] - 4)}" y="${fx(lastB[1] - 4)}" width="8" height="8"/><text class="res__v res__v--b" text-anchor="end" x="${W - pad}" y="${fx(lastB[1] - 10)}">С агентом ${Math.round(cur.b[5])}</text><text class="res__v" text-anchor="end" x="${W - pad}" y="${fx(lastA[1] - 10)}">Без агента ${Math.round(cur.a[5])}</text>`
          : '') +
        [...Array(6).keys()].map((i) => `<text class="res__x" x="${fx(x(i))}" y="${H - 8}">${m && i % 2 ? '' : 'Мес. ' + (i + 1)}</text>`).join('');
    };
    const size = () => {
      const r = svg.parentElement.getBoundingClientRect();
      W = Math.round(r.width);
      H = Math.round(r.height);
      paint();
    };
    const fill = (i) => {
      const d = DATA[i];
      title = d.title;
      q('task').textContent = d.task;
      q('m1-t').textContent = d.m1[0];
      q('m1-a').style.setProperty('--w', '100%');
      q('m1-b').style.setProperty('--w', (d.m1[2] / d.m1[1]) * 100 + '%');
      q('m1-av').textContent = d.m1[1] + ' ' + d.m1[3];
      q('m1-bv').textContent = d.m1[2] + ' ' + d.m1[3];
      q('m2-t').textContent = d.m2[0];
      q('m2-a').textContent = d.m2[1];
      q('m2-b').textContent = d.m2[2];
    };
    const go = (i) => {
      tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i));
      fill(i);
      const d = DATA[i], to = { max: Math.max(...d.b) * 1.16 };
      d.a.forEach((v, k) => (to['a' + k] = v));
      d.b.forEach((v, k) => (to['b' + k] = v));
      const st = { max: cur.max };
      cur.a.forEach((v, k) => (st['a' + k] = v));
      cur.b.forEach((v, k) => (st['b' + k] = v));
      gsap.to(st, {
        ...to,
        duration: reduced ? 0 : 0.8,
        ease: 'power3.inOut',
        onUpdate: () => {
          cur.max = st.max;
          for (let k = 0; k < 6; k++) {
            cur.a[k] = st['a' + k];
            cur.b[k] = st['b' + k];
          }
          paint();
        },
      });
    };
    tabs.forEach((t) => t.addEventListener('click', () => go(+t.dataset.resTab)));
    cur.max = Math.max(...DATA[0].b) * 1.16;
    fill(0);
    size();
    addEventListener('resize', size);
    if (!reduced) {
      ScrollTrigger.create({
        trigger: svg,
        start: 'top 78%',
        once: true,
        onEnter: () => gsap.to(cur, { reveal: 1, duration: 2, ease: 'power2.inOut', onUpdate: paint }),
      });
    }
  }

  /* ---------- Запуск ---------- */
  initHighlight();
  initDialogs();
  initCounters();
  heroPulses();
  initAssistant();
  initResults();
  AX.afterFonts(() => {
    fitAll();
    initReveals();
    initExploded();
    initIndustries();
    initLines();
    heroIntro();
    ScrollTrigger.refresh();
  });
})();
