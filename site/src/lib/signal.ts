/* Движение концепции A «Сигнал» (a-signal/main.js), перенесённое без изменения таймингов.
   Изменения: цвет импульсов берётся из палитры, блоки 8 и 9 без счётчиков и графика,
   строки блока 9 проигрывают переход «было → стало», карточки каталога открывают панель решения. */
import { gsap, ScrollTrigger, $, $$, reduced, isMobile, clamp, lock, initAnchors, initStub, initMenu, initFaq, initForm, afterFonts, splitWords } from './ax';
import { onPalette } from './theme-controller';

const root = document.documentElement;
const wordA = $('[data-word-a]')!;
const wordB = $('[data-word-b]')!;

initAnchors();
initStub();
initMenu();
initFaq();
initForm();

/* ---------- Вариант второго слова: в режиме согласования ?hero=managed ---------- */
(function heroVariant() {
  const h1 = $('[data-hero-variants]');
  const want = new URLSearchParams(location.search).get('hero');
  if (!h1?.dataset.heroVariants || !want) return;
  try {
    const map = JSON.parse(h1.dataset.heroVariants) as Record<string, { word: string; h1: string }>;
    const v = map[want];
    if (!v) return;
    wordB.textContent = v.word;
    const sr = $('[data-hero-h1]', h1);
    if (sr) sr.textContent = v.h1;
  } catch {
    /* неизвестный вариант: остаётся заданный в content.ts */
  }
})();

/* ---------- Подгонка кегля: слова занимают ширину экрана точно ---------- */
function fitAll() {
  const title = $('.hero__title')!;
  const avail = title.clientWidth;
  const F = parseFloat(getComputedStyle(title).fontSize);
  if (isMobile()) {
    const inner = (el: HTMLElement) => [...el.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0);
    title.style.fontSize = (F * avail * 0.995) / Math.max(inner(wordA), inner(wordB)) + 'px';
  } else {
    title.style.fontSize = (F * (avail - avail * 0.012)) / (wordA.offsetWidth + wordB.offsetWidth) + 'px';
  }
  const zero = $('.end__zero')!;
  const zs = zero.children as HTMLCollectionOf<HTMLElement>;
  const zw = zero.clientWidth;
  const zF = parseFloat(getComputedStyle(zero).fontSize);
  zero.style.fontSize = (zF * (zw - zw * 0.03)) / (zs[0].offsetWidth + zs[1].offsetWidth) + 'px';
  const logo = $('.foot__logo')!;
  const host = logo.parentElement!;
  const lW = host.clientWidth - parseFloat(getComputedStyle(host).paddingLeft) * 2;
  const lF = parseFloat(getComputedStyle(logo).fontSize);
  logo.style.fontSize = (lF * lW) / logo.offsetWidth + 'px';
}
let fitT = 0;
addEventListener('resize', () => {
  clearTimeout(fitT);
  fitT = window.setTimeout(() => {
    ['.hero__title', '.end__zero', '.foot__logo'].forEach((s) => ($(s)!.style.fontSize = ''));
    fitAll();
    ScrollTrigger.refresh();
  }, 160);
});

/* ---------- Шапка: после героя плашки, при прокрутке вниз ссылки прячутся ---------- */
const nav = $('.nav')!;
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (t) => {
    const y = t.scroll();
    nav.classList.toggle('is-past', y > innerHeight * 0.9);
    nav.classList.toggle('is-min', y > innerHeight * 0.9 && t.direction === 1);
  },
});

/* ---------- Цвет интерфейса по секциям ---------- */
$$('[data-ui]').forEach((s) => {
  const ui = s.dataset.ui!;
  ScrollTrigger.create({ trigger: s, start: 'top 40px', end: 'bottom 40px', onToggle: (t) => t.isActive && (root.dataset.uiTop = ui) });
  ScrollTrigger.create({ trigger: s, start: 'top bottom-=30', end: 'bottom bottom-=30', onToggle: (t) => t.isActive && (root.dataset.uiBot = ui) });
});

/* ---------- Показания: сложность падает до нуля к финалу ---------- */
const cx = $('[data-cx]')!;
const rulerOn = $('[data-ruler]')!;
ScrollTrigger.create({
  start: 0,
  endTrigger: '#contact',
  end: 'top 45%',
  onUpdate: (t) => {
    cx.textContent = String(Math.max(0, 100 - Math.round(t.progress * 100)));
    rulerOn.style.clipPath = `inset(0 ${(100 - t.progress * 100).toFixed(2)}% 0 0)`;
  },
});

