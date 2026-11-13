#!/usr/bin/env python3
"""RSM in Kuwait - Voice of Clients (CX) annual report generator.

    python build_report.py                       # uses data/report_data.json
    python build_report.py data/2026-27.json     # another data file
    python build_report.py data.json out.pdf     # custom output path

Needs:  pip install jinja2 playwright && playwright install chromium
"""
import json, math, sys, html, datetime, pathlib
from jinja2 import Environment, FileSystemLoader
import gauges

ROOT = pathlib.Path(__file__).resolve().parent
GREEN, LGREEN, BLUE, GREY, DGREY, RED = '#3F9C35', '#65B05D', '#009CDE', '#888B8D', '#63666A', '#D64545'

def plural(n, word): return f'{n} {word}' if n == 1 else f'{n} {word}s'

def rnd(x):  return int(math.floor(x + 0.5))
def rnd1(x): return math.floor(x * 10 + 0.5) / 10
def g(x):    return f'{x:g}'

def pct(num, den, rounder=rnd):
    """Percentage that tolerates an empty denominator.

    A reporting period can contain responses for one measure and none for
    another (a narrow date range, or voice answers that only capture some
    ratings). Dividing by that zero total raised ZeroDivisionError and the
    whole PDF build died with a traceback, so an empty measure now reads 0
    instead of aborting the report.
    """
    return rounder(num / den * 100) if den else 0

# ------------------------------------------------------------------ metrics
def metrics(d):
    warns = []
    r, c, n, e = d['responses'], d['csat'], d['nps'], d['ces']
    # CSAT
    cs = dict(vs=c['very_satisfied'], s=c['satisfied'], n=c['neutral'], d=c['dissatisfied'])
    cs['total'] = sum(cs.values()); cs['pos'] = cs['vs'] + cs['s']
    cs['pct'] = pct(cs['pos'], cs['total'])
    cs['pcts'] = [pct(cs[k], cs['total']) for k in ('vs', 's', 'n', 'd')]
    cs['prev'] = g(c['prev_pct']); cs['target'] = g(c['target_pct'])
    cs['delta'] = cs['pct'] - c['prev_pct']; cs['delta_txt'] = delta_txt(cs['delta'], ' pt')
    cs['_prev'] = c['prev_pct']; cs['_target'] = c['target_pct']
    # NPS
    ns = dict(p=n['promoters'], n=n['neutral'], d=n['detractors'])
    ns['total'] = sum(ns.values()); ns['p_txt'] = plural(ns['p'], 'promoter'); ns['d_txt'] = plural(ns['d'], 'detractor')
    ns['p_pct'] = pct(ns['p'], ns['total']); ns['d_pct'] = pct(ns['d'], ns['total'])
    ns['n_pct'] = pct(ns['n'], ns['total'])
    ns['score'] = pct(ns['p'] - ns['d'], ns['total'])
    ns['prev'] = g(n['prev_score']); ns['target'] = g(n['target'])
    ns['delta'] = ns['score'] - n['prev_score']; ns['delta_txt'] = delta_txt(ns['delta'], '%')
    ns['_prev'] = n['prev_score']; ns['_target'] = n['target']
    # CES
    rr = {k: e[f'rating_{k}'] for k in range(1, 8)}          # native 1-7 counts
    cc = dict(c5=rr[7] + rr[6], c4=rr[5], c3=rr[4], c2=rr[3], c1=rr[2] + rr[1])   # display groups
    cc['total'] = sum(rr.values()); cc['r'] = rr
    for k_ in ('c5', 'c4', 'c3', 'c2', 'c1'): cc[k_ + '_lbl'] = 'client' if cc[k_] == 1 else 'clients'
    cc['p5'] = 7 * rr[7] + 6 * rr[6]; cc['p4'] = 5 * rr[5]; cc['p3'] = 4 * rr[4]; cc['p2'] = 3 * rr[3]; cc['p1'] = 2 * rr[2] + rr[1]
    cc['sum'] = sum(k * v for k, v in rr.items())
    cc['score'] = rnd1(cc['sum'] / cc['total']) if cc['total'] else 0.0; cc['score_txt'] = f"{cc['score']:.1f}"
    cc['easy'] = cc['c5'] + cc['c4']   # ratings 5-7 (favourable)
    cc['pcts'] = [pct(cc[k], cc['total']) for k in ('c5', 'c4', 'c3', 'c2', 'c1')]
    cc['prev_txt'] = f"{e['prev_score']:.1f}"; cc['target_txt'] = f"{e['target']:.1f}"
    cc['delta'] = rnd1(cc['score'] - e['prev_score']); cc['delta_txt'] = delta_txt(cc['delta'], ' pt')
    cc['_prev'] = e['prev_score']; cc['_target'] = e['target']
    hard = cc['c2'] + cc['c1']
    cc['caption'] = ('No client rated the engagement experience as difficult or very difficult' if hard == 0 else
                     f"{hard} client{'s' if hard != 1 else ''} rated the engagement experience as difficult or very difficult")
    for k in ('up',): pass
    for o in (cs, ns, cc): o['up'] = o['delta'] >= 0
    # responses
    resp = dict(sent=r['surveys_sent'], recv=r['received'], rate=pct(r['received'], r['surveys_sent']),
                prev=r.get('prev_received'), prev_rate=r.get('prev_response_rate_pct'))
    for name, tot in (('CSAT', cs['total']), ('NPS', ns['total']), ('CES', cc['total'])):
        if tot != r['received']:
            warns.append(f"{name} responses ({tot}) differ from responses.received ({r['received']})")
    return dict(csat=cs, nps=ns, ces=cc, resp=resp), warns

