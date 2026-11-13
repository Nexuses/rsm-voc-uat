"""Deck v4. Does not replace v1, v2, or v3.

Adds the six theme cards and the full survey-page screenshot back, and shows
more of the dashboard. Invite rows, audit emails, user lists, reminder
addresses, and testimonials are not used as pictures.
"""

import sys
from pathlib import Path

from pptx import Presentation

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_phase1_deck as d

OUT = Path(__file__).resolve().parent / "RSM_VoC_Phase1_v4.pptx"
TOTAL = 22

SHOTS = [
    (
        "The survey a client opens",
        "This is the page they land on. Voice or typed, both ask the same three questions.",
        "survey-chooser.png",
    ),
    (
        "A traditional scale",
        "Each score is a button. The label above it says what that number means.",
        "survey-scale.png",
    ),
    (
        "English or Arabic host",
        "The client can hear a short sample of the host in either language before the call.",
        "survey-voice.png",
    ),
    (
        "Who is answering",
        "Name, company and role are one step, and an invite can fill them in already.",
        "survey-identity.png",
    ),
    (
        "Sign in, then an email code",
        "Password is the first step. The next step is a code sent to that person’s email.",
        "dash-login.png",
    ),
    (
        "Filters on the overview",
        "Dates, company, department, service, partner and manager narrow the same scores.",
        "dash-filters.png",
    ),
    (
        "A page for CSAT",
        "CSAT opens on its own, with the channel mix and how the score is calculated.",
        "dash-csat.png",
    ),
    (
        "A page for NPS",
        "NPS has the same kind of page. CES does too.",
        "dash-nps.png",
    ),
    (
        "Sending the survey",
        "An invite goes to one person or a list, and it names the service being rated.",
        "dash-send.png",
    ),
    (
        "Who has replied",
        "Sent, completed, still in progress, and still waiting, with Excel export on the same page.",
        "dash-invite-stats.png",
    ),
    (
        "Ask Your Data",
        "Ask about the scores, the themes, or who has not replied. A chart can come back with the answer.",
        "dash-insights.png",
    ),
    (
        "Who is ahead",
        "Departments, partners and managers are ranked when a group has enough responses.",
        "dash-leaderboard.png",
    ),
    (
        "Roles you define",
        "A new role gets only the ticks you choose. A partner can be limited to their own clients.",
        "dash-roles.png",
    ),
    (
        "Low scores, followed up",
        "A needs-attention survey can move across the board, from new to resolved.",
        "dash-escalations.png",
    ),
    (
        "Staff and services, remembered",
        "Departments, services and people are saved here, and the next invite can reuse them.",
        "dash-directory.png",
    ),
    (
        "Scores on the website",
        "CSAT, NPS and CES can be embedded. Names, emails and phone numbers stay off this page.",
        "dash-widget.png",
    ),
]


def build():
    d.TOTAL = TOTAL
    prs = Presentation()
    prs.slide_width = d.W
    prs.slide_height = d.H
    prs.core_properties.title = "RSM in Kuwait Voice of Clients — Phase 1 (v4)"
    prs.core_properties.subject = "Version 1 compared with Phase 1"
    d.slide_title(prs)
    d.slide_themes(prs)
    d.comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What was already there, and what the survey gained",
        [
            ("Already in version 1", d.BASELINE, "base"),
            ("Added to the survey", d.SURVEY_NEW, "new"),
            ("Added to outreach", d.OUTREACH_NEW, "new"),
        ],
        3,
    )
    d.comparison(
        prs,
        "VERSION 1 AND PHASE 1",
        "What the dashboard and the reports gained",
        [
            ("Added to the dashboard", d.DASHBOARD_NEW, "new"),
            ("Added to reports and the website", d.REPORT_NEW, "new"),
        ],
        4,
    )
    d.slide_compare_start(prs, 5)
    for offset, (title, line, image) in enumerate(SHOTS):
        d.feature_slide(prs, 6 + offset, "NEW IN PHASE 1", title, line, image)
    d.slide_reports(prs, 6 + len(SHOTS))
    prs.save(OUT)
    print(OUT, "slides", 6 + len(SHOTS))


if __name__ == "__main__":
    build()
