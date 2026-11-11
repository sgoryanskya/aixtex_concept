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
  /* Набор перекрашенных иллюстраций (public/img/art): свой у каждой палитры */
  art: 'signal' | 'olive' | 'ultra' | 'steel' | 'mint';
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
  /* Четыре направления без оранжевого (раунд 5, ноябрь 2026). Каждое пересобрано целиком: комната, бумага,
     акцент, второй цвет и металл иллюстраций. Источники — подписанные заказчиком референсы из общей папки */
  {
    // «очень крутой лого» (Echo Hills) и прямое пожелание заказчика: олива с латунью, бумага с оливковым подтоном
    id: 'olive',
    art: 'olive',
    name: 'Олива и латунь',
    bg: '#13160E',
    surface: '#1B1F14',
    surfaceRaised: '#252A1C',
    text: '#EFECDF',
    accent: '#BAC46A',
    onAccent: '#13160E',
    secondary: '#D8C59C',
    paper: '#E6E4D4',
    paperCard: '#F2F1E7',
    paperDeep: '#DAD8C5',
    paperText: '#171A10',
    metalDark: '#2E3016',
    metalBase: '#8F9146',
    metalLight: '#D8D69C',
    metalHighlight: '#F8F7E3',
  },
  {
    // «вариант цвета aixtex»: ультрамарин в чёрной комнате; светлый акцент с тёмной надписью на кнопке
    id: 'ultra',
    art: 'ultra',
    name: 'Ультрамарин',
    bg: '#04050C',
    surface: '#0B0E1C',
    surfaceRaised: '#14182B',
    text: '#EEF0FA',
    accent: '#5B78FF',
    onAccent: '#04050C',
    secondary: '#C9D3F5',
    paper: '#ECEEF4',
    paperCard: '#F7F8FB',
    paperDeep: '#E1E4EC',
    paperText: '#0A0C16',
    metalDark: '#0A1250',
    metalBase: '#2F4BE8',
    metalLight: '#A9B8FF',
    metalHighlight: '#F0F3FF',
  },
  {
    // «ВАУ цвета для aixtex» и langchain.com: холодная сталь, второй цвет — тёплый жемчуг
    id: 'steel',
    art: 'steel',
    name: 'Сталь и жемчуг',
    bg: '#080B0D',
    surface: '#10161A',
    surfaceRaised: '#192127',
    text: '#EEF2F3',
    accent: '#9FC3D3',
    onAccent: '#081014',
    secondary: '#E0D2C0',
    paper: '#E9ECED',
    paperCard: '#F5F7F7',
    paperDeep: '#DDE1E3',
    paperText: '#0C1114',
    metalDark: '#16242C',
    metalBase: '#5E8597',
    metalLight: '#C9DDE5',
    metalHighlight: '#F4FAFC',
  },
  {
    // «вариация цветов 4» (aclitec) и «ещё классный вар цвета» (MarketLytics): мята в чёрном, второй цвет — шампань
    id: 'mint',
    art: 'mint',
    name: 'Мята и шампань',
    bg: '#050A0A',
    surface: '#0B1514',
    surfaceRaised: '#13201E',
    text: '#ECF4F1',
    accent: '#3FD9B4',
    onAccent: '#04100D',
    secondary: '#E2D3B5',
    paper: '#E8EFEC',
    paperCard: '#F4F8F6',
    paperDeep: '#DBE4E0',
    paperText: '#0A1311',
    metalDark: '#053329',
    metalBase: '#19A486',
    metalLight: '#93EBD3',
    metalHighlight: '#EAFCF6',
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
