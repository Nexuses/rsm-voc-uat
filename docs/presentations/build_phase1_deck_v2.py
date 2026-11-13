"""Marketing deck: Voice of Clients, Phase 1.

One overview of six themes, then one screenshot and one sentence per major change.
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
OUT = ROOT / "RSM_VoC_Phase1.pptx"
TOTAL = 11

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
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1"
    prs.core_properties.subject = "Phase 1, one slide per major change"
    slide_title(prs)
    slide_themes(prs)
    shots = [
        (
            "SURVEY",
            "How a client starts",
            "They choose a short voice conversation, or the same three questions on screen.",
            "survey-chooser.png",
        ),
        (
            "SURVEY",
            "A traditional scale",
            "Each score is a button. The label above it says what that number means.",
            "survey-scale.png",
        ),
        (
            "SURVEY",
            "English or Arabic host",
            "The client can hear a short sample of the host in either language before the call.",
            "survey-voice.png",
        ),
        (
            "SURVEY",
            "Who is answering",
            "Name, company and role are one step, and an invite can fill them in already.",
            "survey-identity.png",
        ),
        (
            "DASHBOARD",
            "The view the team opens",
            "Surveys sent, responses received and the response rate sit beside CSAT, NPS and CES.",
            "dash-overview.png",
        ),
        (
            "DASHBOARD",
            "One metric, one page",
            "CSAT, NPS and CES each open on their own page, using the same filters as the overview.",
            "dash-csat.png",
        ),
        (
            "DASHBOARD",
            "Sending the survey",
            "An invite goes to one person or a list, and it names the service being rated.",
            "dash-send.png",
        ),
        (
            "DASHBOARD",
            "Who is ahead",
            "Departments, partners and managers are ranked when a group has enough responses.",
            "dash-leaderboard.png",
        ),
        (
            "REPORTS",
            "The report that downloads",
            "This is the CSAT page. NPS, CES, the annual report and a partner report are built the same way.",
            "report-csat.png",
        ),
    ]
    for i, (kicker, title, line, image) in enumerate(shots, start=3):
        feature_slide(prs, i, kicker, title, line, image)
    prs.save(OUT)
    print(OUT, "slides", 2 + len(shots))


if __name__ == "__main__":
    build()
