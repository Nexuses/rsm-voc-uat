"""One-off extraction from the approved one-page single-metric PDFs.
Builds text-free page backgrounds (plates/<type>_v3.jpg) and text layouts (layouts/v3_<type>.json).
Needs: pip install pymupdf"""
import fitz, json, sys, unicodedata, pathlib
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('.')
ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = {'ces': 'CES.pdf', 'csat': 'CSAT.pdf', 'nps': 'NPS.pdf'}
REGIONS = {'ces': [(366, 205, 564, 325), (30, 449, 183, 585)],
           'csat': [(367, 198, 565, 321), (30, 454, 183, 590)],
           'nps': [(367, 196, 565, 318), (30, 456, 183, 592)]}
for kind, fn in FILES.items():
    doc = fitz.open(SRC / fn); pg = doc[0]; spans = []
    for b in pg.get_text('dict')['blocks']:
        if b['type'] != 0: continue
        for l in b['lines']:
            for s in l['spans']:
                t = unicodedata.normalize('NFKC', s['text'])
                if not t.strip(): continue
                spans.append(dict(x0=round(s['bbox'][0], 2), y0=round(s['bbox'][1], 2), x1=round(s['bbox'][2], 2), y1=round(s['bbox'][3], 2),
                                  ox=round(s['origin'][0], 2), oy=round(s['origin'][1], 2), size=round(s['size'], 2),
                                  font=s['font'].split('+')[-1], color='#%06x' % s['color'], text=t))
    pix = pg.get_pixmap(dpi=72)
    regs = [(fitz.Rect(r), pix.pixel(int(r[0]) + 2, int(r[1]) + 2)) for r in REGIONS[kind]]
    pg.add_redact_annot(pg.rect)
    pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
    for r, rgb in regs: pg.add_redact_annot(r, fill=tuple(v / 255 for v in rgb[:3]))
    pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS, graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED, text=fitz.PDF_REDACT_TEXT_NONE)
    pg.get_pixmap(dpi=300).save(str(ROOT / 'plates' / f'{kind}_v3.jpg'), jpg_quality=92)
    (ROOT / 'layouts' / f'v3_{kind}.json').write_text(json.dumps(spans, ensure_ascii=False))
    print(kind, len(spans))
