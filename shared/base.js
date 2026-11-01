/* АИТЕХ · общее ядро демо-макетов: заглушка, формы, FAQ, переключатель концепций.
   Скролл родной: на Тильде инерционные библиотеки спорят с её попапами и якорями. */
(function () {
  const AX = (window.AX = {});
  AX.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  AX.touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  AX.isMobile = () => innerWidth < 900;
  AX.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  AX.lerp = (a, b, t) => a + (b - a) * t;

  const ST = window.ScrollTrigger;
  const refresh = () => ST && ST.refresh();
  if (ST) {
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
  }

  AX.lock = (on) => document.documentElement.classList.toggle('is-locked', on);
  AX.scrollTo = function (target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) el.scrollIntoView({ behavior: AX.reduced ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-stub')) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('ax:close-overlays'));
    AX.scrollTo(id);
  });

  /* Разбивка текста на слова с масками: дочерние теги (em, br, b) сохраняются */
  AX.splitWords = function (el) {
    if (el.dataset.splitDone) return el.querySelectorAll('.wi');
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.className = 'wi';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return el.querySelectorAll('.wi');
  };

  /* Заглушка «демо-макет»: все внутренние страницы ведут сюда */
  AX.initStub = function (hooks) {
    hooks = hooks || {};
    const modal = document.querySelector('[data-stub-modal]');
    if (!modal) return;
    const titleEl = modal.querySelector('[data-stub-name]');
    let lastFocus = null;
    const open = (name) => {
      if (titleEl) titleEl.textContent = name || 'Этот раздел';
      lastFocus = document.activeElement;
      document.dispatchEvent(new CustomEvent('ax:close-menu'));
      modal.hidden = false;
      AX.lock(true);
      requestAnimationFrame(() => {
        modal.classList.add('is-open');
        const f = modal.querySelector('[data-stub-close]');
        if (f) f.focus({ preventScroll: true });
      });
      if (hooks.open) hooks.open(modal, name);
    };
    const close = () => {
      if (modal.hidden) return;
      modal.classList.remove('is-open');
      AX.lock(false);
      const done = () => {
        modal.hidden = true;
        if (lastFocus) lastFocus.focus({ preventScroll: true });
      };
      if (hooks.close) hooks.close(modal, done);
      else setTimeout(done, AX.reduced ? 0 : 450);
    };
    AX.openStub = open;
    AX.closeStub = close;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-stub]');
      if (a) {
        e.preventDefault();
        open(a.dataset.stub || a.textContent.trim());
        return;
      }
      if (e.target.closest('[data-stub-close]')) {
        const c = e.target.closest('[data-stub-close]');
        e.preventDefault();
        close();
        if (c.getAttribute('href') === '#contact') setTimeout(() => AX.scrollTo('#contact'), 80);
      } else if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.addEventListener('ax:close-overlays', close);
  };

  /* Полноэкранное меню */
  AX.initMenu = function () {
    const menu = document.querySelector('[data-menu]');
    if (!menu) return;
    const set = (on) => {
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', on ? 'false' : 'true');
      menu.inert = !on;
      AX.lock(on);
      document.querySelectorAll('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', on));
    };
    menu.inert = true;
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-menu-open]')) set(!menu.classList.contains('is-open'));
      else if (e.target.closest('[data-menu-close]')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false);
    });
    document.addEventListener('ax:close-menu', () => menu.classList.contains('is-open') && set(false));
    document.addEventListener('ax:close-overlays', () => menu.classList.contains('is-open') && set(false));
  };

  /* FAQ-аккордеон */
  AX.initFaq = function () {
    document.querySelectorAll('[data-faq-item]').forEach((item) => {
      const btn = item.querySelector('button');
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        item.parentElement.querySelectorAll('[data-faq-item].is-open').forEach((o) => {
          if (o !== item) {
            o.classList.remove('is-open');
            o.querySelector('button').setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open);
        setTimeout(refresh, 520);
      });
    });
  };

  /* Форма без бэкенда: проверка полей и демонстрационное состояние «отправлено» */
  AX.initForm = function () {
    document.querySelectorAll('[data-form]').forEach((form) => {
      const fields = [...form.querySelectorAll('[required]')];
      const validate = (f) => {
        let ok = !!f.value.trim();
        if (f.dataset.contact !== undefined && ok) {
          const v = f.value.trim();
          ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.replace(/\D/g, '').length >= 10;
        }
        f.closest('[data-field]').classList.toggle('has-error', !ok);
        f.setAttribute('aria-invalid', !ok);
        return ok;
      };
      fields.forEach((f) =>
        f.addEventListener('blur', () => {
          if (f.value.trim()) validate(f);
        })
      );
      fields.forEach((f) =>
        f.addEventListener('input', () => {
          if (f.closest('[data-field]').classList.contains('has-error')) validate(f);
        })
      );
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const bad = fields.filter((f) => !validate(f));
        if (bad.length) return bad[0].focus();
        form.classList.add('is-sending');
        setTimeout(() => {
          form.classList.remove('is-sending');
          form.classList.add('is-sent');
          form.dispatchEvent(new CustomEvent('ax:sent'));
        }, 900);
      });
      const again = form.querySelector('[data-form-reset]');
      if (again)
        again.addEventListener('click', () => {
          form.reset();
          form.classList.remove('is-sent');
        });
    });
  };

  /* Переключение концепций клавишами 1, 2, 3 */
  const VARIANTS = ['a-signal', 'b-pixel', 'c-light'];
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i > -1) location.href = '../' + VARIANTS[i] + '/index.html';
  });

  /* Обновляем позиции после загрузки шрифтов и картинок */
  AX.afterFonts = function (cb) {
    const run = () => {
      cb();
      refresh();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else addEventListener('load', run);
  };
  addEventListener('load', refresh);
})();