def delta_txt(v, unit):
    v = rnd1(v) if isinstance(v, float) else v
    if v == 0: return '0' + unit
    return ('+ ' if v > 0 else '− ') + g(abs(v)) + unit

# ---------------------------------------------------------------- narrative
def narrative(m, p, d):
    cs, ns, cc, rs = m['csat'], m['nps'], m['ces'], m['resp']
    fy, pfy, a, b = p['fy'], p['prev_fy'], p['start'], p['end']
    def tgt(v, t): return 'Exceeds target.' if v > t + 1e-9 else ('Meets target.' if abs(v - t) < 1e-9 else 'Below target.')
    meets = [cs['pct'] >= cs['_target'], ns['score'] >= ns['_target'], cc['score'] >= cc['_target'] - 1e-9]
    exceeds = [cs['pct'] > cs['_target'], ns['score'] > ns['_target'], cc['score'] > cc['_target'] + 1e-9]
    impr = [cs['delta'] > 0, ns['delta'] > 0, cc['delta'] > 0]
    all_meet, all_exc, all_imp = all(meets), all(exceeds), all(impr)
    n = {}
    # response volume
    recv, prev = rs['recv'], rs['prev']
    if prev:
        if recv >= 2 * prev:
            n['resp_para'] = f"Response volume more than doubled year on year, from {prev} responses in {pfy} to {recv} in {fy}. This wider participation provides a more representative view of our client base."
            vol = ', more than doubling the prior year volume'; widened = True
        elif recv > prev:
            n['resp_para'] = f"Response volume grew year on year, from {prev} responses in {pfy} to {recv} in {fy}, providing a broader view of our client base."
            vol = ', up on the prior year'; widened = True
        elif recv == prev:
            n['resp_para'] = f"Response volume was in line with the prior year, at {recv} responses in {fy}."
            vol = ', in line with the prior year volume'; widened = False
        else:
            n['resp_para'] = f"Response volume moved from {prev} responses in {pfy} to {recv} in {fy}."
            vol = ', below the prior year volume'; widened = False
    else:
        n['resp_para'] = f"{recv} responses were received in {fy}."; vol = ''; widened = False
    pr = rs['prev_rate']
    if pr is None: rate = ''
    elif pr == rs['rate']: rate = f"The response rate held at {rs['rate']}%."
    else: rate = f"{'As outreach widened, the' if widened else 'The'} response rate moved from {pr}% to {rs['rate']}%."
    n['p7_resp'] = f"From {a} to {b}, {rs['sent']} surveys were sent and {recv} responses received{vol}. {rate} We continue to refine reminder timing and survey length to support participation.".replace('  ', ' ')
    # page 6
    dd = cs['d']
    dis = ('No dissatisfied responses were recorded.' if dd == 0 else
           'The single dissatisfied response has been followed up directly.' if dd == 1 else
           f'The {dd} dissatisfied responses have been followed up directly.')
    n['csat_para'] = (f"A CSAT of {cs['pct']}% reflects steady service quality across the year. The result is drawn from {cs['pos']} of {cs['total']} responses rating the experience as satisfied or very satisfied. {dis} "
                      "In line with ongoing efforts, we remain focused on sustaining this level through consistent delivery and clear communication.")
    n['nps_para'] = (f"An NPS of {ns['score']}% indicates a base of client advocates, with {ns['p_txt']} compared to {ns['d_txt']}. This reflects strong trust built through consistent service across engagements. "
                     "We continue to focus on supporting satisfied clients to become active advocates through closer engagement and clear communication.")
    n['ces_para'] = (f"A CES of {cc['score_txt']} suggests clients find it effortless to work with us, supported by proactive, clear communication and consistent follow-up with automated reminders. "
                     f"The distribution sits at the easier end of the scale, with {cc['easy']} of {cc['total']} responses rating the experience 5 or higher. This points to clear communication and responsive client-facing teams. "
                     "We aim to sustain this during peak periods through greater visibility of engagement status.")
    # page 7
    if all_imp and all_meet:
        first = f"The {fy} results reflect steady progress across all three measures tracked."
        third = f"Each measure improved on the prior year and {'exceeded' if all_exc else 'met or exceeded'} the target set for the period."
        last = "Taken together, the findings indicate a consistent foundation in service quality, client trust and ease of working."
    else:
        first = f"The {fy} results across the three measures tracked are summarised below."
        third = f"{sum(impr)} of 3 measures improved on the prior year and {sum(meets)} of 3 met or exceeded the target set for the period."
        last = "Taken together, the findings show where we are performing well and where we can do better."
    n['p7_intro'] = (f"{first} RSM in Kuwait achieved a client satisfaction rate of {cs['pct']}%, a Net Promoter Score of {ns['score']}% and a Customer Effort Score of {cc['score_txt']} out of 7. {third} {last}")
    n['p7_sub'] = ('Our performance reflects a strong year across all three measures. The context for each result is outlined below.'
                   if all_meet else 'The context for each result is outlined below.')
    def pts(v): v = abs(v); return 'one percentage point' if v == 1 else f'{g(v)} percentage points'
    c_cmp = (f"an improvement of {pts(cs['delta'])} on the prior year" if cs['delta'] > 0 else
             'unchanged from the prior year' if cs['delta'] == 0 else f"a decline of {pts(cs['delta'])} from the prior year")
    n['csat_blurb'] = (f"{tgt(cs['pct'], cs['_target'])} {cs['pos']} of {cs['total']} clients rated their experience as satisfied or very satisfied, {c_cmp}. "
                       "The focus is to sustain this through consistent execution and clear communication.")
    if ns['delta'] > 0: nv = f"improves on the prior year result of {ns['prev']}% by {ns['delta']}%"
    elif ns['delta'] == 0: nv = f"matches the prior year result of {ns['prev']}%"
    else: nv = f"is down from the prior year result of {ns['prev']}% by {abs(ns['delta'])}%"
    n['nps_blurb'] = (f"{tgt(ns['score'], ns['_target'])} An NPS of {ns['score']}% {nv}, with {ns['p_txt']} and {ns['d_txt']} from {ns['total']} responses. "
                      "The focus is to support satisfied clients in becoming active advocates through closer engagement.")
    e_cmp = (f"an improvement of {abs(cc['delta']):.1f} on the prior year" if cc['delta'] > 0 else
             'unchanged from the prior year' if cc['delta'] == 0 else f"a decline of {abs(cc['delta']):.1f} from the prior year")
    n['ces_blurb'] = (f"{tgt(cc['score'], cc['_target'])} {cc['easy']} of {cc['total']} responses sit at the easier end of the scale, {e_cmp}. "
                      "The focus is to sustain this during peak periods through proactive communication while leveraging technology to auto-remind clients of milestone.")
    # page 11
    lead = ('Building on results that exceeded targets across all three measures' if all_exc else
            'Building on results that met or exceeded targets across all three measures' if all_meet else
            "Building on this year's results")
    n['conclusion'] = (f"{lead}, we plan to address areas for improvement and continue to earn the trust our clients place in us. "
                       "With the dedication of our teams, we aim to turn these insights into meaningful action over the year ahead.")
    n['how_rate'] = 'CSAT on a 1–5 scale, CES on a 1–7 scale and NPS on a 0–10 scale.'
    n['nps_method'] = ('NPS in this report uses the standard global 0–10 scale. Promoters rate 9–10, neutral respondents 7–8 and detractors 0–6. '
                       'NPS = % Promoters − % Detractors, shown in whole percentage points.')
    n['ces_method'] = ('CES in this report uses a 1–7 agreement scale. Ratings of 6–7 are shown as Very Easy, 5 as Easy, 4 as Neutral, 3 as Difficult and 1–2 as Very Difficult. '
                       'CES is the mean of all ratings, with higher scores indicating that clients find it easier to work with us.')
    n.update(d.get('text_overrides') or {})
    return n

