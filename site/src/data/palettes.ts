/* Единственный источник цветов сайта (бриф v3, раздел 9). Значения — предложения,
   не утверждённые заказчиком. Палитра «Сигнал» повторяет цвета концепции A,
   остальные строятся по той же схеме: тёмная комната, светлые главы и один акцент.
   CSS-переменные названы так же, как в концепции A, чтобы её стили переносились без правок. */

export interface Palette {
  id: string;
  name: string;
  /* Тёмная комната */
  bg: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  /* Сигнал: акцент, текст на нём и второй цвет мелких меток */
  accent: string;
  onAccent: string;
  secondary: string;
  /* Светлые главы: фон, карточки, глубокий тон и текст */
  paper: string;
  paperCard: string;
  paperDeep: string;
  paperText: string;
  /* Металл иллюстраций: тени, основной тон, свет, блик */
  metalDark: string;
  metalBase: string;
  metalLight: string;
  metalHighlight: string;
  /* Набор перекрашенных иллюстраций (public/img/art): у палитр с одинаковым металлом он общий */
  art: 'signal' | 'olive' | 'bronze' | 'gold';
}

export const PALETTES = [
  {
    id: 'signal',
    art: 'signal',
    name: 'Чёрный / оранжевый',
    bg: '#0B0B0C',
    surface: '#141416',
    surfaceRaised: '#1D1D20',
    text: '#F4F3F0',
    accent: '#FF5E1A',
    onAccent: '#0D0704',
    // шампань вместо ледяного голубого: второй цвет тёплый и спокойный, как металл (бриф v3, открытый вопрос 4; голубой #19D3FF)
    secondary: '#E9D5B7',
    paper: '#EFEFED',
    paperCard: '#F8F8F6',
    paperDeep: '#E5E5E2',
    paperText: '#0F0F10',
    metalDark: '#4A1505',
    metalBase: '#E0561C',
    metalLight: '#FFB27A',
    metalHighlight: '#FFF1E2',
  },
  {
    id: 'olive-signal',
    art: 'signal',
    name: 'Тёмная олива / оранжевый',
    bg: '#10130D',
    surface: '#181D14',
    surfaceRaised: '#222A1C',
    text: '#F2F1E8',
    accent: '#FF6A26',
    onAccent: '#10130D',
    secondary: '#C9D17E',
    paper: '#E9EADF',
    paperCard: '#F5F5EE',
    paperDeep: '#DFE0D3',
    paperText: '#13160F',
    metalDark: '#4A1505',
    metalBase: '#E0561C',
    metalLight: '#FFB27A',
    metalHighlight: '#FFF1E2',
  },
  {
    id: 'olive',
    art: 'olive',
    name: 'Графит / яркая олива',
    bg: '#0D0E0B',
    surface: '#171914',
    surfaceRaised: '#21241C',
    text: '#F2F2EA',
    accent: '#C3CD6A',
    onAccent: '#12140A',
    secondary: '#E0B96A',
    paper: '#E8E9DD',
    paperCard: '#F4F4EC',
    paperDeep: '#DCDDD0',
    paperText: '#14160E',
    metalDark: '#33331A',
    metalBase: '#A3A256',
    metalLight: '#E4E2A8',
    metalHighlight: '#FBFAE8',
  },
  {
    id: 'bronze',
    art: 'bronze',
    name: 'Графит / бронза',
    bg: '#0B0E0F',
    surface: '#151B1E',
    surfaceRaised: '#202A2E',
    text: '#F6F2E8',
    accent: '#C58F61',
    onAccent: '#14110F',
    secondary: '#92B6BC',
    paper: '#ECE8E1',
    paperCard: '#F7F4EF',
    paperDeep: '#E1DCD3',
    paperText: '#1A1714',
    metalDark: '#4E3020',
    metalBase: '#A8734B',
    metalLight: '#F2D6AF',
    metalHighlight: '#FFF6E8',
  },
  {
    id: 'gold',
    art: 'gold',
    name: 'Уголь / золото',
    bg: '#101110',
    surface: '#1B1D19',
    surfaceRaised: '#282B24',
    text: '#F5F2E8',
    accent: '#DEC57F',
    onAccent: '#171A12',
    secondary: '#A8B28E',
    paper: '#EEEBE2',
    paperCard: '#F8F6F0',
    paperDeep: '#E3DFD4',
    paperText: '#191812',
    metalDark: '#54472C',
    metalBase: '#B8A063',
    metalLight: '#F1E3B7',
    metalHighlight: '#FFFBEF',
  },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]['id'];

/* Стартовая палитра режима согласования и цель кнопки «Сбросить» */
export const DEFAULT_PALETTE: PaletteId = 'signal';
export const PALETTE_IDS = PALETTES.map((p) => p.id) as PaletteId[];
/* v2: выбор, сохранённый в раундах 3–4 (там по умолчанию была бронза), больше не действует */
export const STORAGE_KEY = 'aixtex.palette.v2';

export const isPaletteId = (v: unknown): v is PaletteId =>
  typeof v === 'string' && (PALETTE_IDS as string[]).includes(v);

export const getPalette = (id: PaletteId): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* Акцент для мелкого текста на бумаге: тот же тон, утемнённый к цвету текста бумаги,
   пока не наберёт 4,5:1 на самой тёмной бумаге палитры (бриф v3, раздел 15) */
function accentOnPaper(p: Palette): string {
  const a = rgb(p.accent), d = rgb(p.paperText), bg = rgb(p.paperDeep);
  for (let k = 1; k >= 0; k -= 0.05) {
    const c = a.map((v, i) => Math.round(v * k + d[i] * (1 - k)));
    if (ratio(c, bg) >= 4.6) return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  return p.paperText;
}

/* Базовые переменные одной палитры; прозрачные оттенки и линии считаются в CSS через color-mix */
export function paletteVars(p: Palette): string {
  return [
    `--ink:${p.bg}`,
    `--ink-2:${p.surface}`,
    `--ink-3:${p.surfaceRaised}`,
    `--t1:${p.text}`,
    `--signal:${p.accent}`,
    `--on-signal:${p.onAccent}`,
    `--signal-ink:${accentOnPaper(p)}`,
    `--ice:${p.secondary}`,
    `--fog:${p.paper}`,
    `--paper:${p.paperCard}`,
    `--fog-2:${p.paperDeep}`,
    `--d1:${p.paperText}`,
    `--metal-dark:${p.metalDark}`,
    `--metal-base:${p.metalBase}`,
    `--metal-light:${p.metalLight}`,
    `--metal-hi:${p.metalHighlight}`,
  ].join(';');
}