/* ---------- Герой ---------- */
function splitLetters(el: HTMLElement) {
  const txt = el.textContent ?? '';
  el.innerHTML = [...txt].map((c) => `<i>${c}</i>`).join('');
  return $$('i', el);
}
const lettersA = splitLetters(wordA);
const lettersB = splitLetters(wordB);
/* У «Ц», «Щ», «Д» хвост ниже строки: слово растёт от низа хвоста, чтобы не наезжать на док */
if (/[ЦЩД]/i.test(wordB.textContent ?? '')) wordB.style.transformOrigin = '100% 116%';

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
  const scaleB = () => $('.hero__title')!.clientWidth / wordB.offsetWidth;
  tl.to('[data-hero-lead]', { opacity: 0, y: -24, duration: 0.16 }, 0);
  tl.to(['[data-hero-in]', '[data-hero-out]'], { opacity: 0, duration: 0.12 }, 0);
  /* камера: от клубка к ровным линиям */
  tl.to('[data-hero-media]', { scale: m ? 1.9 : 1.85, xPercent: m ? -20 : -30, duration: 1, ease: 'power1.inOut' }, 0);
  /* «сложное» гаснет, второе слово занимает весь экран */
  tl.to(lettersA, { yPercent: -36, opacity: 0, duration: 0.18, stagger: { each: 0.012 }, ease: 'power2.in' }, 0.02);
  if (m) tl.to(wordB, { y: () => -(innerHeight * 0.26), duration: 0.7, ease: 'power2.inOut' }, 0.16);
  else tl.to(wordB, { scale: scaleB, force3D: false, duration: 0.7, ease: 'power2.inOut' }, 0.16);
  tl.to('[data-hero-after]', { opacity: 1, duration: 0.12 }, 0.72);
  tl.to({}, { duration: 0.1 }, 0.9);
}

