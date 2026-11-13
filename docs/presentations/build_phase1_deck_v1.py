"""Rebuild of the first deck, kept so later versions do not replace it.

Output: RSM_VoC_Phase1_v1.pptx
The original file was overwritten. This is that deck, generated again.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches

import build_phase1_deck as d

OUT = Path(__file__).resolve().parent / "RSM_VoC_Phase1_v1.pptx"
TOTAL = 11
OLD_CHOOSER = (
    Path(__file__).resolve().parents[2]
    / "tests/e2e/survey.spec.ts-snapshots/survey-mode-chooser-en-chromium.png"
)

SURVEY_NEW = [
    "New opening and split-screen steps, on a phone as well as a desk",
    "Every score is visible. The drag slider is gone. Answers can be reviewed",
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


def slide_frame(prs):
    slide = d.blank(prs)
    d.title_bar(slide, "THE WORK", "Three things changed")
    d.add_text(
        slide,
        "Version 1 collected the three scores and showed them. Phase 1 is the product around that.",
        0.48, 1.15, 12, 0.4, 16, d.MUTED,
    )
    cards = [
        (d.GREEN, "01", "The survey", "A client can finish it by voice or on screen, in English or Arabic, without guessing the scale."),
        (d.BLUE, "02", "The report", "The team downloads a branded report for the year, a date range, one metric, or one partner."),
        (d.NAVY, "03", "The dashboard", "Invites, follow-up, roles, rankings and the responses themselves sit in one place."),
    ]
    for i, (color, num, head, body) in enumerate(cards):
        x = 0.48 + i * 4.2
        d.rect(slide, x, 1.9, 3.95, 4.35, d.PALE)
        d.rect(slide, x, 1.9, 3.95, 0.1, color)
        d.add_text(slide, num, x + 0.28, 2.2, 3, 0.5, 22, color, True)
        d.add_text(slide, head, x + 0.28, 2.85, 3.4, 0.6, 26, d.NAVY, True)
        d.add_text(slide, body, x + 0.28, 3.65, 3.4, 1.8, 16, d.INK)
    d.footer(slide, 2, TOTAL)


def slide_scale(prs):
    slide = d.blank(prs)
    d.title_bar(slide, "SURVEY", "How a score is given")
    d.add_text(slide, "Version 1", 0.48, 1.18, 5, 0.28, 14, d.SLATE, True)
    d.add_text(slide, "Phase 1", 6.85, 1.18, 5, 0.28, 14, d.GREEN, True)
    d.rect(slide, 0.48, 1.6, 5.9, 5.1, d.PALE)
    d.add_text(slide, "Drag the slider", 0.8, 2.55, 5.2, 0.4, 20, d.NAVY, True, align=PP_ALIGN.CENTER)
    d.rect(slide, 1.15, 3.45, 4.5, 0.08, RGBColor(0xD0, 0xD4, 0xD6))
    d.rect(slide, 1.15, 3.45, 2.15, 0.08, d.BLUE)
    oval = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(3.05), Inches(3.28), Inches(0.42), Inches(0.42))
    oval.fill.solid()
    oval.fill.fore_color.rgb = d.WHITE
    oval.line.color.rgb = d.BLUE
    oval.line.width = d.Pt(2.5) if False else __import__("pptx").util.Pt(2.5)
    for i, n in enumerate(["1", "2", "3", "4", "5"]):
        d.add_text(slide, n, 1.05 + i * 1.05, 3.85, 0.5, 0.35, 14, d.MUTED, True, align=PP_ALIGN.CENTER)
    d.add_text(
        slide,
        "The handle sat on a number before anyone had answered.",
        0.85, 4.7, 5.15, 0.8, 14, d.MUTED, align=PP_ALIGN.CENTER,
    )
    d.fit_picture(slide, d.ASSETS / "survey-scale.png", 6.85, 1.6, 6.0, 5.1)
    d.footer(slide, 6, TOTAL)


def pair(prs, page, kicker, title, left_label, left, right_label, right):
    slide = d.blank(prs)
    d.title_bar(slide, kicker, title)
    d.add_text(slide, left_label, 0.48, 1.15, 6, 0.3, 14, d.NAVY, True)
    d.add_text(slide, right_label, 6.9, 1.15, 6, 0.3, 14, d.NAVY, True)
    d.fit_picture(slide, left, 0.48, 1.52, 6.05, 5.2)
    d.fit_picture(slide, right, 6.9, 1.52, 5.95, 5.2)
    d.footer(slide, page, TOTAL)


def slide_close(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    d.rect(slide, 0, 0, 13.333, 7.5, d.NAVY)
    d.rect(slide, 0, 0, 0.18, 7.5, d.GREEN)
    d.add_text(slide, "PHASE 1", 0.7, 1.45, 8, 0.3, 14, d.GREEN, True)
    d.add_text(slide, "The tool is no longer\nonly a survey.", 0.68, 1.9, 11, 1.7, 40, d.WHITE, True)
    lines = [
        "A client finishes in English or Arabic, by voice or by typing.",
        "The team invites, reminds, and hands over a report.",
        "A partner opens the dashboard and sees their own clients.",
    ]
    for i, line in enumerate(lines):
        y = 4.15 + i * 0.55
        d.rect(slide, 0.72, y + 0.08, 0.16, 0.16, d.GREEN)
        d.add_text(slide, line, 1.1, y, 10, 0.4, 18, d.WHITE, anchor=MSO_ANCHOR.MIDDLE)
    d.add_text(slide, "RSM in Kuwait   ·   Voice of Clients", 0.7, 6.9, 10, 0.3, 14, RGBColor(0x9A, 0xC8, 0xE8))


def build():
    saved_total = d.TOTAL
    d.TOTAL = TOTAL
    prs = Presentation()
    prs.slide_width = d.W
    prs.slide_height = d.H
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1 (v1)"
    d.slide_title(prs)
    slide_frame(prs)
    d.comparison(
        prs,
        "THE FULL LIST",
        "Version 1, and what the survey gained",
        [
            ("Already in version 1", d.BASELINE, "base"),
            ("Added to the survey", SURVEY_NEW, "new"),
            ("Added to outreach", OUTREACH_NEW, "new"),
        ],
        3,
    )
    d.comparison(
        prs,
        "THE FULL LIST",
        "What the dashboard and the reports gained",
        [
            ("Added to the dashboard", d.DASHBOARD_NEW, "new"),
            ("Added to reports and the website", d.REPORT_NEW, "new"),
        ],
        4,
    )
    slide = d.blank(prs)
    d.title_bar(slide, "SURVEY", "How a client starts")
    d.add_text(slide, "Version 1", 0.48, 1.18, 5, 0.3, 14, d.SLATE, True)
    d.add_text(slide, "Phase 1", 6.9, 1.18, 5, 0.3, 14, d.GREEN, True)
    d.fit_picture(slide, OLD_CHOOSER, 0.48, 1.55, 5.9, 5.15)
    d.fit_picture(slide, d.ASSETS / "survey-chooser.png", 6.9, 1.55, 5.95, 5.15)
    d.footer(slide, 5, TOTAL)
    slide_scale(prs)
    pair(
        prs, 7, "SURVEY", "The host, and the typed steps",
        "English or Arabic host", d.ASSETS / "survey-voice.png",
        "Who the feedback is from", d.ASSETS / "survey-identity.png",
    )
    pair(
        prs, 8, "DASHBOARD", "The view the team opens",
        "", d.ASSETS / "dash-overview.png",
        "", d.ASSETS / "dash-csat.png",
    )
    pair(
        prs, 9, "DASHBOARD", "Send a survey, and see who leads",
        "", d.ASSETS / "dash-send.png",
        "", d.ASSETS / "dash-leaderboard.png",
    )
    d.slide_reports(prs, 10)
    slide_close(prs)
    prs.save(OUT)
    d.TOTAL = saved_total
    print(OUT)


if __name__ == "__main__":
    build()
