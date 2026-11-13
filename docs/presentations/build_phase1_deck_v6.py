"""Deck v6. Does not replace v1–v5.

Adds the client sheet items that were missing from v5, and only where the
product actually does them. Training assignment and partner-created testimonial
links are not shown as live.
"""

import sys
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_phase1_deck as d

OUT = Path(__file__).resolve().parent / "RSM_VoC_Phase1_v6.pptx"
TOTAL = 20

BASELINE = [
    "Voice survey and typed survey",
    "CSAT, CES and NPS, with a comment",
    "English and Arabic",
    "An insight on every response",
    "Ask Your Data, including charts",
    "Public score widget",
    "Signed-in overview",
    "CSAT, NPS and CES report pages",
    "Tracked invites, a list import, and the invite tracker",
    "A thank-you email after a completed invite",
    "CRM can send the invite",
]

SURVEY_NEW = [
    "The opening screen and the typed steps were redesigned",
    "A traditional scale: every score is a button, then a review of the answers",
    "The voice host can be sampled before the call",
    "Hold, end and live captions on the voice call",
    "An invite fills in the name, company and role",
    "A testimonial ask when the overall result is positive",
]

OUTREACH_NEW = [
    "Reminders every 3 days, up to 5, never on Friday or Saturday",
    "Reminders can be stopped and turned back on",
    "The invite email names the service",
    "The invite records service, partner, both managers, project and survey order",
    "An admin can delete a duplicate invite",
    "Team email copies the partner and managers, in Kuwait time",
    "A negative result raises a separate alert",
    "Positive, Neutral or Negative from the combined score",
    "A private page of that client’s scores",
    "Directory of departments, services and staff",
    "If the same person replies again in the quarter, the latest score counts",
]

DASHBOARD_NEW = [
    "Email code on every sign-in",
    "Roles for admin, CX and surveyor, plus roles you create",
    "A partner or job manager sees only their own clients",
    "Change your own password",
    "Audit log",
    "Service and manager filters, as well as department and partner",
    "Leaderboard by department, partner and manager",
    "Excel export of responses and of the invite tracker",
    "Exclude or delete a response",
    "Read the voice transcript beside the scores",
    "Testimonials library",
    "Escalations board for low scores",
    "Ask Your Data can answer invite questions",
    "A warning when voice credits run low",
]

REPORT_NEW = [
    "Annual report, with a written narrative and the year before",
    "A report for the exact dates you choose",
    "A one-page PDF for CSAT, NPS or CES",
    "A three-page report for one partner",
    "Larger type, in the RSM layout, ready to share",
    "Weekly, monthly and quarterly packs by email",
    "A reviews showcase on the website. Name and company only",
]

SHOTS = [
    (
        "CHANGED IN PHASE 1",
        "The survey a client opens",
        "This screen was redesigned. Choosing voice or typed was already there.",
        "survey-chooser.png",
    ),
    (
        "CHANGED IN PHASE 1",
        "A traditional scale",
        "The slider was replaced. Each score is a button, with its meaning written above it.",
        "survey-scale.png",
    ),
    (
        "CHANGED IN PHASE 1",
        "The voice host",
        "The host step was redesigned. The client can play a short sample in English or Arabic.",
        "survey-voice.png",
    ),
    (
        "CHANGED IN PHASE 1",
        "The typed steps",
        "These steps were rebuilt as a split screen. An invite fills in the name, company and role. The client can still edit them.",
        "survey-identity.png",
    ),
    (
        "NEW IN PHASE 1",
        "Who is ahead",
        "Departments, partners and managers can be ranked for a chosen period. This page was not in version 1.",
        "dash-leaderboard.png",
    ),
    (
        "NEW IN PHASE 1",
        "Each person sees their own work",
        "A partner or job manager signs in and sees only the clients tied to them. Leadership and the CX team see the whole firm.",
        "dash-roles.png",
    ),
    (
        "NEW IN PHASE 1",
        "A low score is flagged",
        "CSAT of 2 or below, CES of 3 or below, or NPS of 6 or below is flagged. A negative result emails the partner. Training assignment is the next step, and is not live here.",
        "dash-escalations.png",
    ),
    (
        "NEW IN PHASE 1",
        "Staff and services, remembered",
        "Departments, services and people are saved here, and the next invite can reuse them.",
        "dash-directory.png",
    ),
    (
        "ADDED IN PHASE 1",
        "The invite carries the engagement",
        "Service, partner, both managers, project and survey order travel with the invite. This page was already there. These fields were added.",
        "dash-send.png",
    ),
    (
        "ADDED IN PHASE 1",
        "Filters on the results",
        "Date, department, service, partner and manager. The overview page itself was already in version 1.",
        "dash-filters-only.png",
    ),
    (
        "ADDED IN PHASE 1",
        "A reminder every 3 days",
        "Someone who has not finished gets a reminder every 3 days, up to 5 times. Friday and Saturday are skipped.",
        "dash-reminders-crop.png",
    ),
]