/* Цвета импульсов из палитры. Для «Сигнала» совпадают с A: 255,94,26 → 255,126,60 → 255,214,170 */
type RGB = [number, number, number];
const hexRgb = (h: string): RGB => {
  let m = h.trim().replace('#', '');
  if (m.length === 3) m = [...m].map((c) => c + c).join('');
  const n = parseInt(m, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
function pulseColors() {
  const cs = getComputedStyle(root);
  const sig = hexRgb(cs.getPropertyValue('--signal'));
  const light = hexRgb(cs.getPropertyValue('--metal-light'));
  const hi = hexRgb(cs.getPropertyValue('--metal-hi'));
  return { c0: sig.join(','), c1: mixRgb(sig, light, 0.38).join(','), c2: mixRgb(light, hi, 0.5).join(',') };
}

/* Вариант Б первого экрана: к правому краю пучок делится на две пряди, которые обвивают друг друга.
   Формула та же, что у скрипта, который перекрашивал кадр: центр и полувысота пучка сняты с hero.webp */
const TW = { yc: 537 / 1125, hh: 140 / 1125, x0: 0.62, turns: 1.1 };
const smooth01 = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function twistAt(l: number, x: number) {
  if (x <= TW.x0) return { y: l, depth: 1 };
  const q = (x - TW.x0) / (1 - TW.x0);
  const th = 2 * Math.PI * TW.turns * q ** 1.5;
  const sgn = l < TW.yc ? -1 : 1;
  const r = (TW.hh / 2) * (1 + 0.38 * smooth01(0, 0.35, q));
  const z = -sgn * Math.sin(th);
  const half = (TW.hh / 2) * (0.72 + 0.28 * Math.abs(Math.cos(th))) * (1 + 0.1 * z);
  const u = (l - (TW.yc + (sgn * TW.hh) / 2)) / (TW.hh / 2);
  return { y: TW.yc + sgn * r * Math.cos(th) + u * half, depth: 0.38 + 0.62 * ((z + 1) / 2) };
}

/* Импульсы бегут по волокнам: координаты линий сняты с исходного кадра */
function heroPulses() {
  const c = $<HTMLCanvasElement>('[data-hero-pulse]');
  const ctx = c?.getContext('2d');
  if (reduced || !c || !ctx) return;
  const LINES = [0.3565, 0.3704, 0.3831, 0.3958, 0.4086, 0.4213, 0.434, 0.4479, 0.4606, 0.4734, 0.4861, 0.4988, 0.5127, 0.5255, 0.5394, 0.5521, 0.5648, 0.5775, 0.5891, 0.5984];
  const X0 = 0.56;
  let W = 0;
  let H = 0;
  let running = false;
  let col = pulseColors();
  onPalette(() => (col = pulseColors()));
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const size = () => {
    const r = c.parentElement!;
    W = r.offsetWidth;
    H = r.offsetHeight;
    c.width = W * dpr;
    c.height = H * dpr;
  };
  size();
  addEventListener('resize', size);
  const N = isMobile() ? 9 : 16;
  const pick = () => LINES[(Math.random() * LINES.length) | 0];
  const pulses = Array.from({ length: N }, () => ({ l: pick(), x: X0 + Math.random() * 0.45, v: 0.0009 + Math.random() * 0.0016, len: 0.02 + Math.random() * 0.05, a: 0.5 + Math.random() * 0.5 }));
  const tick = () => {
    if (!running) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    pulses.forEach((p) => {
      p.x += p.v;
      if (p.x - p.len > 1) {
        p.x = X0;
        p.l = pick();
        p.v = 0.0009 + Math.random() * 0.0016;
      }
      const x2 = p.x * W;
      const x1 = (p.x - p.len) * W;
      /* в варианте Б импульс идёт по своей пряди и тускнеет, когда прядь уходит назад */
      const twisted = root.getAttribute('data-hero-art') === 'b' && !root.hasAttribute('data-art-orig');
      const a = twisted ? p.a * twistAt(p.l, p.x).depth : p.a;
      const g = ctx.createLinearGradient(x1, 0, x2, 0);
      g.addColorStop(0, `rgba(${col.c0},0)`);
      g.addColorStop(0.75, `rgba(${col.c1},${0.55 * a})`);
      g.addColorStop(1, `rgba(${col.c2},${a})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (twisted) {
        for (let k = 0; k <= 12; k++) {
          const xf = p.x - p.len + (p.len * k) / 12;
          const y = twistAt(p.l, xf).y * H;
          if (k) ctx.lineTo(xf * W, y);
          else ctx.moveTo(xf * W, y);
        }
      } else {
        ctx.moveTo(x1, p.l * H);
        ctx.lineTo(x2, p.l * H);
      }
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
    const parts = el.innerHTML.split(/(\s+|&nbsp;)/);
    el.innerHTML = parts.map((p) => (/^(\s+|&nbsp;)$/.test(p) || !p ? p : `<span class="hl">${p}</span>`)).join('');
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
    const words = splitWords(el);
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

/* ---------- Карточки: задачи по плюсу, щелчок по карточке открывает панель решения ---------- */
$$('[data-card-toggle]').forEach((b) => {
  b.addEventListener('click', () => {
    const on = b.closest('[data-card]')!.classList.toggle('is-open');
    b.setAttribute('aria-label', on ? 'Скрыть задачи' : 'Показать задачи');
    b.setAttribute('aria-expanded', String(on));
  });
});
$$('[data-card]').forEach((c) =>
  c.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('button, a, .card__tasks') || getSelection()?.toString()) return;
    $<HTMLButtonElement>('[data-open-dialog]', c)?.click();
  }),
);

/* ---------- Панели решений: нативный <dialog> ---------- */
function initDrawers() {
  const dialogs = $$<HTMLDialogElement>('dialog.drawer');
  let opener: HTMLElement | null = null;
  let leaving = false;
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const btn = t.closest<HTMLElement>('[data-open-dialog]');
    if (btn) {
      const dlg = document.getElementById(btn.dataset.openDialog!) as HTMLDialogElement | null;
      if (dlg && typeof dlg.showModal === 'function') {
        opener = btn;
        dlg.showModal();
        dlg.scrollTop = 0;
        lock(true);
      }
      return;
    }
    if (t.closest('[data-close-dialog]')) {
      t.closest('dialog')?.close();
      return;
    }
    /* щелчок по подложке */
    if (t instanceof HTMLDialogElement && t.open) {
      const r = t.getBoundingClientRect();
      const ev = e as MouseEvent;
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) t.close();
    }
  });
  dialogs.forEach((d) =>
    d.addEventListener('close', () => {
      lock(false);
      if (opener && !leaving) opener.focus({ preventScroll: true });
      opener = null;
      leaving = false;
    }),
  );
  document.addEventListener('ax:close-overlays', () =>
    dialogs.forEach((d) => {
      if (!d.open) return;
      leaving = true;
      d.close();
    }),
  );
}

/* ---------- Диалоги ---------- */
type Dialog = { title: string; tone: string; result: string; msgs: ['ai' | 'me', string][] };
function initDialogs() {
  const chat = $('[data-chat]')!;
  const wave = $('[data-wave]')!;
  const tTitle = $('[data-panel-title]')!;
  const tTone = $('[data-panel-tone]')!;
  const tRes = $('[data-panel-result]')!;
  const steps = $$('[data-how-steps] li');
  const DIALOGS = JSON.parse($('[data-dialogs]')?.textContent || '[]') as Dialog[];
  const count = Math.floor(wave.clientWidth / 5) + 8;
  wave.innerHTML = Array.from({ length: count }, () => '<i></i>').join('');
  const bars = $$('i', wave);
  let talking = false;
  let visible = false;
  setInterval(() => {
    if (!visible) return;
    bars.forEach((b, i) => {
      const h = talking ? 4 + Math.abs(Math.sin(i * 0.5 + performance.now() / 180)) * (10 + Math.random() * 26) : 3 + Math.abs(Math.sin(i * 0.25 + performance.now() / 900)) * 4;
      b.style.setProperty('--h', h.toFixed(0) + 'px');
    });
  }, 130);
  let current = -1;
  let tl: gsap.core.Timeline | null = null;
  /* автопроигрывание: после итога пауза HOLD секунд и следующий сценарий; черта над сценарием показывает время */
  const HOLD = 3.4;
  let next: gsap.core.Tween | null = null;
  const list = $('[data-how-steps]')!;
  const queue = () => {
    next?.kill();
    next = gsap.delayedCall(HOLD, () => play((current + 1) % DIALOGS.length));
    if (!visible) next.pause();
  };
  const addMsg = (who: 'ai' | 'me', text: string) => {
    const m = document.createElement('div');
    m.className = 'msg msg--' + who;
    const small = document.createElement('small');
    small.textContent = who === 'ai' ? 'АИТЕХ · агент' : 'Клиент';
    m.append(small, text);
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
  const play = (i: number) => {
    if (i === current || !DIALOGS[i]) return;
    current = i;
    next?.kill();
    next = null;
    steps.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      s.classList.remove('is-run');
    });
    const d = DIALOGS[i];
    tTitle.textContent = d.title;
    tTone.textContent = d.tone;
    tRes.textContent = '…';
    tl?.kill();
    chat.innerHTML = '';
    talking = false;
    wave.classList.remove('is-talk');
    if (reduced) {
      d.msgs.forEach(([w, t]) => addMsg(w, t).classList.add('is-in'));
      tRes.textContent = d.result;
      return;
    }
    const line = gsap.timeline();
    tl = line;
    let typing: HTMLElement | null = null;
    d.msgs.forEach(([who, text], k) => {
      if (who === 'ai') {
        line.call(() => {
          typing = addTyping();
          talking = true;
          wave.classList.add('is-talk');
        }, undefined, k === 0 ? 0.25 : '+=0.5');
        line.call(() => {
          typing?.remove();
          addMsg('ai', text);
          talking = false;
          wave.classList.remove('is-talk');
        }, undefined, `+=${Math.min(1.1, 0.5 + text.length / 200)}`);
      } else {
        line.call(() => addMsg('me', text), undefined, k === 0 ? 0.25 : '+=0.85');
      }
    });
    line.call(() => (tRes.textContent = d.result), undefined, '+=0.35');
    line.call(queue, undefined, '+=0.01');
    const li = steps[i];
    li.style.setProperty('--dur', (line.duration() + HOLD).toFixed(2) + 's');
    void li.offsetWidth;
    li.classList.add('is-run');
    if (!visible) line.pause();
  };
  ScrollTrigger.create({
    trigger: '[data-how]',
    start: 'top 70%',
    end: 'bottom 30%',
    onToggle: (t) => {
      visible = t.isActive;
      list.classList.toggle('is-paused', !visible);
      if (!visible) {
        tl?.pause();
        next?.pause();
        return;
      }
      if (current < 0) return play(0);
      tl?.resume();
      next?.resume();
    },
  });
  $$('[data-how-step]').forEach((b) =>
    b.addEventListener('click', () => {
      current = -1;
      play(Number(b.dataset.howStep));
    }),
  );
}

/* ---------- Анатомия: слои расходятся по скроллу ---------- */
function initExploded() {
  const planes = $$('[data-plane]');
  const labels = $$('[data-ex-label]');
  const stage = $('[data-ex-stage]')!;
  const paths = $$<SVGPathElement>('path', $('[data-ex-lines]')!);
  const anchors = $$('[data-anchor]');
  const mobile = isMobile();
  const zUnit = () => Math.min(innerWidth * 0.16, innerHeight * 0.28);
  if (mobile || reduced) {
    const u = mobile ? 54 : zUnit() * 0.9;
    planes.forEach((p, i) => gsap.set(p, { z: [u, 0, -u][i] }));
    return;
  }
  gsap.set(planes, { z: (i: number) => [10, 0, -10][i] });
  const lay = () => {
    const s = stage.getBoundingClientRect();
    anchors.forEach((a, i) => {
      const r = a.getBoundingClientRect();
      const l = labels[i];
      const lr = l.getBoundingClientRect();
      const op = getComputedStyle(l).opacity;
      const x1 = r.left - s.left;
      const y1 = r.top - s.top;
      const x2 = lr.left - s.left - 10;
      const y2 = lr.top - s.top + 13;
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
  const sec = $('[data-ind]')!;
  const track = $('[data-ind-track]')!;
  const bar = $('[data-ind-bar]')!;
  const idx = $('[data-ind-i]')!;
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
        let best = 0;
        let bd = 1e9;
        panels.forEach((p, i) => {
          const r = p.getBoundingClientRect();
          const d = Math.abs(r.left + r.width / 2 - vc);
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

/* ---------- Линии: один приём на всю страницу. Импульсы бегут только в видимом блоке ---------- */
const fx = (v: number) => v.toFixed(1);
type Pulse = { i: number; c: 'sig' | 'ice'; t: number; d: number };
function drawLn(svg: SVGSVGElement, W: number, H: number, paths: string[], pulses: Pulse[]) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML =
    paths.map((d) => `<path class="ln__l" pathLength="1" d="${d}"/>`).join('') +
    pulses.map((p) => `<path class="ln__p ln__p--${p.c}" pathLength="100" d="${paths[p.i]}" style="animation-duration:${p.t}s;animation-delay:${p.d}s"/>`).join('');
}
const PULSES = (n: number, k: number): Pulse[] => Array.from({ length: k }, (_, j) => ({ i: Math.round(((j + 0.5) * n) / k) % n, c: j % 3 === 1 ? 'ice' : 'sig', t: 6 + (j % 3) * 2.2, d: -j * 1.7 }));
const LN: Record<string, (svg: SVGSVGElement, W: number, H: number) => void> = {
  /* Полоса прямых линий: продолжение пучка из первого экрана */
  band(svg, W, H) {
    const n = isMobile() ? 7 : 12;
    const paths = Array.from({ length: n }, (_, i) => `M0 ${fx(1 + (i * (H - 2)) / (n - 1))}H${W}`);
    drawLn(svg, W, H, paths, PULSES(n, 4));
  },
  /* Ассистент: сложное входит слева в механизм за ухом, результат проходит сквозь голову
     и выходит перед лицом по направлению взгляда. Бюст лежит поверх svg и скрывает линии внутри головы */
  asst(svg, W, H) {
    const stage = svg.parentElement!;
    const box = stage.getBoundingClientRect();
    const b = $('[data-asst-bust]')!.getBoundingClientRect();
    const px = (x: number) => b.left - box.left + b.width * x;
    const py = (y: number) => b.top - box.top + b.height * y;
    const ys = (sel: string) => $$(sel, stage).map((l) => (parseFloat(l.style.getPropertyValue('--y')) / 100) * H);
    const inn = ys('.asst__tags--in li');
    const out = ys('.asst__tags--out li');
    const x0 = W * 0.27;
    /* у мраморного бюста A выход остаётся из плеча, у стеклянной девушки — от лица между бровью и губами */
    const orig = root.hasAttribute('data-art-orig');
    const [hx, hy] = orig ? [px(0.56), py(0.32)] : [px(0.4), py(0.29)];
    const outPath = (y: number, k: number) => {
      if (orig) {
        const [sx, sy] = [px(0.6), py(0.76)];
        return `M${fx(sx)} ${fx(sy)}C${fx(sx + W * 0.08)} ${fx(sy)} ${fx(sx + W * 0.05)} ${fx(y)} ${fx(sx + W * 0.16)} ${fx(y)}H${W}`;
      }
      const sy = py(0.295 + k * 0.035);
      const ex = px(0.74);
      return `M${fx(px(0.5))} ${fx(sy)}H${fx(ex)}C${fx(ex + W * 0.07)} ${fx(sy)} ${fx(ex + W * 0.05)} ${fx(y)} ${fx(ex + W * 0.13)} ${fx(y)}H${W}`;
    };
    const paths = [
      ...inn.map((y) => `M0 ${fx(y)}H${fx(x0)}C${fx(x0 + (hx - x0) * 0.55)} ${fx(y)} ${fx(x0 + (hx - x0) * 0.5)} ${fx(hy)} ${fx(hx)} ${fx(hy)}`),
      ...out.map(outPath),
    ];
    const k = inn.length;
    drawLn(svg, W, H, paths, [
      { i: 0, c: 'sig', t: 5.6, d: 0 }, { i: 2, c: 'sig', t: 7, d: -2 }, { i: 4, c: 'sig', t: 6.2, d: -4 },
      { i: k, c: 'ice', t: 6, d: -1 }, { i: k + 1, c: 'ice', t: 4.8, d: -3 }, { i: k + 2, c: 'ice', t: 6.6, d: -5 },
    ]);
    /* стекло полупрозрачное: выход проявляется только от края лица, внутри головы линий не видно */
    if (!orig) {
      svg.insertAdjacentHTML(
        'afterbegin',
        `<defs><linearGradient id="asst-fg" gradientUnits="userSpaceOnUse" x1="${fx(px(0.64))}" y1="0" x2="${fx(px(0.71))}" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
          `<mask id="asst-fm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#asst-fg)"/></mask></defs>`,
      );
      const outD = new Set(paths.slice(k));
      $$('path', svg).forEach((p) => outD.has(p.getAttribute('d')!) && p.setAttribute('mask', 'url(#asst-fm)'));
    }
    asstHot();
  },
  /* Рельс через всю ленту отраслей */
  rail(svg, W, H) {
    const n = 9;
    const g = 11;
    const y0 = H / 2 - ((n - 1) * g) / 2;
    const paths = Array.from({ length: n }, (_, i) => `M0 ${fx(y0 + i * g)}H${W}`);
    drawLn(svg, W, H, paths, PULSES(n, 7).map((p) => ({ ...p, t: p.t * 3 })));
  },
  /* Финал: все линии сходятся в одну */
  merge(svg, W, H) {
    const n = isMobile() ? 8 : 14;
    const cy = H * 0.72;
    const mx = W * 0.66;
    const paths = Array.from({ length: n }, (_, i) => {
      const y = 2 + (i * (H - 4)) / (n - 1);
      return `M0 ${fx(y)}H${fx(W * 0.3)}C${fx(W * 0.48)} ${fx(y)} ${fx(W * 0.5)} ${fx(cy)} ${fx(mx)} ${fx(cy)}H${W}`;
    });
    drawLn(svg, W, H, paths, PULSES(n, 5));
  },
};
function initLines() {
  const items = $$<SVGSVGElement>('[data-ln]').filter((svg) => !(svg.dataset.ln === 'rail' && isMobile()));
  const build = () =>
    items.forEach((svg) => {
      /* рельс длиной с ленту: ширина задаётся явно, иначе Safari берёт её из viewBox */
      if (svg.dataset.ln === 'rail') svg.style.width = svg.parentElement!.offsetWidth + 'px';
      const r = svg.getBoundingClientRect();
      const draw = LN[svg.dataset.ln!];
      if (draw && r.width && r.height) draw(svg, Math.round(r.width), Math.round(r.height));
    });
  build();
  let t = 0;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(build, 200);
  });
  addEventListener('load', build);
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        e.target.classList.toggle('is-run', e.isIntersecting);
        if (e.isIntersecting) e.target.classList.add('is-in');
      }),
    { rootMargin: '5% 0px' },
  );
  items.forEach((s) => io.observe(s));
}

