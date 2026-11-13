"""One-page CSAT / NPS / CES reports (approved one-page format). Same data file as the annual report."""
import html, json, math, pathlib, re
import build_report as B
import gauges

ROOT = pathlib.Path(__file__).resolve().parent
FONTS = {'Prelo-Book': "'Prelo 1 Light'", 'Prelo-Medium': "'Prelo 1 Medium'", 'Prelo-SemiBold': "'Prelo 1 Semi-Bold'", 'Prelo-Bold': "'Prelo 1 Bold'", 'DejaVuSans': "'DejaVu Sans'"}
GREEN, LGREEN, BLUE, GREY, DGREY, RED, TXT = B.GREEN, B.LGREEN, B.BLUE, B.GREY, B.DGREY, B.RED, '#63666A'
esc = lambda s: html.escape(s, quote=False)
NAMES = {'csat': 'CSAT', 'nps': 'NPS', 'ces': 'CES'}
Q = {'csat': 'How satisfied are you with the overall quality of services provided by RSM in Kuwait?',
     'nps': 'On a scale from 0 to 10, how likely are you to recommend RSM in Kuwait to a colleague or business associate?',
     'ces': 'To what extent do you agree: RSM in Kuwait made it easy for me to get the service and support I needed?'}

class Doc:
    def __init__(s, kind):
        s.items = [dict(i, used=False) for i in json.loads((ROOT / 'layouts' / f'v3_{kind}.json').read_text())]
        s.pre, s.out, s.post = [], [], []
    def find(s, text, near, tol=6, size=None):
        c = [i for i in s.items if not i['used'] and i['text'].strip() == text and abs(i['x0'] - near[0]) <= tol and abs(i['y0'] - near[1]) <= tol]
        assert c, (text, near)
        c.sort(key=lambda i: abs(i['x0'] - near[0]) + abs(i['y0'] - near[1])); return c[0]
    def span(s, it, text, anchor='l', size=None, color=None, font=None):
        size = size or it['size']; fam = FONTS.get(font or it['font'], "'Prelo 1 Light'")
        x = {'l': it['x0'], 'c': (it['x0'] + it['x1']) / 2, 'r': it['x1']}[anchor]
        tr = {'l': '', 'c': 'transform:translateX(-50%);', 'r': 'transform:translateX(-100%);'}[anchor]
        return f'<div class="s" style="left:{x:.2f}pt;top:{it["oy"]-size:.2f}pt;font-size:{size}pt;font-family:{fam};color:{color or it["color"]};{tr}">{text}</div>'
    def bind(s, text, near, new, anchor='l', size=None, color=None, tol=6):
        it = s.find(text, near, tol); it['used'] = True; base = size or it['size']
        if len(new) >= 4 and base >= 19: size = round(base * 0.68, 1)
        elif len(new) >= 4 and base >= 14: size = round(base * 0.72, 1)
        elif len(new) >= 16 and 9 < base < 14: size = round(base * 0.85, 1)
        s.out.append(s.span(it, esc(new), anchor, size, color))
    def drop(s, text, near, tol=6): s.find(text, near, tol)['used'] = True
    def take_line(s, y, tol=2.5):
        L = sorted([i for i in s.items if not i['used'] and abs(i['y0'] - y) <= tol], key=lambda i: i['x0'])
        assert L, y
        for i in L: i['used'] = True
        return L
    def flow(s, x, base, width, size, lh, runs, color=TXT):
        top = base - size - (lh - 1.25 * size) / 2
        body = ''.join(f'<span style="font-family:{FONTS["Prelo-Bold" if b else "Prelo-Book"]}">{esc(t)}</span>' for t, b in runs)
        s.out.append(f'<div class="s" style="white-space:normal;left:{x}pt;top:{top:.2f}pt;width:{width}pt;font-size:{size}pt;line-height:{lh}pt;color:{color}">{body}</div>')

def arrow_inline(color, up=True, s=7):
    rot = '' if up else ' transform="rotate(90 4 4)"'
    return (f'<svg width="{s}pt" height="{s}pt" viewBox="0 0 8 8" style="flex:none"><g{rot}><path d="M1 7 L7 1 M2.4 1 H7 V5.6" fill="none" stroke="{color}" stroke-width="1.4" '
            f'stroke-linecap="round" stroke-linejoin="round"/></g></svg>')

def pill(x, y, w, h, bg, fg, text, up, size, arrow_col):
    if not up: bg, fg, arrow_col = RED, '#fff', '#fff'
    return (f'<div style="position:absolute;left:{x}pt;top:{y}pt;min-width:{w}pt;height:{h}pt;padding:0 7pt;box-sizing:border-box;background:{bg};display:flex;align-items:center;justify-content:center;gap:3pt;'
            f'color:{fg};font:{size}pt/1 \'Prelo 1 Light\';white-space:nowrap">{arrow_inline(arrow_col, up)}<span>{esc(text)}</span></div>')