def feature_slide(prs, page, kicker, title, line, image):
    slide = d.blank(prs)
    d.rect(slide, 0, 0, 13.333, 0.08, d.GREEN)
    d.add_text(slide, kicker, 0.48, 0.2, 8, 0.24, 12, d.BLUE, True)
    d.add_text(slide, title, 0.46, 0.42, 12.2, 0.38, 26, d.NAVY, True)
    d.add_text(slide, line, 0.48, 0.84, 12.3, 0.62, 15, d.MUTED)
    path = d.ASSETS / image
    from PIL import Image

    with Image.open(path) as im:
        portrait = im.height > im.width * 1.05
    if portrait:
        d.fit_picture(slide, path, 4.15, 1.55, 5.05, 5.4)
    else:
        d.fit_picture(slide, path, 1.15, 1.55, 11.0, 5.4)
    d.footer(slide, page, TOTAL)


def comparison(prs, kicker, title, sections, page):
    slide = d.blank(prs)
    d.title_bar(slide, kicker, title)
    y = 1.15
    d.rect(slide, 0.4, y, 12.55, 0.32, d.NAVY)
    d.add_text(slide, "Feature", 0.55, y, 8, 0.32, 11, d.WHITE, True, anchor=MSO_ANCHOR.MIDDLE)
    d.add_text(slide, "Version 1", 8.7, y, 1.9, 0.32, 11, d.WHITE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    d.add_text(slide, "Phase 1", 10.7, y, 2.05, 0.32, 11, d.WHITE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    rows = []
    for label, items, kind in sections:
        rows.append(("section", label, False))
        for item in items:
            rows.append(("item", item, kind == "base"))
    top, bottom = 1.48, 7.05
    gap = (bottom - top) / len(rows)
    size = 10 if len(rows) > 28 else 11
    for i, (kind, label, v1) in enumerate(rows):
        yy = top + i * gap
        if kind == "section":
            d.rect(slide, 0.4, yy, 12.55, gap, d.PALE)
            d.add_text(slide, label, 0.55, yy, 8, gap, size, d.NAVY, True, anchor=MSO_ANCHOR.MIDDLE)
            continue
        if not v1:
            d.rect(slide, 0.4, yy, 12.55, gap, d.GREEN_WASH)
        elif i % 2 == 0:
            d.rect(slide, 0.4, yy, 12.55, gap, RGBColor(0xFA, 0xFB, 0xFB))
        d.add_text(slide, label, 0.55, yy, 8.0, gap, size, d.INK, anchor=MSO_ANCHOR.MIDDLE)
        if v1:
            d.add_text(slide, "✓", 8.7, yy, 1.9, gap, size + 2, d.SLATE, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        d.add_text(slide, "✓", 10.7, yy, 2.05, gap, size + 3, d.GREEN, True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    d.footer(slide, page, TOTAL)


def slide_compare_start(prs):
    slide = d.blank(prs)
    d.title_bar(slide, "CHANGED IN PHASE 1", "How a client starts")
    d.add_text(
        slide,
        "Version 1 on the left. Phase 1 on the right. Same choice of voice or typed. The screen was redesigned.",
        0.48, 1.12, 12.2, 0.36, 15, d.MUTED,
    )
    d.add_text(slide, "Version 1", 0.48, 1.52, 5.8, 0.28, 13, d.SLATE, True)
    d.add_text(slide, "Phase 1", 6.95, 1.52, 5.8, 0.28, 13, d.GREEN, True)
    d.fit_picture(slide, d.OLD_CHOOSER, 0.48, 1.84, 5.9, 4.95)
    d.fit_picture(slide, d.ASSETS / "survey-chooser.png", 6.95, 1.84, 5.9, 4.95)
    d.footer(slide, 5, TOTAL)


def slide_themes(prs):
    slide = d.blank(prs)
    d.title_bar(slide, "PHASE 1", "What actually changed")
    d.add_text(
        slide,
        "Version 1 already had the survey, the three scores, the report pages, and the score widget.",
        0.48, 1.18, 12.2, 0.4, 16, d.MUTED,
    )
    cards = [
        (d.GREEN, "Survey", "The opening, the typed steps and the rating scale were redesigned. An invite fills in the name and company."),
        (d.BLUE, "Voice", "The host step now plays a short sample in English or Arabic."),
        (d.NAVY, "Outreach", "One thank-you from the portal. A good result asks for a testimonial. A low result emails the partner."),
        (d.GREEN, "Dashboard", "A leaderboard, a low-score board, and a login that shows each partner only their own clients."),
        (d.BLUE, "Reports", "Branded files for the year, any dates, one metric, or one partner, with a written narrative on the annual file."),
        (d.NAVY, "Access", "An email code at sign-in. A partner or job manager sees only their own clients."),
    ]
    for i, (color, head, body) in enumerate(cards):
        col, row = i % 3, i // 3
        x = 0.48 + col * 4.22
        y = 1.85 + row * 2.5
        d.rect(slide, x, y, 4.02, 2.28, d.PALE)
        d.rect(slide, x, y, 0.1, 2.28, color)
        d.add_text(slide, head, x + 0.35, y + 0.22, 3.4, 0.4, 22, d.NAVY, True)
        d.add_text(slide, body, x + 0.35, y + 0.72, 3.45, 1.35, 14, d.INK)
    d.footer(slide, 2, TOTAL)


def card(slide, x, y, w, h, kicker, title, body, color):
    d.rect(slide, x, y, w, h, d.PALE)
    d.rect(slide, x, y, 0.1, h, color)
    d.add_text(slide, kicker, x + 0.32, y + 0.22, w - 0.5, 0.28, 12, color, True)
    d.add_text(slide, title, x + 0.32, y + 0.52, w - 0.5, 0.7, 18, d.NAVY, True)
    d.add_text(slide, body, x + 0.32, y + 1.3, w - 0.5, h - 1.5, 14, d.INK)


def slide_testimonial(prs, page):
    slide = d.blank(prs)
    d.title_bar(slide, "NEW IN PHASE 1", "A testimonial, without waiting")
    d.add_text(
        slide,
        "One thank-you email leaves the portal. When the combined score is above 80% of 22, that email asks for a testimonial. The comment box stays optional.",
        0.48, 1.15, 12.3, 0.55, 15, d.MUTED,
    )
    steps = [
        (d.GREEN, "01", "A good result", "The combined CSAT, CES and NPS score is above 80% of 22. The thank-you then includes the ask."),
        (d.BLUE, "02", "They wrote a comment", "AI drafts a short testimonial from those words. The client approves or edits it, and chooses name and where it may be published."),
        (d.NAVY, "03", "No comment", "The same thank-you asks for a written testimonial or a video link instead."),
    ]
    for i, (color, num, title, body) in enumerate(steps):
        x = 0.48 + i * 4.22
        card(slide, x, 1.9, 4.02, 4.55, num, title, body, color)
    d.footer(slide, page, TOTAL)


def slide_cleanup(prs, page):
    slide = d.blank(prs)
    d.title_bar(slide, "NEW IN PHASE 1", "Clean up a bad invite or a bad response")
    d.add_text(
        slide,
        "For admins. A duplicate invite can be removed so the reminder stops. A wrong response can be taken out of the scores.",
        0.48, 1.15, 12.3, 0.5, 15, d.MUTED,
    )
    card(
        slide, 0.48, 1.9, 6.05, 4.55, "INVITE",
        "Delete a duplicate invite",
        "An incomplete or repeated invitation can be deleted. Follow-up reminders stop. A survey response that already came in is kept.",
        d.GREEN,
    )
    card(
        slide, 6.8, 1.9, 6.05, 4.55, "RESPONSE",
        "Remove a wrong response",
        "An admin can exclude a response from the scores, or delete it, so a corrected response can take its place.",
        d.NAVY,
    )
    d.footer(slide, page, TOTAL)


def slide_ownership(prs, page):
    slide = d.blank(prs)
    d.title_bar(slide, "PHASE 1", "What each system owns")
    d.add_text(
        slide,
        "Survey reminders stay in the portal. The partner’s task, and any training that follows, stay in RSM’s system.",
        0.48, 1.15, 12.3, 0.5, 15, d.MUTED,
    )
    card(
        slide, 0.48, 1.9, 6.05, 4.55, "PORTAL",
        "Client communication and the numbers",
        "The invite, the survey reminder, and the single thank-you. The dashboards, the leaderboard, and the reports a partner can share.",
        d.GREEN,
    )
    card(
        slide, 6.8, 1.9, 6.05, 4.55, "RSM SYSTEM",
        "The partner’s task",
        "Raising the task, closing it, and assigning training. The training link is not live in the portal. RSM’s side is still to be connected.",
        d.NAVY,
    )
    d.footer(slide, page, TOTAL)


def slide_reports(prs, page):
    slide = d.blank(prs)
    d.title_bar(slide, "NEW IN PHASE 1", "Reports you can hand over")
    d.add_text(
        slide,
        "Version 1 downloaded one PDF of the dashboard. These use a larger RSM layout. The annual file adds a written narrative. A separate file covers only the dates you choose.",
        0.48, 1.12, 12.3, 0.5, 15, d.MUTED,
    )
    cards = [
        (d.ASSETS / "report-cover.png", "Annual, with a narrative"),
        (d.ASSETS / "report-kpis.png", "The year, with the year before"),
        (d.ASSETS / "report-csat.png", "One metric, one page"),
    ]
    for i, (path, caption) in enumerate(cards):
        x = 0.48 + i * 4.25
        d.fit_picture(slide, path, x, 1.7, 4.0, 4.6)
        d.add_text(slide, caption, x, 6.4, 4.0, 0.32, 13, d.NAVY, True, align=PP_ALIGN.CENTER)
    d.footer(slide, page, TOTAL)


def build():
    d.TOTAL = TOTAL
    prs = Presentation()
    prs.slide_width = d.W
    prs.slide_height = d.H
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1 (v6)"
    prs.core_properties.subject = "Version 1 compared with Phase 1"
    d.slide_title(prs)
    slide_themes(prs)
    comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What was already there, and what the survey gained",
        [
            ("Already in version 1", BASELINE, "base"),
            ("Changed or added on the survey", SURVEY_NEW, "new"),
            ("Added to outreach", OUTREACH_NEW, "new"),
        ],
        3,
    )
    comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What the dashboard and the reports gained",
        [
            ("Added to the dashboard", DASHBOARD_NEW, "new"),
            ("Added to reports and the website", REPORT_NEW, "new"),
        ],
        4,
    )
    slide_compare_start(prs)
    for offset, (kicker, title, line, image) in enumerate(SHOTS):
        feature_slide(prs, 6 + offset, kicker, title, line, image)
    next_page = 6 + len(SHOTS)
    slide_testimonial(prs, next_page)
    slide_cleanup(prs, next_page + 1)
    slide_ownership(prs, next_page + 2)
    slide_reports(prs, next_page + 3)
    prs.save(OUT)
    print(OUT, "slides", next_page + 3)


if __name__ == "__main__":
    build()
