"""Иллюстрации концепции части 9 «Перелив» (iris).

Источники те же, что у остальных палитр (src/scenes, src/glass-girl.png); остальные палитры этот скрипт не трогает.
  iris — медь остаётся оранжевой, а блики уходят в розовый и сирень, как тонкая плёнка (WMT AI).
         Тени глубже, в красную лаву.
Запуск: python3 site/scripts/art/iri.py site/scripts/art/src site/public/img/art
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from finish import matte_scene  # noqa: E402

SRC, OUT = sys.argv[1], sys.argv[2]
NAMES = ['assistant', 'sales', 'support', 'office', 'callcenter', 'corp', 'custom',
         'ind-trade', 'ind-marketing', 'ind-finance', 'ind-telecom', 'ind-ecom', 'ind-other']
FRAME = {'scene': ((1120, 840), (0.88, 0.86)), 'ind': ((1040, 1040), (0.86, 0.86))}

M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])


def to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def lch(rgb):
    lab = np.cbrt(to_lin(rgb) @ M1.T) @ M2.T
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.arctan2(lab[..., 2], lab[..., 1])


def from_lch(L, C, H):
    lab = np.stack([L, C * np.cos(H), C * np.sin(H)], -1)
    return to_srgb(((lab @ np.linalg.inv(M2).T) ** 3) @ np.linalg.inv(M1).T)


def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def iris_hue(h0, L, C, lo=0.58, hi=0.9):
    """Тонкая плёнка: свет уходит от оранжевого к розовому и сирени, тени — к красной лаве."""
    up = sm(lo, hi, L)
    down = sm(0.45, 0.2, L)
    return h0 - np.radians(95) * up ** 1.2 - np.radians(10) * down


def frame(im, size, fit):
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
    hd = np.degrees(Hh)
    warm = (hd > -40) & (hd < 100)
    core = (C > 0.08) & (hd > 25) & (hd < 85)
    grow = warm & ((C > 0.05) | ((L < 0.42) & (C > 0.035)))
    region = ndimage.binary_propagation(core, mask=grow)
    region = ndimage.binary_closing(region, iterations=2)
    w = np.clip(ndimage.gaussian_filter(region.astype(float), 1.0), 0, 1)
    return w * np.clip((C - 0.05) / 0.03, 0, 1)


def save(arr, path, q=84):
    Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path, quality=q, method=6)


for n in NAMES:
    size, fit = FRAME['ind' if n.startswith('ind-') else 'scene']
    stem = n if n.startswith('ind-') else f'scene-{n}'
    src = frame(np.asarray(Image.open(f'{SRC}/scenes/{n}.png').convert('RGB'), float) / 255, size, fit)
    im = matte_scene(src)
    L, C, Hh = lch(im)
    w = copper_mask(L, C, Hh)
    sel = w > 0.5
    h0 = np.median(Hh[sel & (C > 0.06)])
    # iris: медь с плёночным переливом в бликах
    d = np.angle(np.exp(1j * (Hh - h0)))
    H3 = np.where(w > 0.02, iris_hue(h0 + d * 0.3, L, C), Hh)
    C3 = np.where(w > 0.02, C * (1.08 * w + 0.25 * (1 - w)), C)
    save(from_lch(L, C3, H3), f'{OUT}/{stem}-iris.webp')
    print(n, f'медь {sel.mean() * 100:.1f}%')

# стеклянный бюст: чёрный фон -> прозрачность, как в glass.py
im = np.asarray(Image.open(f'{SRC}/glass-girl.png').convert('RGB'), float) / 255
a = np.clip((im.max(-1) - 0.025) / 0.975, 0, 1)
rgb = np.clip(np.where(a[..., None] > 1e-3, im / np.maximum(im.max(-1, keepdims=True), 1e-3), 0), 0, 1)
L, C, Hh = lch(rgb)
h0 = float(np.arctan2(np.median(np.sin(Hh[C > 0.08])), np.median(np.cos(Hh[C > 0.08]))))
# оранжевое стекло, блики и тонкие края — розовый и сирень
d = np.angle(np.exp(1j * (Hh - h0)))
Hi = iris_hue(h0 + d * 0.4, L, C, 0.74, 0.98) - np.radians(40) * sm(0.5, 0.1, a)
Ci = C * 1.02
out = from_lch(L, Ci, Hi)
Image.fromarray((np.clip(np.concatenate([out, a[..., None]], -1), 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}/glass-iris.webp', quality=86, method=6)
print('glass')
