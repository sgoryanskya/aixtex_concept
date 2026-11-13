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
        /* делится только по обычным пробелам: неразрывный пробел держит предлог со словом в одной коробке */
        (n.textContent ?? '').split(/([ \t\n\r]+)/).forEach((part) => {
          if (!part) return;
          if (/^[ \t\n\r]+$/.test(part)) {
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

/* Телефон по российскому образцу: +7 (XXX) XXX-XX-XX. Восьмёрка и номер без кода страны приводятся к +7;
   номер другой страны (с «+» и не семёркой) остаётся как ввёл посетитель */
const isForeign = (v: string) => /^\s*\+\s*[0-689]/.test(v);
function fmtPhone(v: string): string {
  if (isForeign(v)) return v.replace(/[^\d+\s()-]/g, '');
  let d = v.replace(/\D/g, '');
  if (!d) return '';
  /* номер целиком вставлен после «+7 (»: лишняя семёрка маски отбрасывается */
  if (d.length > 11 && /^7[78]/.test(d)) d = d.slice(1);
  d = (/[78]/.test(d[0]) ? '7' + d.slice(1) : '7' + d).slice(0, 11);
  let s = '+7';
  if (d.length > 1) s += ' (' + d.slice(1, 4);
  if (d.length > 4) s += ') ' + d.slice(4, 7);
  if (d.length > 7) s += '-' + d.slice(7, 9);
  if (d.length > 9) s += '-' + d.slice(9, 11);
  return s;
}
const phoneOk = (v: string) => {
  const n = v.replace(/\D/g, '').length;
  return isForeign(v) ? n >= 8 && n <= 15 : n === 11;
};
function maskPhone(f: HTMLInputElement) {
  /* после форматирования курсор встаёт за тем же числом цифр, что и до него */
  const apply = () => {
    /* «+» поверх подставленного «+7 (» начинает номер другой страны */
    if (/^\+7 \(\+/.test(f.value)) f.value = f.value.slice(4);
    const raw = f.value;
    if (isForeign(raw)) return;
    const pos = f.selectionStart ?? raw.length;
    const d = raw.replace(/\D/g, '');
    let k = raw.slice(0, pos).replace(/\D/g, '').length + (d && !/[78]/.test(d[0]) ? 1 : 0);
    const v = fmtPhone(raw);
    f.value = v;
    let at = v.length;
    if (pos < raw.length) {
      for (let i = 0; i < v.length && k > 0; i++) if (/\d/.test(v[i]) && --k === 0) at = i + 1;
    }
    f.setSelectionRange(at, at);
  };
  f.addEventListener('input', apply);
  /* Backspace после скобки, пробела или дефиса стирает ближайшую цифру, а не знак маски */
  f.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace' || isForeign(f.value)) return;
    const a = f.selectionStart ?? 0;
    if (a !== f.selectionEnd || a === 0 || /\d/.test(f.value[a - 1])) return;
    let i = a;
    while (i > 0 && !/\d/.test(f.value[i - 1])) i--;
    if (i <= 2) return;
    e.preventDefault();
    f.value = f.value.slice(0, i - 1) + f.value.slice(a);
    f.setSelectionRange(i - 1, i - 1);
    apply();
  });
  f.addEventListener('focus', () => {
    if (f.value) return;
    f.value = '+7 (';
    f.setSelectionRange(4, 4);
  });
  f.addEventListener('blur', () => /^\+7\s?\(?$/.test(f.value) && (f.value = ''));
}

/* Форма заявки. Проверяет поля на месте, ошибки — под полем. С адресом обработчика (data-endpoint)
   отправляет JSON; без него открывает письмо в почтовой программе посетителя и не изображает отправку */
export function initForm() {
  $$<HTMLFormElement>('[data-form]').forEach((form) => {
    const fields = $$<HTMLInputElement>('input:not([type="checkbox"]), textarea', form);
    const check = $<HTMLInputElement>('input[type="checkbox"]', form);
    const send = $<HTMLButtonElement>('[data-form-send]', form);
    const fail = $('[data-form-fail]', form);
    const phone = $<HTMLInputElement>('[data-phone]', form);
    if (phone) maskPhone(phone);
    const validate = (f: HTMLInputElement) => {
      const v = f.value.trim();
      let ok = true;
      if (f.type === 'checkbox') ok = f.checked;
      else if (f.dataset.phone !== undefined) ok = phoneOk(v);
      else if (f.dataset.email !== undefined) ok = !v || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);
      else if (f.required) ok = !!v;
      f.closest('[data-field]')?.classList.toggle('has-error', !ok);
      if (f.required || f.dataset.email !== undefined) f.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    const all = [...fields, ...(check ? [check] : [])];
    fields.forEach((f) => {
      f.addEventListener('blur', () => f.value.trim() && validate(f));
      f.addEventListener('input', () => f.closest('[data-field]')?.classList.contains('has-error') && validate(f));
    });
    check?.addEventListener('change', () => check.closest('[data-field]')?.classList.contains('has-error') && validate(check));
    const done = () => {
      form.classList.add('is-sent');
      $('[data-form-ok]', form)?.focus();
      setTimeout(refresh, 60);
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.classList.contains('is-busy')) return;
      const bad = all.filter((f) => !validate(f));
      if (bad.length) {
        bad[0].focus();
        return;
      }
      if (fail) fail.hidden = true;
      const d = new FormData(form);
      const get = (k: string) => String(d.get(k) ?? '').trim();
      const data = { name: get('name'), company: get('company'), phone: get('phone'), email: get('email'), task: get('task'), consent: true, page: location.href };
      const url = form.dataset.endpoint;
      if (!url) {
        const lines = [`Имя: ${data.name}`];
        if (data.company) lines.push(`Компания: ${data.company}`);
        lines.push(`Телефон: ${data.phone}`);
        if (data.email) lines.push(`E-mail: ${data.email}`);
        if (data.task) lines.push('', 'Задача:', data.task);
        const body = lines.join('\n');
        location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(form.dataset.subject ?? '')}&body=${encodeURIComponent(body)}`;
        done();
        return;
      }
      const label = send ? $('span', send) : null;
      const text = label?.textContent ?? '';
      form.classList.add('is-busy');
      if (send) send.disabled = true;
      if (label && send?.dataset.busy) label.textContent = send.dataset.busy;
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(String(r.status));
        done();
      } catch {
        if (fail) fail.hidden = false;
        setTimeout(refresh, 60);
      } finally {
        form.classList.remove('is-busy');
        if (send) send.disabled = false;
        if (label) label.textContent = text;
      }
    });
    $('[data-form-reset]', form)?.addEventListener('click', () => {
      form.reset();
      all.forEach((f) => { f.closest('[data-field]')?.classList.remove('has-error'); f.removeAttribute('aria-invalid'); });
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
