# Hand this to Claude with the screenshots

Improve `docs/presentations/RSM_VoC_Phase1_v6.pptx`. Do not overwrite it. Write `build_phase1_deck_v7.py` and save only `docs/presentations/RSM_VoC_Phase1_v7.pptx`. Leave `RSM_VoC_Phase1.pptx` and `_v1` through `_v6` untouched. Do not run `build_phase1_deck.py` (it regenerates v3).

Read `PROJECT_BRIEF.md` and `MEMORY.md` before changing a claim. If you change the deck, add a dated `MEMORY.md` task-history entry and run `npm run memory:check`. Do not commit. Do not invent features, survey questions, Arabic copy, or client facts. Do not put a client or staff email, a response row, the testimonials list, the user list, or the audit log in a slide.

Stack: python-pptx. Widescreen 13.333 × 7.5 in. Navy `#00153D`, green `#3F9C35`, blue `#009CDE`, ink `#231F20`, muted `#575756`, pale `#F4F6F7`. Font Calibri. Letterbox images. Set `TOTAL` before building.

## What v6 already is

Version 1 is the June 2026 product. Phase 1 is what landed after that. v6 is 20 slides:

1. Title
2. Six cards
3–4. Tick lists (grey tick = already in version 1; green tick = Phase 1)
5. Before / after survey opening
6–9. Survey screens, labelled CHANGED
10–13. Leaderboard, portfolio access, low-score board, directory
14. Invite fields (existing page, new fields)
15. Filter bar only
16. Reminder rule (cropped above the CC addresses)
17. Testimonial steps
18. Delete invite / remove a response
19. Portal vs RSM system
20. Three report PDFs

Keep that shape. Polish layout and captions. Do not put the widget, CSAT, NPS, or CES dashboard pages back, and do not call them new.

## Sheet items, and the truth to keep

- P1-01 Low-score flag. Live: CSAT ≤2, CES ≤3, or NPS ≤6 is flagged, and a negative overall result emails the partner (partner, business manager, and job manager are CC'd). The escalations board is the CX follow-up. Not live: assigning training. `training.rules` defaults to off. RSM raising the partner task is RSM's system, not a portal screen.
- P1-02 / P1-16 Logins. Live: system role `portfolio` is partner / job manager read access, scoped by that person's staff email. Admin and CX see the firm. Do not say access is only at partner level.
- P1-03 Testimonials. Live: one portal thank-you; when the combined score is above 80% of 22, it asks for a testimonial. A comment produces an AI draft the client approves or edits, with name and website/social consent. No comment asks for a written testimonial or a video link. Not live: a partner-created testimonial link. Do not use the unfinished example "NPS 9 / CES 6".
- P1-04 Prefill. Live on the typed survey: name, email, company, designation from the invite, still editable. Do not claim the voice survey prefills the same way.
- P1-05 One thank-you. The portal thank-you itself is version 1. Phase 1 adds the testimonial ask inside it. Do not make a slide that says the thank-you email is new. RSM switching off its own mail is an RSM IT action, not a screen.
- P1-06 Comments stay optional. True, and it is a no-change. Do not give it a slide. One line on the testimonial slide is enough.
- P1-07 Delete. Live for an admin: delete an invitation (a received response is kept; reminders stop) and exclude or delete a response so it leaves the scores. There is no safe screenshot; the tracker table contains emails.
- P1-08 PDF type. The three report images are this. Do not add another PDF slide.
- P1-09 Leaderboard. Live. Already has a slide.
- P1-10 AI narrative. Live on the annual PDF only. The period PDF has no narrative. Do not say every PDF is written by AI.
- P1-11 Ownership. Portal: invite, survey reminder, single thank-you, dashboards, reports. RSM system: the partner task and training. Survey reminders do not move to RSM.
- P1-12 Survey delivery, tracking, reminders, voice or typed, insights. Version 1. Do not mark them new.
- P1-13 Reminders. Live: every 3 days, maximum 5, Kuwait Friday and Saturday skipped. Opens and clicks do not stop them; submission, stop, or the max does.
- P1-14 Filters. The overview page is version 1. Phase 1 added service, manager, and the date range on top of department and partner. The crop must not include the KPI rings. That source image shows NPS as 88%, which was a bug fixed on 4 Nov.
- P1-15 Invite fields. The send page is older. The added fields are department, service, partner, business manager, job manager, their emails, team leader, project id, and survey order. `client@example.com` in the shot is a placeholder.
- P1-17 Period PDF. Live as a separate download for the exact dates. It is not the annual file and it has no year-before comparison.

## Screenshots Claude may use

All under `docs/presentations/assets/`:

- `survey-chooser.png`, `survey-scale.png`, `survey-voice.png`, `survey-identity.png` — current survey redesign. The scale is numbered buttons, never a slider.
- Old chooser, for the before side only: `tests/e2e/survey.spec.ts-snapshots/survey-mode-chooser-en-chromium.png`
- `dash-leaderboard.png`, `dash-roles.png`, `dash-escalations.png`, `dash-directory.png`
- `dash-send.png` — invite fields, placeholder email only
- `dash-filters-only.png` — filter bar. Do not switch back to `dash-filters.png`
- `dash-reminders-crop.png` — interval 3 and max 5. Do not use the full reminders screenshot
- `dash-invite-stats.png` — counts only (110 shown, 8 completed, 44 in progress, 58 awaiting). Do not use the full invite tracker
- `report-cover.png`, `report-kpis.png` (calculation page), `report-csat.png`

Do not use: `dash-widget.png`, `dash-csat.png`, `dash-nps.png`, `dash-overview.png`, `dash-insights.png`, `dash-login.png`, anything in `docs/dashboard-walkthrough/screenshots/` (emails, the testimonials list, the user list, the audit log, reminder CC addresses, and a personal thank-you). Do not use annual PDF page 3 ("How We Listen") or page 8 ("Sample Name").

Survey shots are from the UAT branch `feature/survey-ui-overhaul-uat`. Production still has the older survey until that merges. Say they are the Phase 1 redesign, not that they are already on production.
