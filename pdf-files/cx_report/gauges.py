"""Gauges drawn from the original brand artwork so geometry matches the approved design exactly."""
import base64, io, math, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
BLUE, DARK = (0, 156, 222), (99, 102, 106)
_cache = {}

def _segments():
    art = np.array(Image.open(ROOT / 'assets/nps_fan_art.png').convert('RGBA'))
    core = art[..., 3] >= 250                                             # drop the translucent halo / shadow around the artwork, keep anti-aliased segment edges
    near = core.copy()
    for _ in range(3):
        near = near | np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
    art[..., 3] = np.where(near, art[..., 3], 0)
    lab = np.array(Image.open(ROOT / 'assets/nps_fan_labels.png'))      # 1..15, left to right
    H, W = lab.shape; yy, xx = np.mgrid[0:H, 0:W]
    cents = [(xx[lab == i].mean(), yy[lab == i].mean()) for i in range(1, int(lab.max()) + 1)]
    P = np.array(cents); A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    c = np.linalg.lstsq(A, (P ** 2).sum(axis=1), rcond=None)[0]; cx, cy = c[0], c[1]
    ang = np.degrees(np.arctan2(cy - yy, xx - cx))
    return art, lab, ang

def fan_uri(pct, off=None):
    """Fan with `pct` of its length filled blue, rounded to the nearest whole segment (15 segments)."""
    pct = max(0.0, min(100.0, float(pct))); off = tuple(off or DARK); key = (round(pct, 2), off)
    if key in _cache: return _cache[key]
    art, lab, ang = _segments(); n = int(lab.max()); k = int(pct / 100 * n + 0.5)      # nearest whole segment
    out = art.copy(); out[..., :3] = off
    for i in range(1, n + 1):
        if i <= k: out[lab == i, :3] = BLUE
    buf = io.BytesIO(); Image.fromarray(out).save(buf, 'PNG')
    _cache[key] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    return _cache[key]

def fan_tag(pct, x, y, w, h, off=None):
    return f'<img src="{fan_uri(pct, off)}" style="position:absolute;left:{x}pt;top:{y}pt;width:{w}pt;height:{h}pt" alt="">'

def bands_tag(x, y, w, h):
    return f'<img src="assets/ces_bands_art.png" style="position:absolute;left:{x}pt;top:{y}pt;width:{w}pt;height:{h}pt" alt="">'

def pivot(x, y, w, h):
    """Needle pivot for a CES gauge artwork placed at (x, y, w, h) - matches the original hub position."""
    return (x + 0.4968 * w, y + 0.8125 * h)
