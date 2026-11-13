"""Partner report (3 pages): a logged-in partner's own VoC results. Same data schema as the other reports plus a `partner` block."""
import html, json, math, pathlib, re
import build_report as B
import gauges
from single_reports import needle_aimed

ROOT = pathlib.Path(__file__).resolve().parent
GREEN, LGREEN, BLUE, GREY, DGREY, TXT, NAVY = B.GREEN, B.LGREEN, B.BLUE, B.GREY, B.DGREY, '#63666A', '#00153D'
esc = lambda s: html.escape(s, quote=False)
def fam(font):
    f = font.lower()
    return "'Prelo 1 Bold'" if f.endswith('bold') else "'Prelo 1 Medium'" if f.endswith('medium') else "'Prelo 1 Light'"

class Doc:
    def __init__(s):
        s.items = [[dict(i, used=False) for i in pg] for pg in json.loads((ROOT / 'layouts' / 'partner.json').read_text())]
        s.pre = [[], [], []]; s.out = [[], [], []]; s.post = [[], [], []]
    def find(s, pg, text, near, tol=6):
        c = [i for i in s.items[pg] if not i['used'] and i['text'].strip() == text and abs(i['x0'] - near[0]) <= tol and abs(i['y0'] - near[1]) <= tol]
        assert c, (pg, text, near); c.sort(key=lambda i: abs(i['x0'] - near[0]) + abs(i['y0'] - near[1])); return c[0]
    def span(s, it, text, anchor='l', size=None, color=None, x=None, font=None):
        size = size or it['size']; X = x if x is not None else {'l': it['x0'], 'c': (it['x0'] + it['x1']) / 2, 'r': it['x1']}[anchor]
        tr = {'l': '', 'c': 'transform:translateX(-50%);', 'r': 'transform:translateX(-100%);'}[anchor]
        return (f'<div class="s" style="left:{X:.2f}pt;top:{it["oy"]-size:.2f}pt;font-size:{size}pt;font-family:{font or fam(it["font"])};color:{color or it["color"]};{tr}">{text}</div>')
    def bind(s, pg, text, near, new, anchor='l', size=None, color=None, x=None, tol=6):
        it = s.find(pg, text, near, tol); it['used'] = True
        if len(new) >= 4 and (size or it['size']) >= 16: size = round((size or it['size']) * 0.8, 1)
        s.out[pg].append(s.span(it, esc(new), anchor, size, color, x))
    def drop(s, pg, text, near, tol=6): s.find(pg, text, near, tol)['used'] = True
    def drop_region(s, pg, x0, y0, x1, y1):
        for i in s.items[pg]:
            if not i['used'] and x0 <= i['x0'] <= x1 and y0 <= i['y0'] <= y1: i['used'] = True
    def flow(s, pg, x, base, width, size, lh, runs, color=TXT, align='left', font=None, lines=None):
        top = base - size - (lh - 1.25 * size) / 2
        bold_font = "'Prelo 1 Bold'"
        light_font = font or "'Prelo 1 Light'"
        body = ''.join(f'<span style="font-family:{bold_font if b else light_font}">{esc(t)}</span>' for t, b in runs)
        clamp = f'display:-webkit-box;-webkit-line-clamp:{lines};-webkit-box-orient:vertical;overflow:hidden;' if lines else ''
        s.out[pg].append(f'<div class="s" style="white-space:normal;left:{x}pt;top:{top:.2f}pt;width:{width}pt;font-size:{size}pt;line-height:{lh}pt;color:{color};text-align:{align};{clamp}">{body}</div>')

def rect(x, y, w, h, col, extra=''): return f'<div style="position:absolute;left:{x:.2f}pt;top:{y:.2f}pt;width:{w:.2f}pt;height:{h:.2f}pt;background:{col};{extra}"></div>'
def plural(n, w): return f'{n} {w}' if n == 1 else f'{n} {w}s'
def cl(n): return 'client' if n == 1 else 'clients'
def points(n): return f"{n} point{'' if n == 1 else 's'}"
def widths(counts, W, min_w):
    clamp = set()
    while True:
        free = W - len(clamp) * min_w; rest = sum(c for i, c in enumerate(counts) if i not in clamp) or 1
        new = {i for i, c in enumerate(counts) if i not in clamp and c / rest * free < min_w}
        if not new: break
        clamp |= new
    free = W - len(clamp) * min_w; rest = sum(c for i, c in enumerate(counts) if i not in clamp) or 1
    return [min_w if i in clamp else counts[i] / rest * free for i in range(len(counts))]
