/* Движение первых экранов палитр раунда 5 (композиции в styles/hero-looks.css, тексты в HERO_LOOKS).
   Каркас как у A: короткое появление, затем прокрутка ведёт камеру от хаоса к порядку и меняет слова.
   Всё, что создаёт композиция, живёт в gsap.context: при смене палитры контекст откатывается
   и стили возвращаются к исходным. Курсор нигде не участвует. */
import { gsap, ScrollTrigger, $, $$, reduced, isMobile } from './ax';
import { createGlass } from './mint-glass';

export type HeroMode = { kill(): void };
type TL = gsap.core.Timeline;
type Spec = {
  intro(tl: TL, media: HTMLElement): void;
  scrub(tl: TL, media: HTMLElement): void;
  /* постоянная жизнь композиции (часы, лента); возвращает остановку */
  live?(): () => void;
};

const SCRUB = () => ({ trigger: $('.hero')!, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true });
const stageH = () => $('.hero__stage')!.clientHeight;
const CLIP = 'inset(-8% -2% -12% -2%)';

/* Слово по буквам, пробел остаётся пробелом */
function letters(el: HTMLElement) {
  if (!el.hasAttribute('data-split')) {
    el.setAttribute('data-split', '');
    el.innerHTML = [...(el.textContent ?? '')].map((c) => (c === ' ' ? '<i>&nbsp;</i>' : `<i>${c}</i>`)).join('');
  }
  return $$('i', el);
}
/* Сдвиг по вертикали, который ставит центр элемента в долю высоты сцены.
   Считается по offsetTop: трансформации прокрутки на него не влияют */
const topIn = (el: HTMLElement) => {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && !n.classList.contains('hero__stage')) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
};
const toY = (el: HTMLElement, frac: number) => () => stageH() * frac - (topIn(el) + el.offsetHeight / 2);

function run(animate: boolean, spec: Spec): HeroMode {
  const media = $('[data-hero-media]')!;
  let stop: (() => void) | null = null;
  /* контекст создаётся пустым и наполняется после: без анимации появления прокрутка заводится сразу и уже видит ctx */
  const ctx = gsap.context(() => {});
  ctx.add(() => {
    if (reduced) return;
    const begin = () =>
      ctx.add(() => {
        const tl = gsap.timeline({ scrollTrigger: SCRUB(), defaults: { ease: 'none' } });
        spec.scrub(tl, media);
        tl.to({}, { duration: 0.1 }, 0.9);
      });
    if (animate) {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      spec.intro(tl, media);
      tl.add(() => {
        begin();
        ScrollTrigger.refresh();
      });
    } else begin();
  });
  stop = spec.live?.() ?? null;
  return {
    kill() {
      stop?.();
      ctx.revert();
    },
  };
}

/* ---------- Ультрамарин · Свет ---------- */
function ultra(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const bIn = $('.ul-b__in', b)!;
  const la = letters(a);
  const fades = $$('[data-hx-fade]', el);
  const after = $('[data-hx-after]', el)!;
  const glint = $('[data-ul-glint]');
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      /* лента проявляется из темноты, встают слова, потом по кромке побежит блик */
      tl.fromTo(m, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2.6, ease: 'power3.out' }, 0);
      if (glint) tl.fromTo(glint, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power1.out' }, 1.4);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.03 }, 0.55);
      tl.from(bIn, { yPercent: 108, duration: 1.3 }, 0.78);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.15);
      tl.set([a, b], { clipPath: 'none' }, 2.1);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, y: 16, duration: 0.16 }, 0);
      /* камера подходит к ленте */
      tl.to(m, { scale: mob ? 1.4 : 1.5, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(la, { yPercent: -40, opacity: 0, duration: 0.2, stagger: { each: 0.01 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: () => -a.offsetHeight / 2, scale: mob ? 1.06 : 1.12, duration: 0.6, ease: 'power2.inOut' }, 0.16);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
  });
}

