# RSM in Kuwait – Voice of Clients (CX) Annual Report – PDF template

## Run it
    pip install -r requirements.txt
    playwright install chromium
    python build_report.py                          # reads data/report_data.json
    python build_report.py data/2026-27.json        # another data file
    python build_report.py data.json out/report.pdf # custom output path

Output goes to `output/RSM_Kuwait_CX_Report_<year>.pdf` (12+ pages, A4).

## What you edit each year: `data/report_data.json`
| Block | Fields |
|---|---|
| `period` | `start_date`, `end_date` (ISO). Drives cover, every footer, "2025–26", "year ending…", © year, chart year labels |
| `responses` | `surveys_sent`, `received`, `prev_received`, `prev_response_rate_pct` |
| `csat` | `very_satisfied` (5), `satisfied` (4), `neutral` (3), `dissatisfied` (1–2) as counts, `prev_pct`, `target_pct` |
| `nps` | `promoters` (9–10), `neutral` (7–8), `detractors` (0–6) as counts, `prev_score`, `target` |
| `ces` | `rating_7` … `rating_1`: count of responses at each native 1–7 rating, `prev_score` (mean on 1–7), `target` (reset for the 1–7 scale) |
| `testimonials` | list of `{quote, name?, company?}` (name and company optional) – any number; pages are added automatically (3 on the first page, then ~4 per page) |

Enter **raw counts only**. The script calculates CSAT %, NPS, CES, bar widths and percentages, the
calculation breakdown on the "Customer Satisfaction / NPS / CES" pages, previous-vs-current deltas
(up/down arrows and colours flip automatically), gauges, charts and the "Exceeds / Meets / Below target" wording.
It prints a warning if the CSAT / NPS / CES counts don't add up to `responses.received`.

## Wording that adapts to the numbers
Sentences that depend on results (volume "more than doubled / grew / fell", "improved / unchanged / declined",
"Exceeds target / Below target", "Each measure improved…", conclusion paragraph) are generated in
`build_report.py → narrative()`. To hand-write any of them for a given year, add it to `text_overrides`:

    "text_overrides": { "conclusion": "…", "csat_para": "…" }

Keys: `resp_para`, `p7_resp`, `csat_para`, `nps_para`, `ces_para`, `p7_intro`, `p7_sub`,
`csat_blurb`, `nps_blurb`, `ces_blurb`, `conclusion`, and the scale statements `how_rate` (page 4), `nps_method`, `ces_method` (page 7).

**Scales (live VoC, survey version three-metric-v2):** CSAT 1–5 (favourable 4–5), NPS 0–10 (promoters 9–10, neutral 7–8, detractors 0–6), CES 1–7. CES is shown in five display groups (6–7 Very Easy, 5 Easy, 4 Neutral, 3 Difficult, 1–2 Very Difficult); the score is the mean of all seven ratings. The CES gauge needle maps the mean piecewise onto those five bands.

## Editing fixed copy / design
* Fixed text lives in `templates/pages/pNN.html.j2` (one file per page; p08/p09 testimonials are built in `build_report.py → tq_html`).
* Static artwork (cover photo, pixel graphics, icons, cards) is in `plates/` as 300 dpi page backgrounds.
  Gauges, bars, charts, mini question-cards and all text are live HTML/SVG on top.
* Fonts (Prelo family) are in `fonts/`, extracted from the original deck.

## Notes
* Deltas are shown as "pt" for CSAT and CES and "%" for NPS, consistently on every page (the original deck mixed "+1%" and "+1 pt").
* Page numbers follow the original deck (third page is numbered 4).
* `data/report_data.json` contains PLACEHOLDER values only. Replace everything with production data.
* The NPS fan has 15 segments; the fill is rounded to the nearest whole segment (the exact percentage is always shown as text).

## Single-metric reports (CSAT, NPS, CES) - one page each
Each report is its own one-page PDF in the approved one-page format, built from the same data file as the annual report (its own metric block plus `period` and `responses`).

    python build_report.py --type=csat
    python build_report.py --type=nps  data/2026-27.json
    python build_report.py --type=ces  data.json out/ces.pdf      # --type=annual (default) builds the 12-page report

