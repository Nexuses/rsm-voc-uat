"""Deck v5. Does not replace v1–v4.

Version 1 is the June 2026 product. Phase 1 is what landed after that.
The public score widget and the CSAT, NPS, and CES report pages are version 1,
so they are not shown as new screens.
"""

import sys
from pathlib import Path

from pptx import Presentation

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_phase1_deck as d

OUT = Path(__file__).resolve().parent / "RSM_VoC_Phase1_v5.pptx"
TOTAL = 14

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
    "Reminders can be stopped and turned back on",
    "The invite email names the service",
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
    "A partner sees only their own clients",
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
        "These steps were rebuilt as a split screen. An invite can fill the fields in.",
        "survey-identity.png",
    ),
    (
        "NEW IN PHASE 1",
        "Who is ahead",
        "Departments, partners and managers can be ranked. This page was not in version 1.",
        "dash-leaderboard.png",
    ),
    (
        "NEW IN PHASE 1",
        "Roles you define",
        "A role gets only the ticks you choose. A partner can be limited to their own clients.",
        "dash-roles.png",
    ),
    (
        "NEW IN PHASE 1",
        "Low scores, followed up",
        "A needs-attention survey can move across a board, from new to resolved.",
        "dash-escalations.png",
    ),
    (
        "NEW IN PHASE 1",
        "Staff and services, remembered",
        "Departments, services and people are saved here, and the next invite can reuse them.",
        "dash-directory.png",
    ),
]


def slide_compare_start(prs):
    slide = d.blank(prs)
    d.title_bar(slide, "CHANGED IN PHASE 1", "How a client starts")
    d.add_text(
        slide,
        "Version 1 on the left. Phase 1 on the right. Same choice of voice or typed. The screen was redesigned.",
        0.48,
        1.12,
        12.2,
        0.36,
        15,
        d.MUTED,
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
        0.48,
        1.18,
        12.2,
        0.4,
        16,
        d.MUTED,
    )
    cards = [
        (d.GREEN, "Survey", "The opening, the typed steps and the rating scale were redesigned."),
        (d.BLUE, "Voice", "The host step now plays a short sample in English or Arabic."),
        (d.NAVY, "Outreach", "A positive result can ask for a testimonial. A negative result alerts the team."),
        (d.GREEN, "Dashboard", "A leaderboard, an escalations board, and roles that limit what each person sees."),
        (d.BLUE, "Reports", "Branded files for the year, any dates, one metric, or one partner."),
        (d.NAVY, "Access", "An email code at sign-in. A partner sees only their own clients."),
    ]
    for i, (color, head, body) in enumerate(cards):
        col, row = i % 3, i // 3
        x = 0.48 + col * 4.22
        y = 1.85 + row * 2.5
        d.rect(slide, x, y, 4.02, 2.28, d.PALE)
        d.rect(slide, x, y, 0.1, 2.28, color)
        d.add_text(slide, head, x + 0.35, y + 0.28, 3.4, 0.45, 22, d.NAVY, True)
        d.add_text(slide, body, x + 0.35, y + 0.9, 3.4, 1.1, 15, d.INK)
    d.footer(slide, 2, TOTAL)


def build():
    d.TOTAL = TOTAL
    prs = Presentation()
    prs.slide_width = d.W
    prs.slide_height = d.H
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1 (v5)"
    prs.core_properties.subject = "Version 1 compared with Phase 1"
    d.slide_title(prs)
    slide_themes(prs)
    d.comparison(
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
    d.comparison(
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
        d.feature_slide(prs, 6 + offset, kicker, title, line, image)
    d.slide_reports(prs, 6 + len(SHOTS))
    prs.save(OUT)
    print(OUT, "slides", 6 + len(SHOTS))


if __name__ == "__main__":
    build()