# ------------------------------------------------------------------ graphics
def svg(x, y, w, h, inner):
    return f'<svg class="abs" style="left:{x}pt;top:{y}pt;overflow:visible" width="{w}pt" height="{h}pt" viewBox="0 0 {w} {h}">{inner}</svg>'

def ring(cx, cy, r, sw, frac, fill, track, rot=-90):
    C = 2 * math.pi * r; frac = max(0, min(1, frac))
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{fill}" stroke-width="{sw}" stroke-dasharray="{C*frac:.2f} {C:.2f}" transform="rotate({rot} {cx} {cy})"/>')

def arrow(x, y, up=True, color=GREEN, s=7.5):
    rot = '' if up else f' transform="rotate(90 {s/2} {s/2})"'
    return svg(x, y, s, s, f'<g{rot}><path d="M0.8 {s-0.8} L{s-0.8} 0.8 M{s*0.3} 0.8 H{s-0.8} V{s*0.7}" fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g>')

def inline_arrow(up=True, color=GREEN, s=7.5):
    """Arrow SVG with absolute positioning stripped for flex/inline layouts (Py3.9-safe)."""
    return arrow(0, 0, up, color, s).replace(
        'class="abs" style="left:0pt;top:0pt;', 'style="position:static;'
    )

def launch_chromium(pw):
    """Headless Chromium args required on many VPS hosts."""
    return pw.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
    )


def csat_gauge(x, y, size, pct):
    k = size / 100.1; c = 50.05
    inner = ring(c, c, 31.85, 4.9, pct / 100, LGREEN, GREY)
    inner += f'<circle cx="{c}" cy="{c}" r="29.4" fill="#fff"/>'
    inner += f'<image href="assets/image22.png" x="{c-22.05}" y="{c-22.05}" width="44.1" height="44.1"/>'
    return svg(x, y, size, size, f'<g transform="scale({k})">{inner}</g>')