def stacked(x, y, W, h, segs, min_w=26):
    ws = widths([c for c, _, _ in segs], W, min_w); out = ''
    for w, (c, col, lab) in zip(ws, segs):
        out += f'<div style="width:{w:.2f}pt;background:{col};display:flex;align-items:center;justify-content:center;color:#fff;font:9pt/1 \'Prelo 1 Bold\'">{lab}</div>'
    return f'<div style="position:absolute;left:{x}pt;top:{y}pt;width:{W}pt;height:{h}pt;display:flex">{out}</div>'
def join_names(n): return n[0] if len(n) == 1 else ' and '.join(n) if len(n) == 2 else ', '.join(n[:-1]) + ' and ' + n[-1]

def render_html(d):
    s0 = B.datetime.date.fromisoformat(d['period']['start_date']); e0 = B.datetime.date.fromisoformat(d['period']['end_date'])
    f = lambda x: f'{x.day} {x.strftime("%B %Y")}'; period = f"{f(s0)} – {f(e0)}"; yr = e0.year
    m, warns = B.metrics(d); cs, ns, cc, rs = m['csat'], m['nps'], m['ces'], m['resp']
    P = d.get('partner', {}); name = P.get('name', 'Partner'); fu = d.get('followup', {'raised': 0, 'closed': 0})
    D = Doc(); sub = lambda t: t.replace('1 July 2025 – 30 June 2026', period).replace('© RSM Albazie & Co., 2026', f'© RSM Albazie & Co., {yr}')
    TXTD = '#63666A'
    # status per measure
    st = {}
    for k, v, t in (('csat', cs['pct'], cs['_target']), ('nps', ns['score'], ns['_target']), ('ces', cc['score'], cc['_target'])):
        g = abs(round(v - t, 1)); st[k] = dict(v=v, t=t, g=g, below=v < t - 1e-9, eq=g == 0)
    def gap_txt(k, long=True):
        s_ = st[k]
        if s_['eq']: return 'On target'
        if k == 'ces': return f"{s_['g']:.1f} {'below' if s_['below'] else 'above'} target"
        return f"{points(int(round(s_['g'])))} {'below' if s_['below'] else 'above'} target"
    # ================= PAGE 1 =================
    for t, near, new in (('45', (71, 234), str(rs['sent'])), ('14', (212, 234), str(rs['recv'])), ('31%', (353, 234), f"{rs['rate']}%"), ('4', (487, 234), str(fu['raised']))):
        D.bind(0, t, near, new)
    D.bind(0, 'raised (3 closed)', (487, 270), f"raised ({fu['closed']} closed)")
    D.drop(0, 'SAMPLE: DUMMY DATA FOR LAYOUT REVIEW', (113, 17))
    for t, near in (('Prepared for:', (31, 90)), ('Sample Partner', (86, 90)), ('|', (149, 90)), ('Reporting period:', (161, 90)), ('29 October 2025 – 28 October 2026', (233, 90))): D.drop(0, t, near)
    D.out[0].append(f'<div class="s" style="left:31pt;top:{90.3:.2f}pt;font-size:9pt;color:#fff;font-family:\'Prelo 1 Light\'"><b style="font-family:\'Prelo 1 Bold\';font-weight:normal">Prepared for:</b> {esc(name)} <span style="color:#009CDE">&nbsp;|&nbsp;</span> <b style="font-family:\'Prelo 1 Bold\';font-weight:normal">Reporting period:</b> {esc(period)}</div>')
    for y in (194, 210): D.drop_region(0, 30, y - 1, 540, y + 2)
    D.flow(0, 31, 205.5, 535, 12, 16, [(f"Client feedback on engagements led by {name}. Each score uses the responses to its own question: {cs['total']} for CSAT, {ns['total']} for NPS and {cc['total']} for CES.", False)])
    # score cards
    D.bind(0, '79%', (95, 419), f"{cs['pct']}%", 'c'); D.bind(0, '33%', (278, 420), f"{ns['score']}%", 'c'); D.bind(0, '5.6', (468, 420), cc['score_txt'], 'c')
    D.bind(0, '11 of 14 clients rated 4 or 5', (66, 446), f"{cs['pos']} of {cs['total']} {cl(cs['total'])} rated 4 or 5", 'c')
    D.bind(0, '6 promoters vs 2 detractors', (246, 446), f"{ns['p_txt']} vs {ns['d_txt']}", 'c')
    D.bind(0, '10 of 13 clients found it easy', (430, 446), f"{cc['easy']} of {cc['total']} {cl(cc['total'])} found it easy", 'c')
    for t, near, new in (('97%', (62, 471), f"{cs['target']}%"), ('70', (251, 471), str(ns['target'])), ('5.0', (434, 471), cc['target_txt'])): D.bind(0, t, near, new, 'c')
    for (num_t, near, k), (lab_t, lnear) in zip((('18', (148, 472), 'csat'), ('37', (332, 472), 'nps'), ('0.6', (513, 472), 'ces')), (('pts below', (136, 490)), ('pts below', (319, 490)), ('pts Above', (501, 490)))):
        s_ = st[k]; it = D.find(0, num_t, near); it['used'] = True; lab = D.find(0, lab_t, lnear); lab['used'] = True
        gt = (f"{s_['g']:.1f}" if k == 'ces' else str(int(round(s_['g']))))
        if s_['eq']: D.out[0].append(D.span(it, 'On target', 'c', 11, '#fff', x=(it['x0'] + it['x1']) / 2 + (lab['x0'] + lab['x1']) / 2 * 0 - 0)); continue
        word = ('point' if (gt == '1') else 'points') if k != 'ces' else 'points'
        D.out[0].append(D.span(it, gt, 'c', None, None)); D.out[0].append(D.span(lab, f"{word} {'below' if s_['below'] else 'above'}", 'c', 9, None))
    # graphics: CSAT ring, NPS fan, CES gauge
    A = D.pre[0].append
    A(B.svg(0, 0, 1, 1, B.ring(114.55, 391.95, 26.3, 3.1, cs['pct'] / 100, LGREEN, '#666665')) + '<img src="assets/partner_smiley.png" style="position:absolute;left:96pt;top:373.4pt;width:37.5pt;height:37.5pt" alt="">')
    A(gauges.fan_tag((ns['score'] + 100) / 2, 235.3, 362.1, 126.1, 71.3, off=(136, 139, 141)) + '<img src="assets/thumbs_up.png" style="position:absolute;left:289.8pt;top:399pt;width:17pt;height:17.5pt" alt="">')
    A(gauges.bands_tag(417.3, 353.0, 131, 80.8) + needle_aimed(482.4, 417.3, 482.4, 430.3, 53.7, cc['score']))
    # performance against target
    x0, W = 135.3, 290.0
    rows = (('csat', 559.9, GREEN, cs['pct'] / 100, cs['_target'] / 100, f"{cs['pct']}%", f"Target {cs['target']}%", (394, 542), (537, 547), (508, 567), cs['total']),
            ('nps', 609.8, BLUE, (ns['score'] + 100) / 200, (ns['_target'] + 100) / 200, f"{ns['score']}%", f"Target {ns['target']}", (363, 592), (536, 597), (508, 617), ns['total']),
            ('ces', 659.8, DGREY, (cc['score'] - 1) / 6, (cc['_target'] - 1) / 6, cc['score_txt'], f"Target {cc['target_txt']}", (309, 642), (543, 647), (499, 667), cc['total']))
    old = {'csat': ('Target 97%', '79%', 'Below target', '14 responses', (31, 563)), 'nps': ('Target 70', '33%', 'Below target', '12 responses', (31, 613)), 'ces': ('Target 5.0', '4.8', 'Exceeds target', '13 responses', (31, 663))}
    for k, y, col, frac, tfrac, val, tlab, tn, vn, sn, tot in rows:
        A(rect(x0, y, W, 13.9, '#E0E0E0') + rect(x0, y, W * max(0, min(1, frac)), 13.9, col) + rect(x0 + W * tfrac - 0.8, y - 4.3, 1.6, 22, '#231F20'))
        o = old[k]; it = D.find(0, o[0], tn); it['used'] = True; D.out[0].append(D.span(it, esc(tlab), 'c', x=x0 + W * tfrac))
        vc = TXTD if st[k]['below'] else GREEN
        D.bind(0, o[1], vn, val, 'r', color=vc); D.bind(0, o[2], sn, 'On target' if st[k]['eq'] else ('Below target' if st[k]['below'] else ('Exceeds target')), 'r', color=vc)
        D.bind(0, o[3], o[4], plural(tot, 'response'))
    # funnel
    fy = (721.2, 742.2, 763.2, 784.1); vals = (rs['sent'], rs['recv'], P.get('with_comment', 0), fu['raised']); cols = (GREEN, BLUE, LGREEN, NAVY); Wf = 379.0
    for y, v, c in zip(fy, vals, cols): A(rect(155.7, y, Wf, 15, '#EDEDED') + rect(155.7, y, Wf * (v / rs['sent'] if rs['sent'] else 0), 15, c))
    for t, near, v in (('45', (546, 721), vals[0]), ('14', (548, 742), vals[1]), ('12', (549, 763), vals[2]), ('4', (553, 784), vals[3])): D.bind(0, t, near, str(v), 'r')
    # ================= PAGE 2 =================
    D.bind(1, 'Voice of Clients | Partner Report | Sample Partner', (32, 16), f'Voice of Clients | Partner Report | {name}')
    def sentence(pg, y_first, drop_ys, runs, base):
        for y in drop_ys: D.drop_region(pg, 30, y - 1, 560, y + 2)
        D.flow(pg, 40, base, 520, 12, 15, runs, color=TXT)
    sentence(1, 101, (101,), [(str(cs['pos']), True), (' of ', False), (str(cs['total']), True), (f" {cl(cs['total'])} rated their experience as satisfied or very satisfied. Target: {cs['target']}% or above.", False)], 112.5)
    sentence(1, 361, (361,), [(str(ns['p']), True), (f" {'promoter' if ns['p'] == 1 else 'promoters'} and ", False), (str(ns['d']), True), (f" {'detractor' if ns['d'] == 1 else 'detractors'} from ", False), (str(ns['total']), True), (' responses. Target: ', False), (f"{ns['target']}.", True)], 372.5)
    sentence(1, 622, (622,), [(str(cc['easy']), True), (' of ', False), (str(cc['total']), True), (f" {cl(cc['total'])} rated the engagement experience as easy or very easy. Target: {cc['target_txt']} or above.", False)], 633.5)
    D.bind(1, '79%', (63, 127), f"{cs['pct']}%", 'c', x=100); D.bind(1, '33%', (78, 385), f"{ns['score']}%", 'c', x=116.5); D.bind(1, '5.6', (51, 643), cc['score_txt'], 'c', x=78)
    D.bind(1, 'Target: 97%', (78, 173), f"Target: {cs['target']}%", 'c'); D.bind(1, 'Target: 70', (97, 433), f"Target: {ns['target']}", 'c'); D.bind(1, 'Target: 5.0', (58, 691), f"Target: {cc['target_txt']}", 'c')
    D.bind(1, '18 points below target', (62, 189), gap_txt('csat'), 'c'); D.bind(1, '37 points below target', (78, 448), gap_txt('nps'), 'c'); D.bind(1, '0.6 above target', (52, 707), gap_txt('ces'), 'c')
    for t, near, v in (('6', (196, 142), cs['vs']), ('5', (286, 142), cs['s']), ('2', (392, 142), cs['n']), ('1', (498, 142), cs['d']),
                       ('6', (224, 403), ns['p']), ('4', (344, 403), ns['n']), ('2', (464, 403), ns['d']),
                       ('8', (165, 662), cc['c5']), ('2', (251, 663), cc['c4']), ('2', (336, 662), cc['c3']), ('1', (423, 663), cc['c2']), ('0', (506, 662), cc['c1'])): D.bind(1, t, near, str(v), 'c')
    for t, near, new in (('Rated (1-2)', (479, 177), 'Rated (1–2)'), ('Rated (6-7)', (148, 697), 'Rated (6–7)'), ('Rated (1-2 )', (489, 697), 'Rated (1–2)'),
                         ('Satisfied  (4)', (216, 234), 'Satisfied (4)'), ('Dissatisfied (1-2)', (428, 235), 'Dissatisfied (1–2)'),
                         ('Very Easy (6-7 )', (108, 756), 'Very Easy (6–7)'), ('Very Difficult  (1-2 )', (433, 756), 'Very Difficult (1–2)')):
        D.bind(1, t, near, new, 'c' if t.startswith('Rated') else 'l')
    for t, y in (('43%', 210), ('36%', 210), ('14%', 210), ('7%', 210), ('50%', 469), ('33%', 469), ('17%', 469), ('62%', 734), ('15%', 734), ('15%', 734), ('8%', 734), ('0%', 734)):
        D.drop_region(1, 150, y - 1, 520, y + 2)
    A = D.pre[1].append
    A(stacked(74.6, 206.7, 443.7, 20, [(cs['vs'], GREEN, f"{cs['pcts'][0]}%"), (cs['s'], LGREEN, f"{cs['pcts'][1]}%"), (cs['n'], BLUE, f"{cs['pcts'][2]}%"), (cs['d'], GREY, f"{cs['pcts'][3]}%")]))
    A(stacked(75.1, 466.1, 443.7, 20, [(ns['p'], GREEN, f"{ns['p_pct']}%"), (ns['n'], BLUE, f"{ns['n_pct']}%"), (ns['d'], GREY, f"{ns['d_pct']}%")]))
    A(stacked(75.1, 730.5, 443.7, 20, [(cc['c5'], GREEN, f"{cc['pcts'][0]}%"), (cc['c4'], LGREEN, f"{cc['pcts'][1]}%"), (cc['c3'], BLUE, f"{cc['pcts'][2]}%"), (cc['c2'], GREY, f"{cc['pcts'][3]}%"), (cc['c1'], DGREY, f"{cc['pcts'][4]}%")], min_w=30.2))
    D.bind(1, '6 + 5 =', (147, 261), f"{cs['vs']} + {cs['s']} =", 'r'); D.bind(1, '11', (181, 257), str(cs['pos']), 'r'); D.bind(1, '14', (274, 258), str(cs['total']), 'r'); D.bind(1, '79%', (400, 256), f"{cs['pct']}%", 'r')
    D.bind(1, '(6 ÷ 12) × 100 = 50', (86, 518), f"({ns['p']} ÷ {ns['total']}) × 100 =", 'r'); D.bind(1, '50%', (172, 514), f"{ns['p_pct']}%", 'r')
    D.bind(1, '(2 ÷ 12) × 100 =', (278, 518), f"({ns['d']} ÷ {ns['total']}) × 100 =", 'r'); D.bind(1, '17%', (347, 514), f"{ns['d_pct']}%", 'r', x=370); D.bind(1, '33%', (456, 513), f"{ns['score']}%", 'r', x=488)
    for t, near, k in (('(8 clients) 52', (149, 717), 'c5'), ('(2 clients) 10', (235, 717), 'c4'), ('(2 clients) 8', (322, 717), 'c3'), ('(1 client) 3', (410, 717), 'c2'), ('(0 clients) 0', (492, 717), 'c1')):
        D.bind(1, t, near, f"({cc[k]} {'client' if cc[k] == 1 else 'clients'}) {cc['p' + k[1]]}", 'c')
    D.bind(1, '73', (98, 776), str(cc['sum']), 'r'); D.bind(1, '13', (263, 776), str(cc['total']), 'r'); D.bind(1, '5.6', (442, 775), cc['score_txt'], 'r')
    # ================= PAGE 3 =================
    D.bind(2, 'Voice of Clients | Partner Report | Sample Partner', (31, 16), f'Voice of Clients | Partner Report | {name}')
    names = {'csat': 'CSAT', 'nps': 'NPS', 'ces': 'CES'}; ok = [k for k in names if not st[k]['below']]; low = [k for k in names if st[k]['below']]
    parts = []
    if not low: parts.append('All three measures meet or exceed target.')
    elif not ok: parts.append('All three measures are below target.')
    else: parts.append(f"{join_names([names[k] for k in ok])} {'meets or exceeds' if len(ok) == 1 else 'meet or exceed'} target. {join_names([names[k] for k in low])} {'is' if len(low) == 1 else 'are'} below.")
    tots = (cs['total'], ns['total'], cc['total']); parts.append(f"Results rest on {min(tots)} to {max(tots)} responses per measure." if min(tots) != max(tots) else f"Results rest on {min(tots)} responses per measure.")
    D.drop_region(2, 30, 71, 540, 75); D.flow(2, 32, 84.5, 530, 12, 15, [(' '.join(parts), False)], color=TXT)
    imp = P.get('improve_themes') or []
    cs_txt = (f"A CSAT of {cs['pct']}% {'is ' + points(int(round(st['csat']['g']))) + ' below the ' + str(cs['target']) + '% target' if st['csat']['below'] else ('meets' if st['csat']['eq'] else 'exceeds') + ' the ' + str(cs['target']) + '% target'}. Of {cs['total']} {cl(cs['total'])}, {cs['pos']} rated 4 or 5."
              + (f" Comments point to {imp[0]['title'][0].lower() + imp[0]['title'][1:]}." if imp else ''))
    ns_txt = (f"An NPS of {ns['score']}% {'is ' + points(int(round(st['nps']['g']))) + ' below the target of ' + str(ns['target']) if st['nps']['below'] else ('meets' if st['nps']['eq'] else 'exceeds') + ' the target of ' + str(ns['target'])}, with {ns['p_txt']} ({ns['p_pct']}%) and {ns['d_txt']} ({ns['d_pct']}%)."
              + (' We aim to follow up with each detractor.' if ns['d'] > 0 else ''))
    ces_txt = (f"A CES of {cc['score_txt']} {'is ' + format(st['ces']['g'], '.1f') + ' below the ' + cc['target_txt'] + ' target' if st['ces']['below'] else ('meets' if st['ces']['eq'] else 'exceeds') + ' the ' + cc['target_txt'] + ' target'}. {cc['easy']} of {cc['total']} {cl(cc['total'])} ({B.pct(cc['easy'], cc['total'])}%) found working with the team easy or very easy.")
    for (t, near, v, col), (ys, txt_) in zip((('79%', (50, 105), f"{cs['pct']}%", GREEN), ('33%', (50, 163), f"{ns['score']}%", BLUE), ('5.6', (56, 221), cc['score_txt'], DGREY)), (((115, 128), cs_txt), ((173, 186), ns_txt), ((231, 243), ces_txt))):
        D.bind(2, t, near, v, 'c', x=71.5)
        for y in ys: D.drop_region(2, 111, y - 1, 560, y + 2)
        D.flow(2, 112, ys[0] + 8.5, 432, 10, 13, [(txt_, False)], color=TXT)
    # what clients say
    for pg_y0, pg_y1 in ((328, 495),): D.drop_region(2, 30, pg_y0, 565, pg_y1)
    n_cm = P.get('comment_total', 0); mt = P.get('min_theme', 2); val = (P.get('value_themes') or [])[:2]; imp2 = imp[:2]
    mx = max([t['count'] for t in val + imp2] or [1])
    def themes(x0, items, col, cover_quote_bars):
        for i, t in enumerate(items):
            y = 330 + 82 * i; w = 192 * t['count'] / mx
            D.out[2].append(f'<div class="s" style="left:{x0}pt;top:{y}pt;width:215pt;font:10pt/1.25 \'Prelo 1 Bold\';color:{NAVY};white-space:normal">{esc(t["title"])}</div>')
            D.out[2].append(f'<div class="s" style="left:{x0+170}pt;width:75pt;text-align:right;top:{y+14}pt;font-size:9pt;font-family:\'Prelo 1 Light\';color:{TXT}">{t["count"]} of {n_cm}</div>')
            D.pre[2].append(rect(x0 - 0.3, y + 16.9, 192, 6, '#E8E8E8') + rect(x0 - 0.3, y + 16.9, w, 6, col))
            D.out[2].append(f'<div class="s" style="white-space:normal;left:{x0}pt;top:{y+26}pt;width:228pt;font:10pt/12pt \'Prelo 1 Light\';color:{TXT};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{esc(t["text"])}</div>')
            if t.get('quote'): D.out[2].append(f'<div class="s" style="white-space:normal;left:{x0+6}pt;top:{y+61}pt;width:225pt;font:italic 9pt/12pt \'Prelo 1 Light\';color:{TXT};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">“{esc(t["quote"])}”</div>')
            else: D.post[2].append(rect(x0 - 3, y + 54, 5, 28, '#FFFFFF'))
        if len(items) < 2: D.post[2].append(rect(x0 - 3, 408 if not items else 410, 245, 85, '#FFFFFF'))
        if not items: D.post[2].append(rect(x0 - 3, 372, 245, 124, '#FFFFFF'))
        if not items: D.out[2].append(f'<div class="s" style="white-space:normal;left:{x0}pt;top:340pt;width:230pt;font:10pt/13pt \'Prelo 1 Light\';color:{TXT}">Themes appear when they are mentioned at least {mt} times.</div>')
    themes(41, val, GREEN, True); themes(313, imp2, BLUE, True)
    D.drop_region(2, 30, 499, 520, 503)
    D.out[2].append(f'<div class="s" style="left:32pt;top:501pt;font:10pt/1.25 \'Prelo 1 Light\';color:{TXT};white-space:nowrap">Based on {plural(n_cm, "anonymised comment")}. Themes appear when mentioned at least {mt} times.</div>')
    # suggested focus
    focus = []
    if ns['d'] + ns['n'] > 0: focus.append({'title': 'Follow up with detractors and passives', 'text': f"We aim to contact clients who rated 6 or below and check in with those who rated 7 or 8 ({ns['d_txt']} and {plural(ns['n'], 'passive')})."})
    focus += P.get('focus', []); focus = focus[:3]
    D.drop_region(2, 30, 552, 565, 682)
    for i in range(3):
        y0 = 552.5 + 44 * i
        if i < len(focus):
            fc = focus[i]
            D.out[2].append(f'<div class="s" style="left:68pt;top:{y0}pt;width:150pt;height:40pt;display:flex;align-items:center;white-space:normal;font:12pt/1.15 \'Prelo 1 Bold\';color:{NAVY}">{esc(fc["title"])}</div>')
            D.out[2].append(f'<div class="s" style="left:231pt;top:{y0}pt;width:325pt;height:40pt;display:flex;align-items:center;white-space:normal;font:10pt/12pt \'Prelo 1 Light\';color:{TXT}">{esc(fc["text"])}</div>')
            D.out[2].append(f'<div class="s" style="left:31.5pt;top:{y0}pt;width:28pt;height:40pt;display:flex;align-items:center;justify-content:center;font:11pt/1 \'Prelo 1 Bold\';color:#fff">0{i+1}</div>')
        else: D.post[2].append(rect(30.5, y0 - 1.2, 536, 42.6, '#FFFFFF'))
    # follow-up box + contact
    D.bind(2, 'Follow-up cases: 4 raised, 3 closed', (42, 701), f"Follow-up cases: {fu['raised']} raised, {fu['closed']} closed")
    dots = ''
    for i in range(min(fu['raised'], 10)):
        if i < fu['closed']: dots += f'<div style="position:absolute;left:{41.5+20*i}pt;top:737.4pt;width:14pt;height:14pt;border-radius:50%;background:{GREEN}"></div>'
        else: dots += f'<div style="position:absolute;left:{40.7+20*i}pt;top:736.6pt;width:15.6pt;height:15.6pt;box-sizing:border-box;border-radius:50%;background:#fff;border:1.4pt solid {BLUE}"></div>'
    if fu['raised'] > 10: dots += f'<div class="s" style="left:{41.5+20*10}pt;top:739pt;font:10pt/1.25 \'Prelo 1 Light\';color:{TXT}">+{fu["raised"]-10}</div>'
    D.post[2].append(dots)
    ct = P.get('contact', {}); D.bind(2, 'connect@rsm.com.kw | +965 22961000', (343, 727), f"{ct.get('email', 'connect@rsm.com.kw')} | {ct.get('phone', '+965 22961000')}")
    # ---- remaining static text
    for pg in range(3):
        for it in D.items[pg]:
            if not it['used']: D.out[pg].append(D.span(it, esc(sub(it['text']))))
    css = (ROOT / 'templates/style.css').read_text() + '\n.s{position:absolute;white-space:pre;line-height:1.25;margin:0}\n'
    pages = ''.join(f'<section class="page" style="width:595.5pt;height:842.25pt"><img class="plate" style="width:595.5pt;height:842.25pt" src="plates/partner_p{i+1}.jpg" alt="">{"".join(D.pre[i])}{"".join(D.out[i])}{"".join(D.post[i])}</section>' for i in range(3))
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Voice of Clients Partner Report {name} {f(s0)} - {f(e0)}</title><style>{css}</style></head><body>{pages}</body></html>')