/* ---------- Сталь · Прибор ---------- */
function steel(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const la = letters(a);
  const lb = letters(b);
  const fades = $$('[data-hx-fade]', el);
  const gauge = $('[data-st-gauge]', el)!;
  const pane = $('[data-hx-pane]', el);
  const after = $('[data-hx-after]', el)!;
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      tl.fromTo(m, { scale: 1.14 }, { scale: 1, duration: 2.2 }, 0);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.035 }, 0.5);
      tl.from(lb, { yPercent: 108, duration: 1.2, stagger: 0.03 }, 0.66);
      tl.from(gauge, { opacity: 0, y: 24, duration: 1.2 }, 0.9);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.05);
      tl.set([a, b], { clipPath: 'none' }, 2);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, duration: 0.14 }, 0);
      /* камера та же, что у A: от смятого листа к ровным складкам */
      tl.to(m, { scale: mob ? 1.9 : 1.85, xPercent: mob ? -20 : -30, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(gauge, { opacity: 0, y: -20, duration: 0.2, ease: 'power2.in' }, 0.3);
      /* стеклянная колонна садится вниз и остаётся под итоговой фразой */
      if (pane && !mob) tl.fromTo(pane, { clipPath: 'inset(0% 0% 0% 0% round 22px)' }, { clipPath: 'inset(66% 0% 0% 0% round 22px)', duration: 0.4, ease: 'power2.inOut' }, 0.34);
      tl.to(el, { '--veil': 1, duration: 0.4 }, 0.2);
      tl.to(la, { yPercent: -36, opacity: 0, duration: 0.18, stagger: { each: 0.012 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: toY(b, mob ? 0.42 : 0.46), scale: mob ? 1 : 1.2, duration: 0.6, ease: 'power2.inOut' }, 0.16);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
    live() {
      /* время смены по Москве: деления до текущего часа светятся */
      const clock = $('[data-st-clock]', el);
      const time = $('[data-st-time]', el);
      const ticks = $$('[data-st-scale] i', el);
      if (!clock || !time) return () => {};
      let fmt: Intl.DateTimeFormat;
      try {
        fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      } catch {
        return () => {};
      }
      const paint = () => {
        const s = fmt.format(new Date());
        const h = parseInt(s, 10);
        time.textContent = s;
        ticks.forEach((t, i) => {
          t.classList.toggle('is-past', i < h);
          t.classList.toggle('is-now', i === h);
        });
      };
      paint();
      clock.hidden = false;
      const id = window.setInterval(paint, 15000);
      return () => {
        clearInterval(id);
        clock.hidden = true;
        ticks.forEach((t) => t.classList.remove('is-past', 'is-now'));
      };
    },
  });
}

/* ---------- Мята · Рифлёное стекло ---------- */
function mint(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const la = letters(a);
  const lb = letters(b);
  const fades = $$('[data-hx-fade]', el);
  const edge = $('[data-mi-edge]', el)!;
  const after = $('[data-hx-after]', el)!;
  const cv = $<HTMLCanvasElement>('[data-mi-glass]', el)!;
  const g = createGlass(cv, (x) => el.style.setProperty('--ex', `${x.toFixed(1)}px`));
  /* кромка стекла в покое: слева заголовок на тусклых нитях, справа ровные полосы света */
  const E0 = () => (isMobile() ? 0.74 : 0.6);
  const st = g?.state ?? { edge: E0(), zoom: 1 };
  st.edge = E0();
  return run(animate, {
    intro(tl) {
      gsap.set([a, b], { clipPath: CLIP });
      /* стекло въезжает справа и встаёт за заголовком */
      tl.fromTo(cv, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0);
      tl.fromTo(st, { edge: 1.02 }, { edge: E0(), duration: 2.4, ease: 'expo.inOut' }, 0.1);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.03 }, 0.9);
      tl.from(lb, { yPercent: 108, duration: 1.2, stagger: 0.024 }, 1.2);
      tl.from([...fades, edge], { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.6);
      tl.set([a, b], { clipPath: 'none' }, 2.8);
    },
    scrub(tl) {
      tl.to(fades, { opacity: 0, duration: 0.14 }, 0);
      /* стекло проходит весь кадр: всё запутанное становится полосами */
      tl.fromTo(st, { edge: E0() }, { edge: -0.01, duration: 0.56, ease: 'power2.inOut', immediateRender: false }, 0.06);
      tl.to(st, { zoom: 1.14, duration: 1 }, 0);
      /* «Запутанное» уходит вверх, пока стекло идёт по кадру */
      tl.to(la, { yPercent: -110, opacity: 0, duration: 0.24, stagger: 0.012, ease: 'power2.in' }, 0.08);
      tl.to(edge, { opacity: 0, duration: 0.1 }, 0.46);
      tl.to(b, { y: () => -a.offsetHeight, scale: isMobile() ? 1.2 : 1.32, duration: 0.5, ease: 'power2.inOut' }, 0.22);
      tl.to(el, { '--veil': 1, duration: 0.4 }, 0.3);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
    live() {
      g?.start();
      return () => {
        g?.stop();
        el.style.removeProperty('--ex');
      };
    },
  });
}