def fan(cx, cy, R, r, n, filled, on=BLUE, off=DGREY, gap=1.8):
    step = 180 / n; out = ''
    for i in range(n):
        a0 = math.radians(180 - i * step - gap / 2); a1 = math.radians(180 - (i + 1) * step + gap / 2)
        P = lambda rr, a: f'{cx + rr*math.cos(a):.2f} {cy - rr*math.sin(a):.2f}'
        out += (f'<path d="M{P(R,a0)} A{R} {R} 0 0 1 {P(R,a1)} L{P(r,a1)} A{r} {r} 0 0 0 {P(r,a0)} Z" fill="{on if i < filled else off}"/>')
    return out

def nps_fan(cx, cy, R, score):
    n = 14; filled = max(0, min(n, math.ceil(score / 100 * n)))
    return svg(0, 0, 1, 1, fan(cx, cy, R, R * 0.67, n, filled))

def needle(cx, cy, L, score):
    edges, angs = [1, 2.5, 3.5, 4.5, 5.5, 7], [181, 143.5, 108.3, 73.2, 36.1, -3]   # band edges on the 1-7 scale
    sc = min(7, max(1, score)); j = max(i for i in range(5) if sc >= edges[i]) if sc < 7 else 4
    th = math.radians(angs[j] + (sc - edges[j]) / (edges[j + 1] - edges[j]) * (angs[j + 1] - angs[j]))
    tx, ty = cx + L * math.cos(th), cy - L * math.sin(th)
    return svg(0, 0, 1, 1, f'<line x1="{cx}" y1="{cy}" x2="{tx:.2f}" y2="{ty:.2f}" stroke="{DGREY}" stroke-width="2.4" stroke-linecap="round"/>'
                           f'<circle cx="{cx}" cy="{cy}" r="5.2" fill="{DGREY}"/><circle cx="{cx}" cy="{cy}" r="2" fill="#fff"/>')

def dl(right, top, up, text):
    return (f'<div class="dl" style="left:{right-110}pt;top:{top}pt;width:110pt;height:14pt">'
            f'{inline_arrow(up,GREEN if up else RED)}'
            f'<span>{html.escape(text)}</span></div>')

def pill(cx, y, bg, up, text, w=60):
    col = GREEN if up else RED; bgc = bg if up else '#FBE9E9'
    return (f'<div class="pill" style="left:{cx-w/2}pt;top:{y}pt;width:{w}pt;background:{bgc};color:{DGREY}">'
            f'{inline_arrow(up,col,6.5)}<span>{html.escape(text)}</span></div>')

def sbar(x, y, W, segs, min_w=25.1):
    """segs: [(pct, colour)] - widths = minimum + proportional share"""
    tot = sum(p for p, _ in segs) or 1; free = W - len(segs) * min_w
    cells = ''.join(f'<div style="width:{min_w + free*p/tot:.2f}pt;background:{c}">{p}%</div>' for p, c in segs)
    return f'<div class="sbar" style="left:{x}pt;top:{y}pt;width:{W}pt">{cells}</div>'

def face(n): return f'assets/{ {5:"image62",4:"image45",3:"image49",2:"image53",1:"image47"}[n] }.png'

def minicards(m):
    cs, ns, cc = m['csat'], m['nps'], m['ces']
    h = ''
    # CSAT card
    cols = [(cs['vs'], GREEN, 'Very satisfied (5)'), (cs['s'], LGREEN, 'Satisfied (4)'), (cs['n'], BLUE, 'Neutral (3)'), (cs['d'], GREY, 'Dissatisfied (1-2)')]
    mx = max(c[0] for c in cols) or 1; body = ''
    for i, (v, col, lab) in enumerate(cols):
        hh = max(2, 62 * v / mx)
        body += (f'<div class="col" style="left:{28+i*40}pt;top:46pt;width:38pt"><div class="n" style="color:{col}">{v}</div>'
                 f'<div style="height:62pt;width:14pt;display:flex;align-items:flex-end;margin-top:2pt"><div style="width:14pt;height:{hh}pt;background:{col}"></div></div>'
                 f'<div style="width:36pt;height:.6pt;background:#ccc;margin-top:0"></div><div class="lab">{lab}</div></div>')
    faces = ''.join(f'<img src="{face(k)}" class="abs" style="left:{41+i*40}pt;top:30pt;width:12pt;height:12pt">' for i, k in enumerate((5, 4, 3, 1)))
    h += (f'<div class="mc" style="left:74.9pt;top:112pt;width:195pt;height:122pt;transform:rotate(-3.5deg)"><div class="card"></div>'
          f'<div class="tag" style="background:#00153D;left:6pt;top:-14pt"><b style="color:{GREEN}">{cs["pct"]}%</b><span>CSAT</span></div>{faces}{body}</div>')
    # NPS card
    sg = [(ns['p_pct'], GREEN), (ns['n_pct'], BLUE), (ns['d_pct'], GREY)]
    tot = sum(p for p, _ in sg) or 1; wid = 168
    cells = ''.join(f'<div style="width:{max(14, wid*p/tot):.1f}pt;background:{c};color:#fff;font:6pt/11pt \'Prelo 1 Medium\';text-align:center">{p}%</div>' for p, c in sg)
    h += (f'<div class="mc" style="left:57.8pt;top:274.9pt;width:207.3pt;height:122.3pt"><div class="card"></div>'
          f'<div class="abs" style="left:20pt;top:24pt;font:34pt/1 \'Prelo 1 Bold\';color:{BLUE}">{ns["score"]}%</div>'
          f'<div class="abs" style="left:100pt;top:40pt;font:7.5pt \'Prelo 1 Bold\';color:{DGREY}">NPS Score</div>'
          f'<div class="abs" style="left:23pt;top:66pt;font:6.5pt \'Prelo 1 Light\';color:{DGREY};display:flex;gap:2pt;align-items:center">{inline_arrow(ns["up"],GREEN if ns["up"] else RED,6)}<span>{abs(ns["delta"]):g}% vs last period</span></div>'
          f'<div class="abs" style="left:20pt;top:84pt;display:flex;width:{wid}pt">{cells}</div>'
          f'<div class="abs" style="left:34pt;top:101pt;font:5pt \'Prelo 1 Light\';color:{DGREY};display:flex;gap:12pt"><span>● Promoters (9–10)</span><span>● Neutral (7–8)</span><span>● Detractors (0–6)</span></div></div>')
    # CES card
    cl = [(cc['c5'], GREEN, 'Very Easy (6–7)'), (cc['c4'], LGREEN, 'Easy (5)'), (cc['c3'], BLUE, 'Neutral (4)'), (cc['c2'], DGREY, 'Difficult (3)'), (cc['c1'], GREY, 'Very Difficult (1–2)')]
    body = ''
    for i, (v, col, lab) in enumerate(cl):
        pc = cc['pcts'][i]
        body += (f'<div class="col" style="left:{18+i*34}pt;top:78pt;width:34pt"><img src="{face(5-i)}" style="width:10pt;height:10pt">'
                 f'<div class="n" style="color:{col};margin-top:2pt">{v}</div><div style="width:28pt;height:2.4pt;background:#e5e5e5;margin-top:2pt"><div style="width:{pc}%;height:100%;background:{col}"></div></div>'
                 f'<div class="lab">{pc}%<br>{lab}</div></div>')
    h += (f'<div class="mc" style="left:338.1pt;top:276pt;width:194.5pt;height:132pt;transform:rotate(-3deg)"><div class="card"></div>'
          f'<div class="tag" style="background:{GREY};left:6pt;top:-8pt;width:46pt"><b>{cc["score_txt"]}</b><span>CES</span></div>{body}</div>')
    return h

