"""Marketing deck v3: Voice of Clients, version 1 compared with Phase 1.

Keeps the version 1 / Phase 1 list and the three report pages from v1, and the
one-screenshot slides from v2. Writes a new file. Does not replace v1 or v2.
"""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUT = ROOT / "RSM_VoC_Phase1_v3.pptx"
TOTAL = 12
OLD_CHOOSER = (
    ROOT.parents[1]
    / "tests/e2e/survey.spec.ts-snapshots/survey-mode-chooser-en-chromium.png"
)

NAVY = RGBColor(0x00, 0x15, 0x3D)
INK = RGBColor(0x23, 0x1F, 0x20)
MUTED = RGBColor(0x57, 0x57, 0x56)
GREEN = RGBColor(0x3F, 0x9C, 0x35)
BLUE = RGBColor(0x00, 0x9C, 0xDE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PALE = RGBColor(0xF4, 0xF6, 0xF7)
LINE = RGBColor(0xE3, 0xE6, 0xE8)
GREEN_WASH = RGBColor(0xE7, 0xF4, 0xE4)
SLATE = RGBColor(0x8A, 0x8D, 0x8F)

W = Inches(13.333)
H = Inches(7.5)


def emu(inches: float) -> Emu:
    return Inches(inches)


def set_run(run, text, size, color, bold=False, font="Calibri"):
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.italic = False


def add_text(slide, text, x, y, w, h, size=16, color=INK, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(emu(x), emu(y), emu(w), emu(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = align
    p.space_before = Pt(0)
    p.space_after = Pt(0)
    set_run(p.add_run(), text, size, color, bold)
    return box


def rect(slide, x, y, w, h, fill, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, emu(x), emu(y), emu(w), emu(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1)
    # no shadow
    sp_pr = shape.fill._xPr.getparent() if False else shape._element
    effect = sp_pr.find(qn("a:effectLst"))
    return shape


def footer(slide, page, total=11):
    rect(slide, 0, 7.22, 13.333, 0.28, NAVY)
    add_text(slide, "Voice of Clients   ·   Phase 1", 0.45, 7.25, 6, 0.22, 10, WHITE, anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, f"{page}  /  {total}", 10.6, 7.25, 2.3, 0.22, 10, WHITE, align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)


def title_bar(slide, kicker, title):
    rect(slide, 0, 0, 13.333, 0.08, GREEN)
    add_text(slide, kicker, 0.48, 0.28, 8, 0.28, 12, BLUE, True)
    add_text(slide, title, 0.46, 0.52, 12, 0.46, 28, NAVY, True)


def picture(slide, path, x, y, w, h):
    return slide.shapes.add_picture(str(path), emu(x), emu(y), emu(w), emu(h))


def fit_picture(slide, path, x, y, w, h):
    """Place an image inside a box without stretching it."""
    from PIL import Image

    with Image.open(path) as im:
        iw, ih = im.size
    box_ratio = w / h
    img_ratio = iw / ih
    if img_ratio > box_ratio:
        dw = w
        dh = w / img_ratio
        dx = x
        dy = y + (h - dh) / 2
    else:
        dh = h
        dw = h * img_ratio
        dx = x + (w - dw) / 2
        dy = y
    # white card behind, then image
    rect(slide, x, y, w, h, WHITE, LINE)
    picture(slide, path, dx + 0.04, dy + 0.04, dw - 0.08, dh - 0.08)


# --- slides ---
# The long tick-list used to live here. It is gone on purpose.
# Six themes on one slide, then one picture per major change.

def blank(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    rect(slide, 0, 0, 13.333, 7.5, WHITE)
    return slide


def slide_title(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    rect(slide, 0, 0, 13.333, 7.5, NAVY)
    rect(slide, 0, 0, 0.18, 7.5, GREEN)
    rect(slide, 0, 6.95, 13.333, 0.55, BLUE)
    add_text(slide, "RSM IN KUWAIT", 0.7, 1.35, 8, 0.3, 14, GREEN, True)
    add_text(slide, "Voice of Clients", 0.68, 1.75, 11, 0.9, 54, WHITE, True)
    add_text(slide, "Phase 1", 0.7, 2.75, 8, 0.7, 36, RGBColor(0x7E, 0xD0, 0xF2), True)
    add_text(
        slide,
        "What the platform could do at version 1,\nand what it can do now.",
        0.7,
        3.7,
        9,
        1.1,
        20,
        WHITE,
    )
    add_text(slide, "Survey    ·    Reports    ·    Dashboard", 0.7, 7.08, 10, 0.3, 14, WHITE, True)


BASELINE = [
    "Voice survey and typed survey",
    "CSAT, CES and NPS, with a comment",
    "English and Arabic",
    "An insight on every response",
    "Ask Your Data",
    "Public scores for the website",
    "Signed-in overview of the results",
]

SURVEY_NEW = [
    "New opening and split-screen steps, on a phone as well as a desk",
    "A traditional scale: every score is a button, then a review of the answers",
    "Voice host you can preview, in English or Arabic",
    "Hold, end and live captions on the voice call",
    "An invite fills in the name, company and role",
    "A testimonial ask when the overall result is positive",
]

OUTREACH_NEW = [
    "Tracked invite to one person or a list, naming the service",
    "Opens, starts and completions",
    "Reminders you can stop, and turn back on",
    "Thank-you email with the three scores",
    "Team email copies the partner and managers, in Kuwait time",
    "A negative result raises a separate alert",
    "One overall result: Positive, Neutral or Negative",
    "CRM can send the invite and receive the scores",
    "A private page of that client’s scores",
    "Directory of departments, services and staff",
    "If the same person replies again in the quarter, the latest score counts",
]

DASHBOARD_NEW = [
    "Email code on every sign-in",
    "Roles for admin, CX and surveyor, plus roles you create",
    "A partner sees only their own clients",
    "Change your own password",
    "Audit log",
    "Filter by period, company, department, service, partner and manager",
    "Separate CSAT, NPS and CES pages",
    "Leaderboard by department, partner and manager",
    "Excel and CSV, from responses and from the invite tracker",
    "Exclude or delete a response",
    "Read the voice transcript beside the scores",
    "Testimonials library",
    "Escalations board for low scores",
    "Ask Your Data can draw a chart, and can answer invite questions",
    "A warning when voice credits run low",
    "Response rate beside surveys sent and received",
]

REPORT_NEW = [
    "Annual report, with a written narrative and the year before",
    "A report for the exact dates you choose",
    "One page each for CSAT, NPS and CES, using the same filters",
    "A three-page report for one partner",
    "Weekly, monthly and quarterly packs by email",
    "A reviews showcase on the website. Name and company only",
]


def comparison(prs, kicker, title, sections, page):
    slide = blank(prs)
    title_bar(slide, kicker, title)
    y = 1.18
    rect(slide, 0.4, y, 12.55, 0.36, NAVY)
    add_text(slide, "Feature", 0.58, y, 8, 0.36, 12, WHITE, True, anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, "Version 1", 8.7, y, 1.9, 0.36, 12, WHITE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, "Phase 1", 10.7, y, 2.05, 0.36, 12, WHITE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    rows = []
    for label, items, kind in sections:
        rows.append(("section", label, False))
        for item in items:
            rows.append(("item", item, kind == "base"))
    top, bottom = 1.54, 7.05
    gap = (bottom - top) / len(rows)
    for i, (kind, label, v1) in enumerate(rows):
        yy = top + i * gap
        if kind == "section":
            rect(slide, 0.4, yy, 12.55, gap, PALE)
            add_text(slide, label, 0.58, yy, 8, gap, 11, NAVY, True, anchor=MSO_ANCHOR.MIDDLE)
            continue
        if not v1:
            rect(slide, 0.4, yy, 12.55, gap, GREEN_WASH)
        elif i % 2 == 0:
            rect(slide, 0.4, yy, 12.55, gap, RGBColor(0xFA, 0xFB, 0xFB))
        add_text(slide, label, 0.58, yy, 8.0, gap, 11, INK, anchor=MSO_ANCHOR.MIDDLE)
        if v1:
            add_text(slide, "✓", 8.7, yy, 1.9, gap, 14, SLATE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        add_text(slide, "✓", 10.7, yy, 2.05, gap, 16, GREEN, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    footer(slide, page, TOTAL)


def slide_compare_start(prs, page):
    slide = blank(prs)
    title_bar(slide, "NEW IN PHASE 1", "How a client starts")
    add_text(
        slide,
        "Version 1 on the left. Phase 1 on the right. Same choice of voice or typed, on a new screen.",
        0.48,
        1.12,
        12.2,
        0.36,
        15,
        MUTED,
    )
    add_text(slide, "Version 1", 0.48, 1.52, 5.8, 0.28, 13, SLATE, True)
    add_text(slide, "Phase 1", 6.95, 1.52, 5.8, 0.28, 13, GREEN, True)
    fit_picture(slide, OLD_CHOOSER, 0.48, 1.84, 5.9, 4.95)
    fit_picture(slide, ASSETS / "survey-chooser.png", 6.95, 1.84, 5.9, 4.95)
    footer(slide, page, TOTAL)


def slide_reports(prs, page):
    slide = blank(prs)
    title_bar(slide, "NEW IN PHASE 1", "Reports you can hand over")
    add_text(
        slide,
        "Version 1 downloaded one PDF of the dashboard. Phase 1 builds these.",
        0.48,
        1.12,
        12.2,
        0.32,
        15,
        MUTED,
    )
    cards = [
        (ASSETS / "report-cover.png", "Annual"),
        (ASSETS / "report-kpis.png", "The year, with the year before"),
        (ASSETS / "report-csat.png", "One metric, one page"),
    ]
    for i, (path, caption) in enumerate(cards):
        x = 0.48 + i * 4.25
        fit_picture(slide, path, x, 1.55, 4.0, 4.85)
        add_text(slide, caption, x, 6.48, 4.0, 0.32, 13, NAVY, True, align=PP_ALIGN.CENTER)
    footer(slide, page, TOTAL)


def slide_themes(prs):
    slide = blank(prs)
    title_bar(slide, "PHASE 1", "Six changes, not a checklist")
    add_text(
        slide,
        "Version 1 collected CSAT, CES and NPS. Everything after that sits in one of these six.",
        0.48,
        1.18,
        12.2,
        0.4,
        16,
        MUTED,
    )
    cards = [
        (GREEN, "Survey", "New screens, and a number the client taps instead of dragging a slider."),
        (BLUE, "Voice", "The host can be sampled in English or Arabic before the call starts."),
        (NAVY, "Outreach", "Tracked invites and reminders, then a thank-you that includes the scores."),
        (GREEN, "Dashboard", "Filters, a ranking, and a page of its own for each of the three scores."),
        (BLUE, "Reports", "A branded file for the year, any dates, one metric, or one partner."),
        (NAVY, "Access", "An email code at sign-in. A partner sees only their own clients."),
    ]
    for i, (color, head, body) in enumerate(cards):
        col, row = i % 3, i // 3
        x = 0.48 + col * 4.22
        y = 1.85 + row * 2.5
        rect(slide, x, y, 4.02, 2.28, PALE)
        rect(slide, x, y, 0.1, 2.28, color)
        add_text(slide, head, x + 0.35, y + 0.28, 3.4, 0.45, 22, NAVY, True)
        add_text(slide, body, x + 0.35, y + 0.9, 3.4, 1.1, 15, INK)
    footer(slide, 2, TOTAL)


def feature_slide(prs, page, kicker, title, line, image):
    slide = blank(prs)
    rect(slide, 0, 0, 13.333, 0.08, GREEN)
    add_text(slide, kicker, 0.48, 0.22, 8, 0.26, 12, BLUE, True)
    add_text(slide, title, 0.46, 0.46, 12.2, 0.42, 26, NAVY, True)
    add_text(slide, line, 0.48, 0.96, 12.2, 0.4, 16, MUTED)
    path = ASSETS / image
    from PIL import Image

    with Image.open(path) as im:
        portrait = im.height > im.width * 1.05
    if portrait:
        fit_picture(slide, path, 4.15, 1.5, 5.05, 5.5)
    else:
        fit_picture(slide, path, 1.7, 1.5, 9.95, 5.5)
    footer(slide, page, TOTAL)


def build():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1 (v3)"
    prs.core_properties.subject = "Version 1 compared with Phase 1"
    slide_title(prs)
    comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What was already there, and what the survey gained",
        [
            ("Already in version 1", BASELINE, "base"),
            ("Added to the survey", SURVEY_NEW, "new"),
            ("Added to outreach", OUTREACH_NEW, "new"),
        ],
        2,
    )
    comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What the dashboard and the reports gained",
        [
            ("Added to the dashboard", DASHBOARD_NEW, "new"),
            ("Added to reports and the website", REPORT_NEW, "new"),
        ],
        3,
    )
    slide_compare_start(prs, 4)
    shots = [
        (
            "NEW IN PHASE 1",
            "A traditional scale",
            "Each score is a button. The label above it says what that number means.",
            "survey-scale.png",
        ),
        (
            "NEW IN PHASE 1",
            "English or Arabic host",
            "The client can hear a short sample of the host in either language before the call.",
            "survey-voice.png",
        ),
        (
            "NEW IN PHASE 1",
            "Who is answering",
            "Name, company and role are one step, and an invite can fill them in already.",
            "survey-identity.png",
        ),
        (
            "NEW IN PHASE 1",
            "The view the team opens",
            "Surveys sent, responses received and the response rate sit beside CSAT, NPS and CES.",
            "dash-overview.png",
        ),
        (
            "NEW IN PHASE 1",
            "One metric, one page",
            "CSAT, NPS and CES each open on their own page, using the same filters as the overview.",
            "dash-csat.png",
        ),
        (
            "NEW IN PHASE 1",
            "Sending the survey",
            "An invite goes to one person or a list, and it names the service being rated.",
            "dash-send.png",
        ),
        (
            "NEW IN PHASE 1",
            "Who is ahead",
            "Departments, partners and managers are ranked when a group has enough responses.",
            "dash-leaderboard.png",
        ),
    ]
    for i, (kicker, title, line, image) in enumerate(shots, start=5):
        feature_slide(prs, i, kicker, title, line, image)
    slide_reports(prs, 12)
    prs.save(OUT)
    print(OUT, "slides", 5 + len(shots))


if __name__ == "__main__":
    build()
