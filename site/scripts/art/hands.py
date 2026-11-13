"""Блок «Кто это» в палитре «Оранжевый перелив»: живая рука и рука из точек (часть 11).

python3 hands.py <hand.png> <out_dir> [preview.png]

hand.png — фото живой руки на чёрном (Figma, Nano Banana), рука входит справа, указательный палец влево.
Пишет в out_dir:
  hand-live.webp  — фото после цветокоррекции: тёплый свет перелива по нижней кромке, сиреневый по верхней;
  hand-dots.json  — рука из точек: зеркало живой руки, повёрнутое на ROT вокруг кончика пальца.
                    Точки лежат на сетке с шагом S; каждая точка — три байта (i, j, яркость) в base64.
Координаты слоя: ширина слоя = 1, высота = H_L / W_L. Живое фото стоит справа, его левый край на LIVE_X,
кончики пальцев смотрят друг на друга с зазором GAP, середина зазора — середина слоя.
"""
import base64
import json
import math
import sys

import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
prev = sys.argv[3] if len(sys.argv) > 3 else None

img = Image.open(src).convert('RGB')
PW, PH = img.size
a = np.asarray(img).astype(np.float32) / 255
lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)

# ---------- геометрия кадра ----------
mask0 = lum > 0.05
cols = np.where(mask0.any(0))[0]
TIP_U = cols.min() / PW  # кончик пальца в долях ширины фото
rows = np.where(mask0[:, cols.min():cols.min() + 3].any(1))[0]
TIP_V = rows.mean() / PH
WRIST_U = 0.715  # самое узкое место между кистью и предплечьем

GAP = 0.034  # зазор между кончиками, в ширинах фото
ROT = math.radians(-7)  # рука из точек: предплечье чуть ниже, как у Адама
LIFT = -0.012  # и чуть выше живой руки
W_L = GAP + 2 * (1 - TIP_U)  # ширина слоя в ширинах фото
H_L = PH / PW
C = W_L / 2
LIVE_X = C + GAP / 2 - TIP_U
TIP_Y = TIP_V * H_L

# ---------- живая рука: цветокоррекция ----------
m = Image.fromarray((np.clip((lum - 0.03) / 0.06, 0, 1) * 255).astype(np.uint8))
m = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
# нижняя и верхняя кромки силуэта: маска минус она же, сдвинутая внутрь
sh = 10
low = np.clip(m - np.roll(m, -sh, axis=0), 0, 1)
top = np.clip(m - np.roll(m, sh, axis=0), 0, 1)
blur = lambda x, r: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
low = blur(low, 5) * m
top = blur(top, 6) * m
OR = np.array([1.0, 0.37, 0.10], np.float32)
VI = np.array([0.73, 0.65, 1.0], np.float32)
g = a.copy()
# кожа чуть теплее и глубже, чёрное остаётся чёрным
g = g * np.array([1.0, 0.94, 0.88], np.float32)
g = np.clip((g - 0.012) / (1 - 0.012), 0, 1) ** 1.06
g += low[..., None] * OR * 0.55
g += top[..., None] * VI * 0.1
# к правому краю предплечье уходит в темноту: главное — кисть
u = np.linspace(0, 1, PW, dtype=np.float32)[None, :, None]
g *= 1 - 0.55 * np.clip((u - 0.78) / 0.22, 0, 1) ** 1.5
g = np.clip(g, 0, 1)
Image.fromarray((g * 255 + 0.5).astype(np.uint8)).save(f'{out}/hand-live.webp', quality=86, method=6)

# ---------- рука из точек ----------
S = 0.0052  # шаг сетки в ширинах слоя... задаётся в ширинах фото и переводится ниже
S_L = S / W_L
lum_s = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255
lo, hi = np.percentile(lum[mask0], [4, 99])


def sample(arr, u, v):
    x = np.clip(u * PW, 0, PW - 1.001)
    y = np.clip(v * PH, 0, PH - 1.001)
    x0 = x.astype(int)
    y0 = y.astype(int)
    fx = x - x0
    fy = y - y0
    return (arr[y0, x0] * (1 - fx) * (1 - fy) + arr[y0, x0 + 1] * fx * (1 - fy) + arr[y0 + 1, x0] * (1 - fx) * fy + arr[y0 + 1, x0 + 1] * fx * fy)


