"""Проба материала (бриф v3, 8.4, шаг 1): акценты A по оттенку -> основа + слой акцента -> металл палитры."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = sys.argv[1]
OUT = sys.argv[2]
IMG = ROOT + '/site/public/img/'

PAL = {
    'signal': dict(d='#4A1505', b='#E0561C', l='#FFB27A', h='#FFF1E2'),
    'olive':  dict(d='#33331A', b='#A3A256', l='#E4E2A8', h='#FBFAE8'),
    'bronze': dict(d='#4E3020', b='#A8734B', l='#F2D6AF', h='#FFF6E8'),
    'gold':   dict(d='#54472C', b='#B8A063', l='#F1E3B7', h='#FFFBEF'),
}

def hx(c):
    return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255

def mix(a, b, t):
    return a * (1 - t) + b * t

def ramp_stops(p):
    d, b, l, h = (hx(p[k]) for k in 'dblh')
    pearl_cool = hx('#C8D8E4')
    pearl_rose = hx('#F4D8DE')
    return [
        (0.00, np.zeros(3)),
        (0.08, d * 0.35),
        (0.22, d),
        (0.48, b),
        (0.64, mix(mix(b, l, 0.5), pearl_cool, 0.22)),
        (0.80, l),
        (0.90, mix(l, pearl_rose, 0.25)),
        (1.00, h),
    ]

def lut(p, n=256):
    st = ramp_stops(p)
    xs = np.array([s[0] for s in st])
    cs = np.array([s[1] for s in st])
    t = np.linspace(0, 1, n)
    return np.stack([np.interp(t, xs, cs[:, k]) for k in range(3)], -1)

def gmap(L, p):
    T = lut(p, 1024)
    i = np.clip((L * 1023).round().astype(int), 0, 1023)
    return T[i]

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def load(name):
    im = Image.open(IMG + name)
    a = np.asarray(im.convert('RGBA'), float) / 255
    return a[..., :3], a[..., 3]

def hsv(rgb):
    mx = rgb.max(-1); mn = rgb.min(-1); c = mx - mn
    s = np.where(mx > 0, c / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = c > 1e-6
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / c[rm]) % 6
    h[gm] = (b - r)[gm] / c[gm] + 2
    h[bm] = (r - g)[bm] / c[bm] + 4
    return h * 60, s, mx

def lum(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])

def huewin(h, lo, hi, soft=8):
    return smooth(lo - soft, lo, h) * (1 - smooth(hi, hi + soft, h))

def save(arr, path, alpha=None):
    arr = np.clip(arr, 0, 1)
    if arr.ndim == 2:
        arr = np.repeat(arr[..., None], 3, -1)
    if alpha is not None:
        arr = np.concatenate([arr, np.clip(alpha, 0, 1)[..., None]], -1)
    Image.fromarray((arr * 255 + 0.5).astype(np.uint8)).save(path)

def polish(L, m, gain=1.0):
    """Матовый пластик -> полированный металл в белой студии: светлая основа,
    узкая тёмная полоса отражения, резкий блик, светлый рант по кромке."""
    Ls = ndi.gaussian_filter(L, 0.7)
    w = m > 0.5
    lo, hi = np.percentile(Ls[w], 2), np.percentile(Ls[w], 99.7)
    t = np.clip((Ls - lo) / max(hi - lo, 1e-3), 0, 1)
    base = 0.30 + 0.48 * t
    band = 0.30 * np.exp(-((t - 0.42) / 0.11) ** 2)
    spec = 0.42 * smooth(0.80, 0.98, t) ** 1.5
    edge = np.clip(ndi.gaussian_gradient_magnitude(m, 1.0) * 2.5, 0, 1)
    out = base - band + spec + 0.22 * edge
    return np.clip(out * gain, 0, 1)

def split_accents(rgb, alpha=None, cyan=True):
    h, s, v = hsv(rgb)
    warm = huewin(h, 2, 42) * smooth(0.28, 0.5, s) * smooth(0.12, 0.25, v)
    cool = huewin(h, 165, 225) * smooth(0.13, 0.3, s) * smooth(0.15, 0.3, v) if cyan else np.zeros_like(h)
    # мягкий край и закрытие мелких дыр в маске
    warm = np.clip(ndi.grey_closing(warm, size=3), 0, 1)
    cool = np.clip(ndi.grey_closing(cool, size=3), 0, 1)
    return warm, cool

def neutral_base(rgb, m):
    L = lum(rgb)
    g = np.repeat(L[..., None], 3, -1)
    return rgb * (1 - m[..., None]) + g * m[..., None]

def screen(L, cool):
    """Голубой экран -> тёмное стекло с косым бликом."""
    H, W = L.shape
    yy, xx = np.mgrid[0:H, 0:W] / max(H, W)
    sheen = 0.5 + 0.5 * np.sin((xx - yy) * 40)
    g = 0.10 + 0.10 * sheen * cool
    return np.repeat(g[..., None], 3, -1) * np.array([0.95, 0.98, 1.0])

def clay(name, out, cool_to_metal=False):
    rgb, a = load(name)
    warm, cool = split_accents(rgb)
    L = lum(rgb)
    if cool_to_metal:
        # голубые огни -> металл, яркость прижата, чтобы деталь не светилась
        Lc = L * (1 - cool * 0.45)
        acc_m = np.maximum(warm, cool)
        base = neutral_base(rgb, acc_m)
        acc = polish(np.where(cool > warm, Lc, L), acc_m)
    else:
        acc_m = warm
        base = neutral_base(rgb, np.maximum(warm, cool))
        if cool.max() > 0:
            base = base * (1 - cool[..., None]) + screen(L, cool) * cool[..., None]
        acc = polish(L, warm)
    stem = name[:-5]
    np.save(f'{out}/{stem}-acc.npy', np.stack([acc, acc_m]))
    opaque = a.min() >= 1
    save(base, f'{out}/{stem}-base.png', None if opaque else a)
    save(acc, f'{out}/{stem}-accent.png', acc_m * a)
    for pid, p in PAL.items():
        col = gmap(acc, p)
        comp = base * (1 - acc_m[..., None]) + col * acc_m[..., None]
        save(comp, f'{out}/{stem}-{pid}.png', None if opaque else a)

if __name__ == '__main__':
    for n in sys.argv[3:]:
        clay(n, OUT, cool_to_metal=(n == 'assistant.webp'))
        print('ok', n)