def build_graphics(m, p, cx=False):
    cs, ns, cc, rs = m['csat'], m['nps'], m['ces'], m['resp']
    G = {}
    # ---- page 3
    s = '' if cx else dl(186.9, 104.4, cs['up'], cs['delta_txt']) + dl(370.0, 104.4, ns['up'], ns['delta_txt']) + dl(552.9, 104.4, cc['up'], cc['delta_txt'])
    s += csat_gauge(64.5, 151.5, 100.1, cs['pct'])
    s += gauges.fan_tag(ns['score'], 234.5, 172.3, 126.3, 71.9)
    s += needle(480.7, 227.1, 36, cc['score'])
    s += svg(188.3, 443.1, 125, 125, ring(62.5, 62.5, 46.45, 9.1, rs['rate'] / 100, GREEN, '#00153D'))
    G['p03'] = s
    G['p04'] = minicards(m)
    # ---- page 5
    pc = cs['pcts']; s = sbar(76.1, 213.9, 443.1, list(zip(pc, (GREEN, LGREEN, BLUE, GREY))))
    s += sbar(76.1, 471.4, 443.1, [(ns['p_pct'], GREEN), (ns['n_pct'], BLUE), (ns['d_pct'], GREY)], 42.7)
    s += sbar(76.1, 728.8, 443.1, list(zip(cc['pcts'], (GREEN, LGREEN, BLUE, DGREY, GREY))))
    if not cx: s += pill(99.3, 188.1, '#EBF5EA', cs['up'], cs['delta_txt']) + pill(112.2, 445.8, '#E5F5FC', ns['up'], ns['delta_txt']) + pill(78.85, 697.0, '#F3F3F3', cc['up'], cc['delta_txt'])
    G['p05'] = s
    # ---- page 6
    s = csat_gauge(63.1, 177.9, 107.4, cs['pct']) + gauges.fan_tag(ns['score'], 408.8, 368.2, 140.4, 80) + needle(116.15, 638.85, 40, cc['score'])
    G['p06'] = s
    # ---- page 7
    s = ''
    prev, cur = cs['_prev'], cs['pct']
    lo, hi = math.floor(min(prev, cur)), math.ceil(max(prev, cur))
    if lo == hi: lo -= 1
    yv = lambda v: 327.7 - (v - lo) * (327.7 - 284.4) / (hi - lo)
    base = 371.1
    pts = f'59,{yv(prev):.2f} 204,{yv(cur):.2f} 204,{base} 59,{base}'
    ch = (f'<polygon points="{pts}" fill="{BLUE}"/>'
          f'<line x1="59" y1="{yv(hi):.2f}" x2="204" y2="{yv(hi):.2f}" stroke="#666665" stroke-width=".6" stroke-dasharray="3 2"/>'
          f'<line x1="59" y1="{yv(lo):.2f}" x2="204" y2="{yv(lo):.2f}" stroke="#666665" stroke-width=".6" stroke-dasharray="3 2"/>'
          f'<line x1="59" y1="276.6" x2="59" y2="{base}" stroke="#666665" stroke-width=".6"/><line x1="59" y1="{base}" x2="211.9" y2="{base}" stroke="#666665" stroke-width=".6"/>')
    s += svg(0, 0, 1, 1, ch)
    for v in (hi, lo):
        s += f'<div class="abs" style="left:20pt;width:33.2pt;text-align:right;top:{yv(v)-5.5:.2f}pt;font:7pt \'Prelo 1 Bold\';color:#666665">{g(v)}%</div>'
    ty = yv(cur) + 8
    s += (f'<div class="abs" style="left:100pt;width:100pt;top:{ty:.2f}pt;display:flex;align-items:center;justify-content:flex-end;gap:3pt;font:10.14pt \'Prelo 1 Light\';color:#fff;white-space:nowrap">'
          f'{inline_arrow(cs["up"],"#fff",6)}<span>{html.escape(cs["delta_txt"])}</span></div>')
    # NPS bars
    k = 0.77; h0, h1 = max(1, min(83, ns['_prev'] * k)), max(1, min(83, ns['score'] * k)); b = 495.8
    s += svg(0, 0, 1, 1, f'<rect x="403.6" y="{b-h0:.2f}" width="65.1" height="{h0:.2f}" fill="#4E9D2D"/><rect x="483.6" y="{b-h1:.2f}" width="65.1" height="{h1:.2f}" fill="#4E9D2D"/>'
                         f'<line x1="403.6" y1="412.1" x2="403.6" y2="{b}" stroke="#666665" stroke-width=".6"/><line x1="403.6" y1="{b}" x2="556.5" y2="{b}" stroke="#666665" stroke-width=".6"/>')
    for cx, hh, v in ((436.15, h0, ns['prev']), (516.15, h1, ns['score'])):
        s += f'<div class="abs" style="left:{cx-25}pt;width:50pt;text-align:center;top:{b-hh-24.5:.2f}pt;font:15pt \'Prelo 1 Bold\';color:#666665">{v}%</div>'
    inside = h1 >= 40
    dy = b - h1 + 21 if inside else b - h1 - 40
    s += (f'<div class="abs" style="left:496.5pt;top:{dy:.2f}pt;display:flex;align-items:center;gap:3pt;font:11.66pt \'Prelo 1 Light\';color:{"#F3F3F3" if inside else "#666665"};white-space:nowrap">'
          f'{inline_arrow(ns["up"],"#F3F3F3" if inside else "#666665",6.5)}<span>{html.escape(ns["delta_txt"])}</span></div>')
    # CES rings
    s += svg(36.1, 559.2, 74.3, 74.3, ring(37.15, 37.15, 21.77, 15.44, cc['_prev'] / 7, '#A9ABAD', '#DADBDC'))
    s += svg(129.1, 549.2, 91.3, 91.3, ring(45.65, 45.65, 26.84, 18.86, cc['score'] / 7, GREY, '#DADBDC'))
    s += arrow(154.0, 543.3, cc['up'], '#222', 6.5)
    G['p07'] = s
    return G