Output: `output/RSM_in_Kuwait_<TYPE>_Report_<year>.pdf`.

* Scales follow the live app: CSAT 1-5, NPS 0-10 (9-10 / 7-8 / 0-6), CES 1-7 shown in five groups (6-7, 5, 4, 3, 1-2). The approved question text is used in the question box.
* Recalculated from the data: tile numbers, score and delta pill (flips colour and arrow when a score falls), the tile gauge (CSAT ring, NPS fan with 15 segments rounded to the nearest segment, CES gauge with needle), the donut, counts, labels, the CES calculation row, the equation boxes and the summary sentence. Long values (for example 1,000 responses or 100%) shrink automatically so they never touch neighbouring labels.
* Geometry (ring and donut centres and radii, gauge artwork placement, pill positions) was measured from the approved PDFs, so graphics sit exactly where the design puts them.
* Backgrounds are `plates/<type>_v3.jpg`; text positions are `layouts/v3_<type>.json`. Both were extracted from the approved PDFs with `tools/extract_single.py <folder with CES.pdf, CSAT.pdf, NPS.pdf>` (needs `pip install pymupdf`). Re-run it only if the design changes.

## Changelog
* Annual report: bottom-right pixel pattern mirrored on pages 5, 7, 8, 9, 11 and 12 to match the single reports. Cover "Reporting Period" lines reduced to 21pt and kept on one line each, so longer date ranges no longer run into the Listening. Learning. Improving. bar.

* Alignment pass (designer feedback): gauges, rings, donuts and the response-rate ring are now drawn from the measured geometry of the original artwork. The NPS fan uses the original 15-segment art and fills to the nearest whole segment of its 15 segments, the response-rate ring is concentric with its circle, the single-report donuts are centred and sized as in the approved PDFs, and the page-7 area-chart delta is right-aligned so longer values cannot clip. `gauges.py` holds the fan/band artwork logic (needs numpy and Pillow).
* One-page single reports (v2 design) replace the earlier two-page versions. Alignment pass: question text wraps from the top of its box (no overlap with the label above), scale-strip labels have more clearance, the NPS value no longer touches the thumbs icon, and score-range marker labels cannot collide.
* Gauge fixes after designer review: CSAT ring is a full disc with a vector smiley face (no white crescents or offset outline), the NPS fan fills whole segments only (15 segments, nearest segment) so no partial-colour slivers appear, the CES needle pivot sits where the original hub is, and the annual CES summary paragraph has more room inside its grey box.
* Single reports rebuilt for the new one-page format (three separate PDFs). Alignment safeguards: exact measured geometry for gauges and donuts, automatic shrinking of long values, right-aligned numbers that sit next to labels, and a question box that allows two lines without touching the line below.

## Short CX report (`--type=cx`): 4 pages, no comparisons
    python build_report.py --type=cx data/cx_example.json

A shorter report for any period (a month, a quarter, a year). It uses the same template, graphics and wording as the annual report, with only these sections:
1. Cover ("Voice of Clients (CX) Report" - no Annual or Monthly in the title).
2. Performance indicators (three KPI cards with Target and Current), response rate, How We Listen.
3. The three calculation pages (CSAT, NPS, CES) with bars and equations.
4. Summary (gauges, written summary, methodology notes).

Left out compared with the annual report: question cards, performance against target charts, testimonials, improvement pages, conclusion and contact pages, and every previous-period comparison (deltas, previous values, year-on-year wording).

Wording is checked against the target: if a score is below target the summary says so and by how much (for example "7 points below the 97% target"); otherwise it uses the standard positive wording. Singular and plural forms are handled ("1 detractor", "1 client").

Optional fields in the data file for the summary page: `followup` (`{"raised": 1, "closed": 0}`) and `comments_summary` (one factual sentence). A note that scores are indicative is added automatically when fewer than 10 responses sit behind any score.
`data/cx_example.json` is example data only.
* Singular/plural wording ("1 promoter", "1 detractor", "1 client") now applies across the annual, single-metric and CX reports.