/* Разметка «слово в маске» для смены текста; неразрывные пробелы остаются внутри слова */
const wordsHtml = (s: string) =>
  s
    .split(' ')
    .map((w) => `<span class="w"><span class="wi">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`)
    .join(' ');

/* ---------- Что меняется: каждая строка проигрывает переход «было → стало» ---------- */
function initChanges() {
  if (reduced) return;
  $$('[data-chg]').forEach((row) => {
    const s = $('.chg__s', row)!;
    const v = $('.chg__v', row)!;
    v.innerHTML = wordsHtml(v.textContent ?? '');
    const tl = gsap
      .timeline({ paused: true })
      .fromTo(row, { '--k': 0 }, { '--k': 1, duration: 1.3, ease: 'power3.inOut' }, 0)
      .from([$('.chg__area', row), $('.chg__before', row)], { opacity: 0, y: 14, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 0.15)
      .fromTo(s, { backgroundSize: '0% 1px' }, { backgroundSize: '100% 1px', duration: 0.9, ease: 'power2.inOut' }, 0.75)
      .call(() => s.classList.add('is-off'), undefined, 1.1)
      .from($('.chg__arr', row), { scaleX: 0, duration: 0.7, ease: 'expo.out' }, 1.35)
      .from($$('.wi', v), { yPercent: 105, opacity: 0, duration: 0.95, stagger: 0.03, ease: 'expo.out' }, 1.45);
    s.classList.remove('is-off');
    ScrollTrigger.create({ trigger: row, start: 'top 84%', once: true, onEnter: () => tl.play() });
  });
}

/* ---------- Кто это: роль перенастраивает сцену ----------
   Подсвечиваются входы и результат роли, по ним пробегает импульс, текст обязанностей
   меняется по словам, индикатор перетекает к вкладке. Пока посетитель не выбрал роль сам,
   роли сменяются раз в 7 секунд, а следующая вкладка заполняется тонкой линией */
const asstSec = $('[data-asst]');
function asstHot() {
  if (!asstSec) return;
  const tab = $(`[data-asst-tab="${asstSec.dataset.role}"]`, asstSec);
  if (!tab) return;
  const ins = (tab.dataset.ins ?? '').split(',').map(Number);
  const out = Number(tab.dataset.out);
  const n = $$('.asst__tags--in li', asstSec).map((li, i) => li.classList.toggle('is-hot', ins.includes(i))).length;
  $$('.asst__tags--out li', asstSec).forEach((li, i) => li.classList.toggle('is-hot', i === out));
  const hot = new Set<string>();
  $$('.ln__l', asstSec).forEach((p, i) => {
    const on = i < n ? ins.includes(i) : i - n === out;
    p.classList.toggle('is-hot', on);
    if (on) hot.add(p.getAttribute('d')!);
  });
  $$('.ln__p', asstSec).forEach((p) => p.classList.toggle('is-hot', hot.has(p.getAttribute('d')!)));
}
function asstBurst() {
  const svg = $('[data-ln="asst"]', asstSec!);
  if (!svg || !svg.classList.contains('is-run')) return;
  const n = $$('.asst__tags--in li', asstSec!).length;
  let k = 0;
  $$('.ln__l', svg).forEach((l, i) => {
    if (!l.classList.contains('is-hot')) return;
    const b = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    b.setAttribute('class', `ln__b ln__b--${i < n ? 'sig' : 'ice'}`);
    b.setAttribute('pathLength', '100');
    b.setAttribute('d', l.getAttribute('d')!);
    if (l.hasAttribute('mask')) b.setAttribute('mask', l.getAttribute('mask')!);
    b.style.animationDelay = `${i < n ? k++ * 0.09 : 0.7}s`;
    b.addEventListener('animationend', () => b.remove());
    svg.appendChild(b);
  });
}
function initAssistant() {
  const sec = asstSec;
  if (!sec) return;
  const duty = $('[data-asst-duty]', sec)!;
  const ind = $('[data-asst-ind]', sec)!;
  const tabs = $$<HTMLButtonElement>('[data-asst-tab]', sec);
  const HOLD = 7;
  let cur = 0;

  /* индикатор: ведущий край уходит первым, второй догоняет — полоска перетекает */
  const edge = { l: 0, r: 0 };
  const paint = () => (ind.style.transform = `translateX(${edge.l.toFixed(1)}px) scaleX(${Math.max(edge.r - edge.l, 0).toFixed(1)})`);
  const place = (i: number, move: boolean) => {
    const t = tabs[i];
    const l = t.offsetLeft;
    const r = l + t.offsetWidth;
    gsap.killTweensOf(edge);
    if (!move || reduced) {
      Object.assign(edge, { l, r });
      return paint();
    }
    const fwd = l > edge.l;
    gsap.to(edge, { r, duration: 0.75, delay: fwd ? 0 : 0.14, ease: 'expo.out', onUpdate: paint });
    gsap.to(edge, { l, duration: 0.75, delay: fwd ? 0.14 : 0, ease: 'expo.out', onUpdate: paint });
  };

  /* текст обязанностей меняется по словам */
  const words = wordsHtml;
  duty.innerHTML = words(duty.textContent ?? '');
  let outTw: gsap.core.Tween | undefined;
  let inTw: gsap.core.Tween | undefined;
  const swap = (text: string) => {
    outTw?.kill();
    inTw?.kill();
    if (reduced) return void (duty.innerHTML = words(text));
    outTw = gsap.to($$('.wi', duty), {
      yPercent: -105,
      opacity: 0,
      duration: 0.3,
      stagger: 0.008,
      ease: 'power2.in',
      onComplete: () => {
        duty.innerHTML = words(text);
        inTw = gsap.fromTo($$('.wi', duty), { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.018, ease: 'expo.out' });
      },
    });
  };

  let auto = !reduced;
  let visible = false;
  const timer = gsap.delayedCall(HOLD, () => select((cur + 1) % tabs.length)).pause();
  sec.style.setProperty('--hold', `${HOLD}s`);
  sec.classList.toggle('is-auto', auto);
  const mark = () => tabs.forEach((t, k) => t.classList.toggle('is-next', auto && k === (cur + 1) % tabs.length));
  const stopAuto = () => {
    auto = false;
    timer.kill();
    sec.classList.remove('is-auto');
    mark();
  };

  function select(i: number, focus = false) {
    if (i === cur) {
      if (focus) tabs[i].focus();
      return;
    }
    cur = i;
    const b = tabs[i];
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    duty.setAttribute('aria-labelledby', b.id);
    sec!.dataset.role = String(i);
    swap(b.dataset.duty ?? '');
    place(i, true);
    asstHot();
    if (!reduced) asstBurst();
    mark();
    if (auto) {
      timer.restart(true);
      if (!visible) timer.pause();
    }
    if (focus) b.focus();
  }

  tabs.forEach((b, i) => {
    b.addEventListener('click', () => {
      stopAuto();
      select(i);
    });
    b.addEventListener('keydown', (e) => {
      const go = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (go === undefined) return;
      e.preventDefault();
      stopAuto();
      select((go + tabs.length) % tabs.length, true);
    });
  });
  /* наведение на колонку с текстом ставит смену на паузу, чтобы можно было дочитать */
  const col = $('.asst__r', sec)!;
  col.addEventListener('mouseenter', () => {
    sec.classList.add('is-hold');
    timer.pause();
  });
  col.addEventListener('mouseleave', () => {
    sec.classList.remove('is-hold');
    if (auto && visible) timer.resume();
  });
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: (t) => {
      visible = t.isActive;
      sec.classList.toggle('is-vis', visible);
      if (auto && !sec.classList.contains('is-hold')) visible ? timer.resume() : timer.pause();
    },
  });
  mark();
  place(cur, false);
  afterFonts(() => place(cur, false));
  addEventListener('resize', () => place(cur, false));
}

/* ---------- Запуск ---------- */
initHighlight();
initDialogs();
initDrawers();
heroPulses();
initAssistant();
afterFonts(() => {
  fitAll();
  initReveals();
  initChanges();
  initExploded();
  initIndustries();
  initLines();
  heroIntro();
  ScrollTrigger.refresh();
});