/* ---------- Градиент · поток и пиксель ----------
   Кадр сначала не в фокусе и собирается; по прокрутке камера идёт к пиксельной полосе,
   «Размытое» буквально расплывается, «становится чётким» встаёт на его место */
function grad(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const bIn = $('.gr-b__in', b)!;
  const la = letters(a);
  const fades = $$('[data-hx-fade]', el);
  const after = $('[data-hx-after]', el)!;
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      tl.fromTo(m, { opacity: 0, scale: 1.06, filter: 'blur(16px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2.4, ease: 'power3.out' }, 0);
      tl.set(m, { clearProps: 'filter' }, 2.4);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.03 }, 0.5);
      tl.from(bIn, { yPercent: 108, duration: 1.3 }, 0.72);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.1);
      tl.set([a, b], { clipPath: 'none' }, 2.1);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, y: 16, duration: 0.16 }, 0);
      tl.to(m, { scale: mob ? 1.35 : 1.5, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(la, { opacity: 0, filter: 'blur(14px)', yPercent: -18, duration: 0.24, stagger: { each: 0.014 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: () => -a.offsetHeight, scale: mob ? 1.04 : 1.1, duration: 0.6, ease: 'power2.inOut' }, 0.16);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
  });
}

/* ---------- Оранжевый перелив · ленты ----------
   Ленты проявляются, за ними поднимается имя компании и вырастают столбики света; по прокрутке камера
   подходит к ровным лентам, имя уходит вверх, столбики растут */
function iris(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const bIn = $('.ir-b__in', b)!;
  const la = letters(a);
  const fades = $$('[data-hx-fade]', el);
  const after = $('[data-hx-after]', el)!;
  const word = $('[data-ir-word]');
  const bars = $('[data-ir-bars]');
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      tl.fromTo(m, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2.6, ease: 'power3.out' }, 0);
      if (word) tl.from(word, { yPercent: 14, opacity: 0, duration: 2.2, ease: 'power3.out' }, 0.2);
      if (bars) tl.from(bars, { scaleY: 0, duration: 2, ease: 'expo.out' }, 0.45);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.025 }, 0.6);
      tl.from(bIn, { yPercent: 108, duration: 1.3 }, 0.82);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.15);
      tl.set([a, b], { clipPath: 'none' }, 2.2);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, y: 16, duration: 0.16 }, 0);
      tl.to(m, { scale: mob ? 1.3 : 1.45, duration: 1, ease: 'power1.inOut' }, 0);
      if (word) tl.to(word, { yPercent: -16, opacity: 0.3, duration: 0.8 }, 0);
      if (bars) tl.to(bars, { scaleY: 1.3, duration: 0.8 }, 0);
      tl.to(la, { yPercent: -40, opacity: 0, duration: 0.2, stagger: { each: 0.01 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: () => -a.offsetHeight, scale: mob ? 1.04 : 1.08, duration: 0.6, ease: 'power2.inOut' }, 0.16);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
  });
}

const LOOKS: Record<string, (el: HTMLElement, animate: boolean) => HeroMode> = { ultra, steel, mint, grad, iris };

export function mountLook(id: string, animate: boolean): HeroMode | null {
  const el = $(`[data-hx="${id}"]`);
  const fn = LOOKS[id];
  return el && fn ? fn(el, animate) : null;
}
