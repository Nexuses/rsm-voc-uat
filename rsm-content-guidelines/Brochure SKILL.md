---
name: rsm-brochure
description: Build RSM in Kuwait A4 portrait PPT brochures, guides and factsheets from the approved 18-page template: brand rules, page catalogue, fonts, palette, footer and pixel pattern.
---

# RSM in Kuwait: A4 portrait brochure (PPTX)

Use this for any RSM in Kuwait (RSM Albazie & Co.) brochure, financial reporting guide, factsheet or multi-page A4 portrait PowerPoint. Always start from `assets/RSM_Brochure_Template_A4_Portrait.pptx` (18 pages, bundled with this skill). Do not rebuild from scratch. Read the pptx skill's SKILL.md before editing. Edit with python-pptx; render via soffice then pdftoppm to check every page.

## Non-negotiables
- A4 portrait (about 210 x 297 mm). Nothing right of x 111 mm below y 261 mm (that area is the pixel pattern).
- On every flyer-based page (pages 3 to 17 of the template) the **footer line** (three thin rules bottom-left: grey, green, blue) and the **right-hand blue pixel pattern** stay identical in position and colour. They live on the slide layouts ("Flyer 3", "Flyer 1 3 column green", "Back cover" via the `Progress bar` group and `PoP` freeform). Never redraw or move them on slides; use the layouts.
- The IFRS-style pages (1 cover, 2 contents, 18 end page) keep their own full-bleed designs and have no footer line. Do not add one.
- Top-left on flyer pages: "THE POWER OF BEING UNDERSTOOD" over "ASSURANCE | TAX | CONSULTING"; top-right: RSM wordmark with three bars (grey, green, blue). Both come from the layout.
- Navy pages (17 and 18) use a solid background of exactly **#00153D** set on the slide itself.
- Surgical edits only: replace placeholder text, keep layout, colours and spacing. Keep titles short (preview fonts are fallbacks).

## Palette
Blue 009CDE, Green 3F9C35, Mid grey 888B8D, Dark grey 63666A, Midnight blue 00153D. Tints: pale blue CCEBF8, pale green D8EBD6, light grey E7E7E8. Red E40046 only for crosses in comparisons. White text on blue, green, navy; dark grey body text.

## Fonts
- Flyer pages: Arial (theme font); bullets in Wingdings. Headings bold, body 9 to 10 pt dark grey, section bar text 12 pt bold white.
- Cover and contents (imported from the IFRS 16 guide): Prelo 1 (Light, Semi-Bold, Bold).
- End page: Arial MT Pro (and Bold).
- Use real Unicode tick (U+2713) and cross (U+2715) in tables, not Wingdings characters.

## Page catalogue (template order)
1. Cover (IFRS style): title in two lines, subtitle, date.
2. Contents (IFRS style): numbered sections; page numbers formatted 01, 02 ...; update to match the final page order.
3. Opening page: flyer front with title, subtitle, date.
4. Introduction: headline, lead paragraph, three numbered cards, navy callout band, four stat figures, photo with caption.
5. Section opener: large section number, title, navy photo placeholder.
6. Text with sidebar: body text plus tinted sidebar box.
7. Three columns with banner.
8. Approach and comparison: STEP 01 to 04 timeline on a dashed connector, comparison table (grey activity column, pale-blue traditional column with red cross, solid blue RSM in Kuwait column with white ticks), key points in two columns.
9. Comparison table: old versus new, blue and green headers, tinted rows.
10. Data in focus: editable clustered column chart (blue and green series), commentary, stat tile.
11. Worked example: Example tag, Scenario, Facts / Analysis / Conclusion columns, navy takeaway band.
12. Decision tree: yes/no question boxes, arrows, outcomes, final green outcome.
13. Key requirements: five outlined boxes with icon squares.
14. Roadmap / timeline with milestones (about 46 mm spacing).
15. Icon cards.
16. Pull-out quote.
17. "How can RSM in Kuwait help?": navy page, tagline, heading, five service rows.
18. End page (IFRS 16 guide): navy, Kuwait map, contact block, 2026 legal text.

Remove unused pages; keep the end page last. Duplicate a page by copying its shapes onto a new slide with the same layout.

## Components
- Section header: white bold text on a solid green (or blue) bar, left aligned.
- Cards: solid tint or thin blue/green outline, number or icon square on top, short heading plus one or two lines.
- Stats: big bold numerals (blue or green) with a short light label below.
- Navy callout band with small pixel squares at the right.
- Photo areas: grey placeholder box with a note to use Change Picture; keep the aspect ratio.
- Colour rotation across cards: blue, green, grey, navy.

## Copy conventions
- Brand name "RSM in Kuwait"; legal entity RSM Albazie & Co.
- British spelling (recognise, categorised); plain, benefit-led, client-facing language; say "colleagues", not employees.
- Contact: Arraya Tower 2, Floors 41 & 42, Abdulaziz Hamad Alsaqar Street, Sharq, P.O. Box 2115, Safat 13022, State of Kuwait; www.rsm.global/kuwait; connect@rsm.com.kw; TEL +965 22961000; WhatsApp 22410010.
- Legal text (2026): RSM International Limited, registered office 200 Aldersgate Street, London, EC1A 4HD; members are independent assurance, tax and consulting firms. Older text (50 Cannon Street) must be replaced.

## Workflow
1. State assumptions (page count, audience, sections) and confirm if unclear.
2. Plan the page list from the catalogue; list the content per page.
3. Fill the template pages; keep text inside boxes (check overflow in the render).
4. Update the contents page and page numbers.
5. Validate (`office/validate.py` from the pptx skill), render all pages, compare footer and pattern positions across pages 3 to 17.
6. Deliver the .pptx and say honestly what was and was not checked.