# -------------------------------------------------------------- testimonials
def tq_html(t, top=None):
    e = lambda s: html.escape(s, quote=False)
    st = f'top:{top:.2f}pt;' if top is not None else 'position:relative;left:0;'
    return (f'<div class="tq" style="{st}">'
            f'<div class="ln" style="left:38.3pt;right:0;top:0;border-top:1.5pt solid {GREEN}"></div>'
            f'<div class="ln" style="right:0;top:0;bottom:14.4pt;border-right:1.5pt solid {GREEN}"></div>'
            f'<div class="ln" style="left:0;top:14.3pt;bottom:0;border-left:1.5pt solid {BLUE}"></div>'
            f'<div class="ln" style="left:0;right:37.3pt;bottom:0;border-bottom:1.5pt solid {BLUE}"></div>'
            f'<span class="mk" style="left:-3.3pt;top:-67.8pt;color:{BLUE}"><span style="position:relative;top:6pt">“</span></span>'
            f'<span class="mk" style="right:-3.4pt;bottom:-67.3pt;color:{GREEN};transform:rotate(180deg)"><span style="position:relative;top:6pt">“</span></span>'
            f'<p class="q">{e(t["quote"])}</p>' + (f'<p class="who">{e(t["name"])}</p>' if t.get("name") else '') + (f'<p class="co" style="margin-top:8.2pt">{e(t["company"])}</p>' if t.get("company") and not t.get("name") else (f'<p class="co">{e(t["company"])}</p>' if t.get("company") else '')) + '</div>')

def paginate(items, heights, first_top=149.8, next_top=69.2, bottom=792, gap=40):
    pages, cur, y, top = [], [], first_top, first_top
    for it, h in zip(items, heights):
        if cur and y + h > bottom:
            pages.append(cur); cur, top = [], next_top; y = top
        cur.append((it, y)); y += h + gap
    if cur: pages.append(cur)
    return pages