def donut(cx, cy, R, thick, segs):
    mid = R - thick / 2; C = 2 * math.pi * mid; tot = sum(v for v, _ in segs) or 1; a = 0; ring = ''; labels = ''
    for v, col in segs:
        f = v / tot
        if f <= 0: continue
        ring += (f'<circle cx="{cx}" cy="{cy}" r="{mid}" fill="none" stroke="{col}" stroke-width="{thick}" stroke-dasharray="{C*f:.3f} {C:.3f}" transform="rotate({a*360-90:.3f} {cx} {cy})"/>')
        th = (a + f / 2) * 2 * math.pi; inside = f >= 0.06; rr = mid if inside else R + 6
        lx, ly = cx + rr * math.sin(th), cy - rr * math.cos(th)
        labels += (f'<div class="s" style="left:{lx:.1f}pt;top:{ly-(3.6 if inside else 3):.1f}pt;font-size:{7 if inside else 5}pt;transform:translateX(-50%);color:{"#fff" if inside else "#000"};font-family:\'Prelo 1 Light\'">{v}%</div>')
        a += f
    return B.svg(0, 0, 1, 1, ring), labels

def needle_aimed(px, py, cx, cy, rmid, score, frac=0.62):
    edges, angs = [1, 2.5, 3.5, 4.5, 5.5, 7], [181, 143.5, 108.3, 73.2, 36.1, -3]
    sc = min(7, max(1, score)); j = 4 if sc >= 7 else max(i for i in range(5) if sc >= edges[i])
    th = math.radians(angs[j] + (sc - edges[j]) / (edges[j + 1] - edges[j]) * (angs[j + 1] - angs[j]))
    tx, ty = cx + rmid * math.cos(th), cy - rmid * math.sin(th); ex, ey = px + (tx - px) * frac, py + (ty - py) * frac
    return B.svg(0, 0, 1, 1, f'<line x1="{px}" y1="{py}" x2="{ex:.2f}" y2="{ey:.2f}" stroke="{DGREY}" stroke-width="2.2" stroke-linecap="round"/>'
                 f'<circle cx="{px}" cy="{py}" r="4" fill="#fff" stroke="{DGREY}" stroke-width="2"/>')

