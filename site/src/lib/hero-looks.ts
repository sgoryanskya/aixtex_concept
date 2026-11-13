/* Движение первых экранов палитр раунда 5 (композиции в styles/hero-looks.css, тексты в HERO_LOOKS).
   Каркас как у A: короткое появление, затем прокрутка ведёт камеру от хаоса к порядку и меняет слова.
   Всё, что создаёт композиция, живёт в gsap.context: при смене палитры контекст откатывается
   и стили возвращаются к исходным. Курсор нигде не участвует. */
import { gsap, ScrollTrigger, $, $$, reduced, isMobile } from './ax';

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

/* ---------- Мята · Гладь воды ----------
   Вода проявляется из темноты, свет на горизонте медленно дышит (CSS). По прокрутке камера идёт к спокойной
   воде под светом, «Запутанное» растворяется, «остаётся у нас» встаёт на его место */
function mint(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const la = letters(a);
  const lb = letters(b);
  const fades = $$('[data-hx-fade]', el);
  const after = $('[data-hx-after]', el)!;
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      tl.fromTo(m, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.8, ease: 'power3.out' }, 0);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.03 }, 0.6);
      tl.from(lb, { yPercent: 108, duration: 1.2, stagger: 0.022 }, 0.85);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.3);
      tl.set([a, b], { clipPath: 'none' }, 2.6);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, y: 16, duration: 0.16 }, 0);
      tl.to(m, { scale: mob ? 1.35 : 1.5, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(la, { opacity: 0, yPercent: -24, duration: 0.24, stagger: { each: 0.012 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: () => -a.offsetHeight, scale: mob ? 1.06 : 1.12, duration: 0.5, ease: 'power2.inOut' }, 0.18);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
  });
}

/* ---------- Оранжевый перелив · световой занавес ----------
   Занавес проявляется из темноты, буквы поднимаются; по нижней кромке ровного занавеса бегут блики
   (импульсы, signal.ts). По прокрутке камера подходит к ровному занавесу, первая строка уходит */
function iris(el: HTMLElement, animate: boolean) {
  const a = $('[data-hx-a]', el)!;
  const b = $('[data-hx-b]', el)!;
  const bIn = $('.ir-b__in', b)!;
  const la = letters(a);
  const fades = $$('[data-hx-fade]', el);
  const after = $('[data-hx-after]', el)!;
  return run(animate, {
    intro(tl, m) {
      gsap.set([a, b], { clipPath: CLIP });
      tl.fromTo(m, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2.8, ease: 'power3.out' }, 0);
      tl.from(la, { yPercent: 108, duration: 1.2, stagger: 0.025 }, 0.6);
      tl.from(bIn, { yPercent: 108, duration: 1.3 }, 0.82);
      tl.from(fades, { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 1.15);
      tl.set([a, b], { clipPath: 'none' }, 2.2);
    },
    scrub(tl, m) {
      const mob = isMobile();
      tl.to(fades, { opacity: 0, y: 16, duration: 0.16 }, 0);
      tl.to(m, { scale: mob ? 1.3 : 1.45, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(la, { yPercent: -40, opacity: 0, duration: 0.2, stagger: { each: 0.01 }, ease: 'power2.in' }, 0.02);
      tl.to(b, { y: () => (mob ? 0 : -a.offsetHeight), scale: mob ? 1 : 1.08, duration: 0.6, ease: 'power2.inOut' }, 0.16);
      tl.to(after, { opacity: 1, duration: 0.12 }, 0.72);
    },
  });
}

const LOOKS: Record<string, (el: HTMLElement, animate: boolean) => HeroMode> = { ultra, steel, mint, iris };

export function mountLook(id: string, animate: boolean): HeroMode | null {
  const el = $(`[data-hx="${id}"]`);
  const fn = LOOKS[id];
  return el && fn ? fn(el, animate) : null;
}