# --------------------------------------------------------------------- main
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    kind = next((a.split('=')[1] for a in sys.argv[1:] if a.startswith('--type=')), 'annual')
    if kind == 'partner':
        return main_partner(args)
    if kind == 'cx':
        return main_cx(args)
    if kind != 'annual':
        return main_single(kind, args)
    data_path = pathlib.Path(args[0]) if args else ROOT / 'data/report_data.json'
    d = json.loads(data_path.read_text(encoding='utf-8'))
    s = datetime.date.fromisoformat(d['period']['start_date']); e = datetime.date.fromisoformat(d['period']['end_date'])
    dfmt = lambda x: f'{x.day} {x.strftime("%B %Y")}'
    p = dict(start=dfmt(s), end=dfmt(e), sy=s.year, ey=e.year)
    p['fy'] = f'{s.year}–{str(e.year)[2:]}'; p['prev_fy'] = f'{s.year-1}–{str(e.year-1)[2:]}'
    m, warns = metrics(d)
    for w in warns: print('WARNING:', w)
    n = narrative(m, p, d); G = build_graphics(m, p)

    from playwright.sync_api import sync_playwright
    env = Environment(loader=FileSystemLoader(str(ROOT / 'templates')), autoescape=True)
    tests = d.get('testimonials', [])
    with sync_playwright() as pw:
        br = launch_chromium(pw); pg = br.new_page()
        css = (ROOT / 'templates/style.css').read_text()
        meas = f'<!doctype html><meta charset="utf-8"><style>{css}</style>' + ''.join(f'<div style="width:595pt">{tq_html(t)}</div><div style="height:60pt"></div>' for t in tests)
        (ROOT / '_measure.html').write_text(meas, encoding='utf-8')
        pg.goto((ROOT / '_measure.html').as_uri()); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        heights = pg.evaluate("[...document.querySelectorAll('.tq')].map(e=>e.getBoundingClientRect().height*0.75)")
        pages = paginate(tests, heights)
        tpages = [''.join(tq_html(t, y) for t, y in pgitems) for pgitems in pages]
        T = len(tpages)
        pn = dict(p03=4, p04=5, p05=6, p06=7, p07=8, p11=10 + T)
        html_out = env.get_template('report.html.j2').render(
            m=m, n=n, g=G, pn=pn, tpages=tpages, period_range=f"{p['start']} – {p['end']}", end_date=p['end'],
            fy=p['fy'], end_year=p['ey'], py=str(p['ey'] - 1))
        (ROOT / '_render.html').write_text(html_out, encoding='utf-8')
        pg.goto((ROOT / '_render.html').as_uri()); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
        out = pathlib.Path(args[1]) if len(args) > 1 else ROOT / 'output' / f'RSM_Kuwait_CX_Report_{p["fy"].replace("–","-")}.pdf'
        out.parent.mkdir(parents=True, exist_ok=True)
        pg.pdf(path=str(out), prefer_css_page_size=True, print_background=True)
        br.close()
    print('wrote', out)


def cx_narrative(m, p, d):
    cs, ns, cc, rs = m['csat'], m['nps'], m['ces'], m['resp']
    n = {}
    s, e = datetime.date.fromisoformat(d['period']['start_date']), datetime.date.fromisoformat(d['period']['end_date'])
    import calendar
    whole_month = s.day == 1 and e.year == s.year and e.month == s.month and e.day == calendar.monthrange(e.year, e.month)[1]
    where = f"in {s.strftime('%B %Y')}" if whole_month else f"between {p['start']} and {p['end']}"
    n['cx_resp'] = f"{plural(rs['recv'], 'response')} {'was' if rs['recv'] == 1 else 'were'} received {where}."
    gap = lambda v, t: abs(round(v - t, 1))
    dis = ('No dissatisfied responses were recorded.' if cs['d'] == 0 else 'The single dissatisfied response has been followed up directly.' if cs['d'] == 1
           else f"The {cs['d']} dissatisfied responses have been followed up directly.")
    if cs['pct'] >= cs['_target']:
        n['cx_csat'] = (f"A CSAT of {cs['pct']}% reflects steady service quality across the period. The result is drawn from {cs['pos']} of {cs['total']} responses rating the experience as satisfied or very satisfied. {dis} "
                        "In line with ongoing efforts, we remain focused on sustaining this level through consistent delivery and clear communication.")
    else:
        pts = f"{gap(cs['pct'], cs['_target']):g} point{'' if gap(cs['pct'], cs['_target']) == 1 else 's'}"
        n['cx_csat'] = (f"A CSAT of {cs['pct']}% is {pts} below the {cs['target']}% target. The result is drawn from {cs['pos']} of {cs['total']} responses rating the experience as satisfied or very satisfied. {dis} "
                        "We remain focused on closing the gap through consistent delivery and clear communication.")
    if ns['score'] >= ns['_target']:
        n['cx_nps'] = (f"An NPS of {ns['score']}% indicates a base of client advocates, with {ns['p_txt']} compared to {ns['d_txt']}. This reflects strong trust built through consistent service across engagements. "
                       "We continue to focus on supporting satisfied clients to become active advocates through closer engagement and clear communication.")
    else:
        pts = f"{gap(ns['score'], ns['_target']):g} point{'' if gap(ns['score'], ns['_target']) == 1 else 's'}"
        n['cx_nps'] = (f"An NPS of {ns['score']}% is {pts} below the target of {ns['target']}, with {ns['p_txt']} compared to {ns['d_txt']}. "
                       "We continue to focus on supporting satisfied clients to become active advocates through closer engagement and clear communication.")
    if cc['score'] >= cc['_target'] - 1e-9:
        n['cx_ces'] = (f"A CES of {cc['score_txt']} suggests clients find it effortless to work with us, supported by clear communication and consistent follow-up with automated reminders. "
                       f"The distribution sits at the easier end of the scale, with {cc['easy']} of {cc['total']} responses rating the experience 5 or higher. We aim to sustain this during peak periods through greater visibility of engagement status.")
    else:
        n['cx_ces'] = (f"A CES of {cc['score_txt']} is {abs(round(cc['score'] - cc['_target'], 1)):.1f} below the target of {cc['target_txt']}, with {cc['easy']} of {cc['total']} responses rating the experience 5 or higher. "
                       "We aim to improve this through clear communication, consistent follow-up and greater visibility of engagement status.")
    # optional extras from the data file
    parts = []
    fu = d.get('followup')
    if fu: parts.append(f"<b>Follow-up:</b> {plural(fu.get('raised', 0), 'case')} {'was' if fu.get('raised', 0) == 1 else 'were'} raised for neutral or low ratings, {fu.get('closed', 0)} closed.")
    if d.get('comments_summary'): parts.append(f"<b>Comments:</b> {html.escape(d['comments_summary'])}")
    if min(cs['total'], ns['total'], cc['total']) < 10: parts.append("Fewer than 10 responses sit behind one or more scores, so read them as indicative.")
    n['cx_note'] = ' '.join(parts)
    n.update(d.get('text_overrides') or {})
    return n

