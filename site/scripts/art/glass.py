"""Стеклянная девушка C: чёрный фон -> прозрачность, оранжевое стекло -> оттенок палитры (OkLCh)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
# металл каждой палитры; оттенок стекла сдвигается от «Сигнала» к нему
BASE = {'signal': '#E0561C', 'olive': '#A3A256', 'bronze': '#A8734B', 'gold': '#B8A063'}
# поправки на глаз: олива и золото без ухода в зелень, насыщенность чуть выше расчётной
TUNE = {'olive': (0.8, 0.85), 'bronze': (1.0, 1.15), 'gold': (0.72, 1.25)}

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
    lms = np.cbrt(to_lin(rgb) @ M1.T)
    return lms @ M2.T

def from_oklab(lab):
    lms = lab @ np.linalg.inv(M2).T
    return to_srgb((lms ** 3) @ np.linalg.inv(M1).T)

def lch(rgb):
    lab = oklab(rgb)
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.arctan2(lab[..., 2], lab[..., 1])

im = np.asarray(Image.open(SRC).convert('RGB'), float) / 255
# фон чёрный: прозрачность = яркость самого яркого канала, цвет восстанавливается делением
a = im.max(-1)
a = np.clip((a - 0.025) / 0.975, 0, 1)
rgb = np.where(a[..., None] > 1e-3, im / np.maximum(im.max(-1, keepdims=True), 1e-3), 0)
rgb = np.clip(rgb, 0, 1)

L, C, H = lch(rgb)
_, c0, h0 = (float(v[0]) for v in lch(hx(BASE['signal'])[None, :]))
for pid, col in BASE.items():
    _, c1, h1 = (float(v[0]) for v in lch(hx(col)[None, :]))
    if pid == 'signal':
        out = rgb
    else:
        fh, fc = TUNE[pid]
        dh = (h1 - h0) * fh
        k = float(np.clip(c1 / c0 * fc, 0.3, 1.2))
        H2 = H + dh
        C2 = C * k
        lab = np.stack([L, C2 * np.cos(H2), C2 * np.sin(H2)], -1)
        out = from_oklab(lab)
    rgba = np.concatenate([out, a[..., None]], -1)
    img = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8))
    img.save(f'{OUT}/glass-{pid}.webp', quality=86, method=6)
    print(pid)
