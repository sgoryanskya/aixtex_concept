/* Текущая палитра страницы. Источник истины — атрибут data-palette на <html>,
   который ставит встроенный скрипт в <head>; здесь — смена, сохранение и события. */
import { DEFAULT_PALETTE, STORAGE_KEY, getPalette, isPaletteId, type Palette, type PaletteId } from '../data/palettes';

declare global {
  interface Window {
    __art?: (img: HTMLImageElement) => void;
  }
}

const root = document.documentElement;
type Listener = (p: Palette) => void;
const listeners = new Set<Listener>();

export const currentId = (): PaletteId => {
  const v = root.getAttribute('data-palette');
  return isPaletteId(v) ? v : DEFAULT_PALETTE;
};
export const currentPalette = () => getPalette(currentId());
export const isStudio = () => root.getAttribute('data-studio') === '1';

export function onPalette(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let themingTimer = 0;

export function setPalette(id: PaletteId) {
  if (id === currentId()) return;
  const p = getPalette(id);
  root.classList.add('is-theming');
  clearTimeout(themingTimer);
  themingTimer = window.setTimeout(() => root.classList.remove('is-theming'), 320);
  root.setAttribute('data-palette', id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
  /* Перекрашенные иллюстрации: адрес собирает функция из встроенного скрипта в <head> */
  root.setAttribute('data-art', p.art);
  document.querySelectorAll<HTMLImageElement>('img[data-art-tpl]').forEach((img) => window.__art?.(img));
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* хранилище недоступно: выбор живёт до перезагрузки */
  }
  /* Обновляем адрес без новой записи в истории, чтобы перезагрузка открыла тот же вариант */
  const url = new URL(location.href);
  url.searchParams.set('palette', id);
  history.replaceState(history.state, '', url);
  listeners.forEach((fn) => fn(p));
}

/* Адрес текущего варианта: та же страница, якорь и параметры, другая палитра и режим панели */
export function variantUrl(studio: boolean) {
  const url = new URL(location.href);
  url.searchParams.set('palette', currentId());
  url.searchParams.set('studio', studio ? '1' : '0');
  return url.toString();
}
