import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from './data/palettes';

/* Режим согласования: панель палитр, параметры ?palette/?studio, noindex.
   В публичной версии PUBLIC_REVIEW_MODE=false, и сайт показывает только утверждённую палитру. */
export const REVIEW_MODE = String(import.meta.env.PUBLIC_REVIEW_MODE ?? 'true').trim() !== 'false';

const approved = String(import.meta.env.PUBLIC_APPROVED_PALETTE ?? DEFAULT_PALETTE).trim();
export const APPROVED_PALETTE: PaletteId = isPaletteId(approved) ? approved : DEFAULT_PALETTE;

/* С какой палитры открывается страница без параметров и сохранённого выбора */
export const START_PALETTE: PaletteId = REVIEW_MODE ? DEFAULT_PALETTE : APPROVED_PALETTE;

export const SITE_URL = String(import.meta.env.PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
export const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const asset = (path: string) => BASE + path.replace(/^\/+/, '');
