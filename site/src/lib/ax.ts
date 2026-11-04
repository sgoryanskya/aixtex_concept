/* Общее ядро из концепции A (shared/base.js): якоря, заглушка, меню, FAQ, форма.
   Скролл родной, без инерционных библиотек. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => innerWidth < 900;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const refresh = () => ScrollTrigger.refresh();
export const lock = (on: boolean) => document.documentElement.classList.toggle('is-locked', on);

export function scrollToTarget(target: string | Element) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/* Якорные ссылки: закрыть открытые слои и плавно доехать до блока */
export function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || a.hasAttribute('data-stub')) return;
    const id = a.getAttribute('href')!;
    if (id.length < 2) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('ax:close-overlays'));
    scrollToTarget(id);
  });
}

/* Разбивка текста на слова с масками: дочерние теги (em, br, b) сохраняются */
export function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return $$('.wi', el);
  const walk = (node: Node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent ?? '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('span');
          i.className = 'wi';
          i.textContent = part;
          w.appendChild(i);
          frag.appendChild(w);
        });
        (n as ChildNode).replaceWith(frag);
      } else if (n.nodeType === 1 && (n as Element).tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  return $$('.wi', el);
}

/* Заглушка для разделов, которых пока нет */
export function initStub() {
  const modal = $('[data-stub-modal]');
  if (!modal) return;
  const titleEl = $('[data-stub-name]', modal);
  let lastFocus: HTMLElement | null = null;
  const open = (name: string) => {
    if (titleEl) titleEl.textContent = name || 'Этот раздел';
    lastFocus = document.activeElement as HTMLElement | null;
    document.dispatchEvent(new CustomEvent('ax:close-menu'));
    modal.hidden = false;
    lock(true);
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      $('[data-stub-close]', modal)?.focus({ preventScroll: true });
    });
  };
  const close = (restore = true) => {
    if (modal.hidden || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    lock(false);
    setTimeout(() => {
      modal.hidden = true;
      if (restore) lastFocus?.focus({ preventScroll: true });
    }, reduced ? 0 : 450);
  };
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const a = t.closest<HTMLElement>('[data-stub]');
    if (a) {
      e.preventDefault();
      open(a.dataset.stub || (a.textContent ?? '').trim());
      return;
    }
    if (t.closest('[data-stub-close]')) {
      e.preventDefault();
      close();
    } else if (t === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  document.addEventListener('ax:close-overlays', () => close(false));
}

/* Полноэкранное меню */
export function initMenu() {
  const menu = $('[data-menu]');
  if (!menu) return;
  const set = (on: boolean) => {
    menu.classList.toggle('is-open', on);
    menu.setAttribute('aria-hidden', on ? 'false' : 'true');
    menu.inert = !on;
    lock(on);
    $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', String(on)));
    if (on) $('[data-menu-close]', menu)?.focus({ preventScroll: true });
  };
  const isOpen = () => menu.classList.contains('is-open');
  menu.inert = true;
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('[data-menu-open]')) set(!isOpen());
    else if (t.closest('[data-menu-close]')) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) set(false);
  });
  document.addEventListener('ax:close-menu', () => isOpen() && set(false));
  document.addEventListener('ax:close-overlays', () => isOpen() && set(false));
}

/* FAQ-аккордеон: открыт один ответ */
export function initFaq() {
  $$('[data-faq-item]').forEach((item) => {
    const btn = $<HTMLButtonElement>('button', item)!;
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('[data-faq-item].is-open', item.parentElement!).forEach((o) => {
        if (o === item) return;
        o.classList.remove('is-open');
        $('button', o)?.setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      setTimeout(refresh, 520);
    });
  });
}

/* Форма без бэкенда: проверяет поля и готовит письмо в почтовой программе посетителя.
   Ничего не отправляет сама и не показывает «заявка принята». */
export function initForm() {
  $$<HTMLFormElement>('[data-form]').forEach((form) => {
    const fields = $$<HTMLInputElement>('[required]', form);
    const validate = (f: HTMLInputElement) => {
      const v = f.value.trim();
      let ok = !!v;
      if (f.dataset.contact !== undefined && ok) ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.replace(/\D/g, '').length >= 10;
      f.closest('[data-field]')?.classList.toggle('has-error', !ok);
      f.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    fields.forEach((f) => {
      f.addEventListener('blur', () => f.value.trim() && validate(f));
      f.addEventListener('input', () => f.closest('[data-field]')?.classList.contains('has-error') && validate(f));
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = fields.filter((f) => !validate(f));
      if (bad.length) {
        bad[0].focus();
        return;
      }
      const d = new FormData(form);
      const body = [`Имя: ${d.get('name')}`, `Контакт: ${d.get('contact')}`, '', String(d.get('task') ?? '')].join('\n');
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(form.dataset.subject ?? '')}&body=${encodeURIComponent(body)}`;
      form.classList.add('is-sent');
      $('[data-form-ok]', form)?.focus();
      setTimeout(refresh, 60);
    });
    $('[data-form-reset]', form)?.addEventListener('click', () => {
      form.reset();
      form.classList.remove('is-sent');
      fields[0]?.focus();
      setTimeout(refresh, 60);
    });
  });
}

/* Позиции пересчитываются после загрузки шрифтов */
export function afterFonts(cb: () => void) {
  const run = () => {
    cb();
    refresh();
  };
  if (document.fonts?.ready) document.fonts.ready.then(run);
  else addEventListener('load', run);
}
addEventListener('load', refresh);