dots = []
tip_x, tip_y = C - GAP / 2, TIP_Y + LIFT  # кончик руки из точек, в ширинах фото
ni = int(C / S) + 2
nj = int(H_L / S) + 2
I, J = np.meshgrid(np.arange(ni), np.arange(nj))
X = (I + 0.5) * S
Y = (J + 0.5) * S
# обратный поворот вокруг кончика, затем зеркало: координаты исходного фото
dx, dy = X - tip_x, Y - tip_y
c, s_ = math.cos(-ROT), math.sin(-ROT)
rx = dx * c - dy * s_
ry = dx * s_ + dy * c
um = 1 - TIP_U + rx  # координата в зеркальном кадре: кончик на 1 - TIP_U
v = (TIP_Y + ry) / H_L
uo = 1 - um  # исходное фото
ok = (uo > 0) & (uo < 1) & (v > 0) & (v < 1)
mk = sample(m, uo, v) * ok
lv = np.clip((sample(lum_s, uo, v) - lo) / (hi - lo), 0, 1) ** 0.8
# предплечье растворяется к левому краю: в запястье входят линии работы
fade = np.clip((um - 0.1) / (1 - WRIST_U + 0.06 - 0.1), 0, 1) ** 1.4
b = mk * (0.1 + 0.9 * lv) * fade
sel = (mk > 0.5) & (b > 0.03)
for i, j, bb in zip(I[sel], J[sel], b[sel]):
    dots.append((int(i), int(j), int(round(min(bb, 1) * 255))))
assert max(d[0] for d in dots) < 256 and max(d[1] for d in dots) < 256
raw = bytes(x for d in dots for x in d)
wrist_um = 1 - WRIST_U
wx = tip_x + (wrist_um - (1 - TIP_U)) * math.cos(ROT)
wy = tip_y + (wrist_um - (1 - TIP_U)) * math.sin(ROT)
data = {
    'ratio': round(H_L / W_L, 5),  # высота слоя / ширина
    's': round(S_L, 6),  # шаг сетки, в ширинах слоя
    'tip': [round(C / W_L, 5), round((TIP_Y + LIFT / 2) / H_L, 5)],  # середина зазора: искра
    'tipD': [round(tip_x / W_L, 5), round(tip_y / H_L, 5)],  # кончик руки из точек
    'wrist': [round(wx / W_L, 5), round(wy / H_L, 5)],  # запястье руки из точек: сюда входят линии
    'live': [round(LIVE_X / W_L, 5), round(1 / W_L, 5)],  # левый край и ширина фото, в ширинах слоя
    'n': len(dots),
    'dots': base64.b64encode(raw).decode(),
}
json.dump(data, open(f'{out}/hand-dots.json', 'w'), separators=(',', ':'))
print('tip', TIP_U, TIP_V, 'layer', W_L, H_L, 'ratio', H_L / W_L, 'dots', len(dots), 'json', len(json.dumps(data)))

# ---------- предпросмотр: слой на тёмном фоне палитры ----------
if prev:
    LW = 1800
    LH = int(LW * H_L / W_L)
    bg = np.zeros((LH, LW, 3), np.float32) + np.array([10, 6, 5], np.float32) / 255
    live = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((int(LW / W_L), LH), Image.LANCZOS)).astype(np.float32) / 255
    x0 = int(LIVE_X / W_L * LW)
    w = min(live.shape[1], LW - x0)
    bg[:, x0:x0 + w] = np.maximum(bg[:, x0:x0 + w], live[:, :w])
    im = Image.fromarray((bg * 255).astype(np.uint8))
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    tx, ty = tip_x / W_L * LW, tip_y / H_L * LH
    wxp, wyp = wx / W_L * LW, wy / H_L * LH
    dw = math.hypot(tx - wxp, ty - wyp)
    # цвет по пути от запястья к кончику: как в hands.ts (STOPS)
    stops = [(-1, (185, 166, 255)), (-0.45, (255, 110, 142)), (0, (255, 94, 26)), (0.25, (255, 178, 94)), (0.6, (255, 222, 200)), (1, (255, 246, 240))]

    def col(t):
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t <= t1:
                k = (t - t0) / (t1 - t0)
                return tuple(int(c0[q] + (c1[q] - c0[q]) * k) for q in range(3))
        return stops[-1][1]

    step = S_L * LW
    for i, j, bb in dots:
        x = (i + 0.5) * step
        y = (j + 0.5) * step
        t = max(1 - math.hypot(x - tx, y - ty) / dw, -1)
        k = bb / 255
        r = step * (0.12 + 0.3 * k)
        cc = col(t)
        al = 0.3 + 0.7 * k
        cc = tuple(int(q * al) for q in cc)
        d.ellipse([x - r, y - r, x + r, y + r], fill=cc)
    sx, sy = C / W_L * LW, (TIP_Y + LIFT / 2) / H_L * LH
    glow = Image.new('L', im.size, 0)
    ImageDraw.Draw(glow).ellipse([sx - 10, sy - 10, sx + 10, sy + 10], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    ga = np.asarray(glow).astype(np.float32)[..., None] / 255
    arr = np.asarray(im).astype(np.float32) / 255
    arr = 1 - (1 - arr) * (1 - ga * np.array([1, 0.85, 0.7]) * 1.4)
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(prev)
