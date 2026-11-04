"""Сцены каталога и отраслей: фарфор, мрамор и медь (Figma, src/scenes) -> единая кадровка и медь в металле палитры.

Каталог кадрируется в 4:3 (1120×840), отрасли (ind-*) — в квадрат 1040×1040.

Фон приводится к чистому белому (на сайте картинка ложится на карточку через multiply), сцена
вписывается в кадр с одинаковыми полями. Медь находится по насыщенности и наращивается по
соседним пикселям, чтобы блики и отражения на металле перекрашивались вместе с ним.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
NAMES = sys.argv[3:] or ['assistant', 'sales', 'support', 'office', 'callcenter', 'corp', 'custom',
                         'ind-trade', 'ind-marketing', 'ind-finance', 'ind-telecom', 'ind-ecom', 'ind-other']
# размер кадра и доля, в которую вписывается сцена
FRAME = {'scene': ((1120, 840), (0.88, 0.86)), 'ind': ((1040, 1040), (0.86, 0.86))}
# металл палитры (metalBase в palettes.ts); у «Сигнала» медь остаётся как есть
BASE = {'olive': '#A3A256', 'bronze': '#A8734B', 'gold': '#B8A063'}
# поправки на глаз: доля сдвига оттенка и множитель насыщенности
# и добавка к оттенку в градусах (бронза без розового)
TUNE = {'olive': (0.8, 0.85, 0), 'bronze': (1.0, 0.85, 9), 'gold': (0.85, 1.0, 0)}


def hx(c):
    return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255


def to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])


def oklab(rgb):
    return np.cbrt(to_lin(rgb) @ M1.T) @ M2.T


def from_oklab(lab):
    lms = lab @ np.linalg.inv(M2).T
    return to_srgb((lms ** 3) @ np.linalg.inv(M1).T)


def lch(rgb):
    lab = oklab(rgb)
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.arctan2(lab[..., 2], lab[..., 1])


def frame(im, size, fit):
    """Белый фон и одинаковые поля: сцена по рамке содержимого, вписанная в кадр size."""
    W, H = size
    corners = np.concatenate([im[:24, :24].reshape(-1, 3), im[:24, -24:].reshape(-1, 3), im[-24:, :24].reshape(-1, 3), im[-24:, -24:].reshape(-1, 3)])
    im = np.clip(im / np.median(corners, 0), 0, 1)
    ys, xs = np.nonzero((1 - im).max(-1) > 0.035)
    box = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    bh, bw = box.shape[:2]
    s = min(W * fit[0] / bw, H * fit[1] / bh)
    pic = Image.fromarray((box * 255 + 0.5).astype(np.uint8)).resize((round(bw * s), round(bh * s)), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    canvas.paste(pic, ((W - pic.width) // 2, (H - pic.height) // 2 + round(H * 0.01)))
    return np.asarray(canvas, float) / 255


def copper_mask(L, C, Hh):
    """Медь: насыщенное ядро в оранжевых тонах, наращенное по бликам и тёмным отражениям.
    Зелень растений и тёплый мрамор (насыщенность ниже 0,05) в маску не попадают."""
    hd = np.degrees(Hh)
    warm = (hd > -40) & (hd < 100)
    core = (C > 0.08) & (hd > 25) & (hd < 85)
    grow = warm & ((C > 0.05) | ((L < 0.42) & (C > 0.035)))
    region = ndimage.binary_propagation(core, mask=grow)
    region = ndimage.binary_closing(region, iterations=2)
    w = np.clip(ndimage.gaussian_filter(region.astype(float), 1.0), 0, 1)
    # слабонасыщенные пиксели внутри маски (рефлексы меди на фарфоре) почти не трогаются
    return w * np.clip((C - 0.05) / 0.03, 0, 1)


for n in NAMES:
    size, fit = FRAME['ind' if n.startswith('ind-') else 'scene']
    stem = n if n.startswith('ind-') else f'scene-{n}'
    im = frame(np.asarray(Image.open(f'{SRC}/{n}.png').convert('RGB'), float) / 255, size, fit)
    L, C, Hh = lch(im)
    w = copper_mask(L, C, Hh)
    sel = w > 0.5
    h0, c0 = np.median(Hh[sel & (C > 0.06)]), np.median(C[sel & (C > 0.06)])
    Image.fromarray((im * 255 + 0.5).astype(np.uint8)).save(f'{OUT}/{stem}-signal.webp', quality=84, method=6)
    for pid, col in BASE.items():
        _, c1, h1 = (float(v[0]) for v in lch(hx(col)[None, :]))
        fh, fc, dd = TUNE[pid]
        k = float(np.clip(c1 / c0 * fc, 0.35, 1.3))
        H2 = Hh + ((h1 - h0) * fh + np.radians(dd)) * w
        C2 = C * (1 + (k - 1) * w)
        out = from_oklab(np.stack([L, C2 * np.cos(H2), C2 * np.sin(H2)], -1))
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}/{stem}-{pid}.webp', quality=84, method=6)
    print(n, f'медь {sel.mean() * 100:.1f}% кадра, оттенок {np.degrees(h0):.0f}°, C {c0:.3f}')