def main_cx(args):
    from playwright.sync_api import sync_playwright
    data_path = pathlib.Path(args[0]) if args else ROOT / 'data/report_data.json'
    d = json.loads(data_path.read_text(encoding='utf-8'))
    s = datetime.date.fromisoformat(d['period']['start_date']); e = datetime.date.fromisoformat(d['period']['end_date'])
    dfmt = lambda x: f'{x.day} {x.strftime("%B %Y")}'
    p = dict(start=dfmt(s), end=dfmt(e), sy=s.year, ey=e.year, fy=f'{s.year}–{str(e.year)[2:]}', prev_fy='')
    m, warns = metrics(d)
    for w in warns: print('WARNING:', w)
    n = narrative(m, p, d); n.update(cx_narrative(m, p, d)); G = build_graphics(m, p, cx=True)
    env = Environment(loader=FileSystemLoader(str(ROOT / 'templates')), autoescape=True)
    html_out = env.get_template('cx.html.j2').render(m=m, n=n, g=G, pn=dict(p03=2, p05=3, p06=4), period_range=f"{p['start']} – {p['end']}",
                                                     end_date=p['end'], fy=p['fy'], end_year=p['ey'], py=str(p['ey'] - 1))
    (ROOT / '_render.html').write_text(html_out, encoding='utf-8')
    out = pathlib.Path(args[1]) if len(args) > 1 else ROOT / 'output' / f'RSM_in_Kuwait_CX_Report_{s.strftime("%Y-%m-%d")}_to_{e.strftime("%Y-%m-%d")}.pdf'
    out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        br = launch_chromium(pw); pg = br.new_page(); pg.goto((ROOT / '_render.html').as_uri()); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
        pg.pdf(path=str(out), prefer_css_page_size=True, print_background=True); br.close()
    print('wrote', out)

def main_partner(args):
    import re as _re, partner_report as PR
    from playwright.sync_api import sync_playwright
    data_path = pathlib.Path(args[0]) if args else ROOT / 'data/partner_example.json'
    d = json.loads(data_path.read_text(encoding='utf-8')); (ROOT / '_render.html').write_text(PR.render_html(d), encoding='utf-8')
    slug = _re.sub(r'[^a-z0-9]+', '-', d.get('partner', {}).get('name', 'partner').lower()).strip('-')
    out = pathlib.Path(args[1]) if len(args) > 1 else ROOT / 'output' / f"rsm-partner-report-{slug}-{d['period']['start_date']}to{d['period']['end_date']}.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        br = launch_chromium(pw); pg = br.new_page(); pg.goto((ROOT / '_render.html').as_uri()); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
        pg.pdf(path=str(out), prefer_css_page_size=True, print_background=True); br.close()
    print('wrote', out)

def main_single(kind, args):
    import single_reports as SR
    from playwright.sync_api import sync_playwright
    data_path = pathlib.Path(args[0]) if args else ROOT / 'data/report_data.json'
    d = json.loads(data_path.read_text(encoding='utf-8')); html_out = SR.render_html(kind, d)
    (ROOT / '_render.html').write_text(html_out, encoding='utf-8')
    fy = f"{d['period']['start_date'][:4]}-{d['period']['end_date'][2:4]}"
    out = pathlib.Path(args[1]) if len(args) > 1 else ROOT / 'output' / f'RSM_in_Kuwait_{kind.upper()}_Report_{fy}.pdf'
    out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        br = launch_chromium(pw); pg = br.new_page(); pg.goto((ROOT / '_render.html').as_uri()); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
        pg.pdf(path=str(out), prefer_css_page_size=True, print_background=True); br.close()
    print('wrote', out)

if __name__ == '__main__':
    main()