def render_html(kind, d):
    s0 = B.datetime.date.fromisoformat(d['period']['start_date']); e0 = B.datetime.date.fromisoformat(d['period']['end_date'])
    f = lambda x: f'{x.day} {x.strftime("%B %Y")}'
    p = dict(start=f(s0), end=f(e0), ey=e0.year, fy=f'{s0.year}–{str(e0.year)[2:]}')
    m, warns = B.metrics(d); rs = m['resp']; M = m[kind]; up = M['up']; period = f"{p['start']} – {p['end']}"; D = Doc(kind); delta = M['delta_txt']
    for w in warns: print('WARNING:', w)
    T = {'ces': ((60, 209), (236, 209), (61, 274), (236, 274)), 'csat': ((62, 204), (237, 204), (62, 270), (237, 270)), 'nps': ((62, 201), (237, 201), (62, 267), (237, 267))}[kind]
    tile4 = {'ces': ('462', M.get('easy')), 'csat': ('461', M.get('pos')), 'nps': ('391', M.get('p'))}[kind]
    D.bind('648', T[0], str(rs['sent'])); D.bind('471', T[1], str(rs['recv'])); D.bind('73%', T[2], f"{rs['rate']}%"); D.bind(tile4[0], T[3], str(tile4[1]))
    # question box
    qpos = {'ces': (41, 345, 366), 'csat': (38, 349, 370), 'nps': (46, 346, 367)}[kind]
    q = D.take_line(qpos[1], 3)[0]; r_ = D.take_line(qpos[2], 3)[0]
    D.flow(q['x0'], q['oy'] - 9, 435, 11, 12.6, [(Q[kind], True)], color=TXT)
    tg = M.get('target', M.get('target_txt'))
    rated = {'csat': f"Rated on a 1–5 scale at engagement milestones. Target: {tg}% or above.", 'nps': f"Rated on a 0–10 scale at engagement milestones. Target: {tg}.",
             'ces': f"Rated on a 1–7 scale at engagement milestones. Target: {tg} or above."}[kind]
    D.flow(r_['x0'], r_['oy'], 480, 11, 13, [(rated, False)])
    A = D.pre.append
    # ---- per-type content
    if kind == 'csat':
        D.bind('98%', (390, 229), f"{M['pct']}%", 'r', size=31); D.drop('+ 1 %', (412, 272))
        A(B.svg(0, 0, 1, 1, B.ring(506.2, 249.5, 35.85, 4.5, M['pct'] / 100, GREEN, '#666665')) + '<img src="assets/csat_smiley_v3.png" style="position:absolute;left:481pt;top:224.3pt;width:50.4pt;height:50.4pt" alt="">')
        D.post.append(pill(395.7, 271.6, 45.9, 15.6, '#4E9D2D', '#fff', delta, up, 8.5, '#fff'))
        l = D.take_line(432, 2.5); D.flow(l[0]['x0'], l[0]['oy'], 520, 12, 15, [(f"{M['pos']} of {M['total']}", True), (f" clients rated their experience as satisfied or very satisfied. Target: {M['target']}% or above.", False)])
        D.bind('98%', (70, 496), f"{M['pct']}%", 'c', size=36, tol=12)
        for t, near in (('20%', (59, 464)), ('2%', (36, 503)), ('78%', (143, 572))): D.drop(t, near)
        D.drop('+ 1 %', (98, 539)); cy, tint, py = 521.9, '#EBF5EA', 538
        segs = list(zip(M['pcts'], (GREEN, LGREEN, BLUE, GREY)))
        for t, near, k in (('366', (199, 499), 'vs'), ('95', (295, 499), 's'), ('9', (406, 499), 'n'), ('1', (512, 499), 'd')): D.bind(t, near, str(M[k]), 'c')
        D.bind('366 + 95 =', (64, 608), f"{M['vs']} + {M['s']} =", 'r'); D.bind('461', (127, 604), str(M['pos']), 'r'); D.bind('471', (283, 605), str(M['total']), 'r'); D.bind('98%', (452, 603), f"{M['pct']}%", 'r')
    elif kind == 'nps':
        D.bind('81%', (444, 249), f"{M['score']}%", 'c', size=26); D.drop('+ 19%', (460, 283))
        A(gauges.fan_tag(M['score'], 397.8, 201.4, 137.4, 78.1) + '<img src="assets/thumbs_up.png" style="position:absolute;left:458pt;top:233.6pt;width:17pt;height:17.5pt" alt="">')
        D.post.append(pill(445.9, 282.2, 41.7, 15.6, BLUE, '#fff', delta, up, 8.5, '#fff'))
        l = D.take_line(434, 2.5); D.flow(l[0]['x0'], l[0]['oy'], 520, 12, 15, [(f"{M['p']}", True), (f" {'promoter' if M['p'] == 1 else 'promoters'} and ", False), (f"{M['d']}", True), (f" {'detractor' if M['d'] == 1 else 'detractors'} from {M['total']} responses. Target: {M['target']}.", False)])
        D.bind('81%', (74, 498), f"{M['score']}%", 'c', size=36, tol=12)
        for t, near in (('2%', (97, 455)), ('15%', (62, 465)), ('83%', (134, 579))): D.drop(t, near)
        D.drop('+ 19%', (97, 541)); cy, tint, py = 523.9, '#E5F5FC', 540
        segs = [(M['p_pct'], GREEN), (M['n_pct'], BLUE), (M['d_pct'], GREY)]
        for t, near, k in (('391', (234, 502), 'p'), ('69', (371, 502), 'n'), ('11', (508, 502), 'd')): D.bind(t, near, str(M[k]), 'c')
        for t, near, new in (('Rated (5)', (231, 542), 'Rated (9–10)'), ('Rated (4)', (363, 542), 'Rated (7–8)'), ('Rated (1-3)', (491, 542), 'Rated (0–6)')): D.bind(t, near, new, 'c')
        for t, near, new in (('Promoters (5)', (227, 570), 'Promoters (9–10)'), ('Neutral (4)', (368, 570), 'Neutral (7–8)'), ('Detractors (1-3)', (488, 570), 'Detractors (0–6)')): D.bind(t, near, new)
        D.bind('(391 ÷ 471) × 100 =', (64, 607), f"({M['p']} ÷ {M['total']}) × 100 =", 'r'); D.bind('83%', (155, 603), f"{M['p_pct']}%", 'r')
        D.bind('(11 ÷ 471) × 100 =', (277, 607), f"({M['d']} ÷ {M['total']}) × 100 =", 'r'); D.bind('2%', (358, 603), f"{M['d_pct']}%", 'r'); D.bind('81%', (475, 601), f"{M['score']}%", 'r')
    else:
        D.bind('4.8', (379, 234), M['score_txt'], size=30); D.drop('+ 0.2 pt', (393, 272))
        A(gauges.bands_tag(440.1, 216.8, 113.6, 72.5) + needle_aimed(493.15, 274.2, 496.5, 286.2, 46.6, M['score']))
        for t, near, new in (('1', (453, 263), '1–2'), ('2', (468, 241), '3'), ('3', (493, 233), '4'), ('4', (518, 241), '5'), ('5', (535, 262), '6–7')): D.bind(t, near, new, 'c', size=9 if '–' in new else 13)
        D.post.append(pill(377.9, 270.6, 49.7, 15.6, DGREY, '#fff', delta, up, 8.5, '#fff'))
        l = D.take_line(428, 2.5); D.flow(l[0]['x0'], l[0]['oy'], 520, 12, 15, [(f"{M['easy']} of {M['total']}", True), (f" clients rated the engagement experience as easy or very easy. Target: {M['target_txt']} or above.", False)])
        D.bind('4.8', (80, 491), M['score_txt'], 'c', size=36, tol=12)
        for t, near in (('20%', (60, 458)), ('2%', (36, 497)), ('78%', (143, 566))): D.drop(t, near)
        D.drop('+ 0.2 pt', (96, 533)); cy, tint, py = 516.5, '#EBF5EA', 532.5
        segs = list(zip(M['pcts'], (GREEN, LGREEN, BLUE, DGREY, GREY)))
        for t, near, k in (('368', (189, 503), 'c5'), ('94', (274, 504), 'c4'), ('9', (358, 503), 'c3'), ('0', (437, 504), 'c2'), ('0', (516, 503), 'c1')): D.bind(t, near, str(M[k]), 'c')
        for t, near, new in (('Rated (5)', (188, 536), 'Rated (6–7)'), ('Rated (4)', (267, 536), 'Rated (5)'), ('Rated (3)', (347, 536), 'Rated (4)'), ('Rated (2)', (426, 536), 'Rated (3)'), ('Rated (1)', (506, 536), 'Rated (1–2)')): D.bind(t, near, new, 'c')
        for t, near, new in (('Very Easy (5)', (180, 554), 'Very Easy (6–7)'), ('Easy (4)', (274, 554), 'Easy (5)'), ('Neutral (3)', (348, 554), 'Neutral (4)'), ('Difficult (2)', (426, 554), 'Difficult (3)'), ('Very Difficult  (1)', (497, 554), 'Very Difficult (1–2)')): D.bind(t, near, new)
        D.bind('2243', (90, 590), str(M['sum']), 'r')
        for t, near, k, rng in (('(368 clients × 5)', (134, 592), 'c5', '6–7'), ('(94 clients × 4)', (227, 592), 'c4', '5'), ('(9 clients × 3)', (314, 592), 'c3', '4'), ('(0 clients × 2)', (390, 592), 'c2', '3'), ('(0 clients × 1)', (465, 592), 'c1', '1–2')):
            D.bind(t, near, f"({M[k]} clients, {rng})", 'r', size=5.3)
        for t, near, k in (('1840', (179, 590), 'p5'), ('376', (269, 590), 'p4'), ('27', (353, 590), 'p3'), ('0', (428, 590), 'p2'), ('0', (502, 590), 'p1')): D.bind(t, near, str(M[k]))
        D.bind('2,243', (88, 606), f"{M['sum']:,}", 'r'); D.bind('471', (277, 607), str(M['total']), 'r'); D.bind('4.8', (459, 605), M['score_txt'], 'r')
    # ---- donut (shared geometry: centre x 104.8, outer radius 62.5, inner 46.7)
    ring_svg, labels = donut(104.8, cy, 62.5, 15.8, segs)
    A(ring_svg + f'<div style="position:absolute;left:{104.8-46.7}pt;top:{cy-46.7}pt;width:93.4pt;height:93.4pt;border-radius:50%;background:#fff"></div>')
    D.out.append(labels)
    D.post.append(pill(85.3, py, 39, 12.4, tint, TXT, delta, up, 8, GREEN))
    # ---- remaining static text
    sub = lambda t: t.replace('1 July 2025 – 30 June 2026', period).replace('RSM Kuwait', 'RSM in Kuwait')
    for it in D.items:
        if not it['used']: D.out.append(D.span(it, esc(sub(it['text']))))
    css = (ROOT / 'templates/style.css').read_text() + '\n.s{position:absolute;white-space:pre;line-height:1.25;margin:0}\n'
    body = ''.join(D.pre) + ''.join(D.out) + ''.join(D.post)
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{NAMES[kind]} Annual Report {p["fy"]}</title><style>{css}</style></head><body>'
            f'<section class="page" style="width:595.5pt;height:842.25pt"><img class="plate" style="width:595.5pt;height:842.25pt" src="plates/{kind}_v3.jpg" alt="">{body}</section></body></html>')
