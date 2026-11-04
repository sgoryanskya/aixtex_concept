"""Первый экран: хаос -> тёмный графит, упорядоченный пучок -> металл палитры.
Вариант А: пучок прямой. Вариант Б: к правому краю пучок спокойно скручивается в двойную прядь."""
import sys
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]] + sys.argv[3:]
from probe import *

rgb, _ = load('hero.webp')
H, W = rgb.shape[:2]
L = lum(rgb)
h, s, v = hsv(rgb)
warm = huewin(h, 2, 42) * smooth(0.25, 0.55, s) * smooth(0.06, 0.2, v)

# круглое оранжевое пятно: низкочастотная часть тёплой яркости
glowL = ndi.gaussian_filter(L * warm, 14)
Lc = np.clip(L - 0.9 * glowL, 0, 1)

X = np.arange(W)[None, :] / W
Y = np.arange(H)[:, None] / H
w_o = np.broadcast_to(smooth(0.50, 0.66, X), (H, W))

YC, HH = 537.0, 140.0  # центр и полувысота пучка у правого края (замер)

def twist(src, turns=1.1, x0=0.62):
    """Пучок делится на две пряди, которые спокойно обвивают друг друга к правому краю."""
    out = src.copy()
    xs = np.arange(int(x0 * W), W)
    q = (xs / W - x0) / (1 - x0)
    th = 2 * np.pi * turns * q ** 1.5
    R = HH / 2 * (1 + 0.38 * smooth(0, 0.35, q))
    yy = np.arange(H)[:, None].astype(float)
    layers = []
    for sgn in (-1, 1):
        c = YC + sgn * R * np.cos(th)
        z = -sgn * np.sin(th)
        half = HH / 2 * (0.72 + 0.28 * np.abs(np.cos(th))) * (1 + 0.1 * z)
        u = (yy - c[None, :]) / half[None, :]
        cov = np.clip((1 - np.abs(u)) * half[None, :] / 1.2, 0, 1)
        u_src = np.clip(u, -1, 1)  # пряди круглые: порядок волокон не переворачивается, швов нет
        ysrc = YC + sgn * HH / 2 + u_src * HH / 2
        val = ndi.map_coordinates(src, [ysrc, np.broadcast_to(xs[None, :], ysrc.shape).astype(float)], order=1)
        shade = 0.38 + 0.62 * ((z[None, :] + 1) / 2) ** 1.3  # дальняя прядь темнее
        layers.append((val * shade, cov, z))
    (v1, c1, z1), (v2, c2, z2) = layers
    front1 = (z1 >= z2)[None, :]
    vf = np.where(front1, v1, v2); cf = np.where(front1, c1, c2)
    vb = np.where(front1, v2, v1); cb = np.where(front1, c2, c1)
    region = vf * cf + vb * cb * (1 - cf)
    out[:, xs] = region
    return out

def accent_L(Lsrc):
    c = 1.0 * Lsrc ** 1.05
    # блики идут вдоль волокон: косая каустика, пересекающая пучок
    p1 = 0.78 + 0.035 * np.sin(Y * 23)
    p2 = 0.93 + 0.025 * np.sin(Y * 31 + 1.3)
    glint = 0.42 * np.exp(-((X - p1) / 0.035) ** 2) + 0.3 * np.exp(-((X - p2) / 0.025) ** 2)
    return np.clip(c * (0.82 + glint), 0, 1)

def compose(Lsrc, p, dim_chaos=0.75):
    graphite = np.repeat((Lc * dim_chaos)[..., None], 3, -1) * np.array([0.94, 0.97, 1.0])
    metal = gmap(accent_L(Lsrc), p)
    out = graphite * (1 - w_o[..., None]) + metal * w_o[..., None]
    # свет вдоль волокон в точке схода вместо круглого пятна
    conv = np.exp(-((X - 0.585) / 0.07) ** 2) * np.exp(-((Y - YC / H) / 0.16) ** 2)
    streak = np.clip(ndi.gaussian_filter(Lsrc * conv, (3, 90)) * 4.2, 0, 1)
    # сигнал в точке схода: исходное свечение A, перекрашенное в палитру и вытянутое вдоль пучка
    glow = np.clip(ndi.gaussian_filter(glowL, (10, 40)) * 1.5, 0, 1)
    light = gmap(np.clip(0.5 * glow + 0.55 * streak, 0, 1), p) * np.clip(glow + streak, 0, 1)[..., None]
    out = 1 - (1 - out) * (1 - light)
    return out

if __name__ == '__main__':
    Lb = twist(Lc)
    for pid, p in PAL.items():
        save(compose(Lc, p), f'{OUT}/hero-A-{pid}.png')
        save(compose(Lb, p), f'{OUT}/hero-B-{pid}.png')
        print('ok', pid)
