# Task: Technical and UI fixes for the RSM VoC survey

App: https://rsm-voc-survey-eng.vercel.app/survey (Next.js, English and Arabic modes)

## Hard rule: do not change any wording
- Do not edit, rewrite, shorten, translate or add any visible text in English or Arabic.
- Do not touch the survey questions, scales, scale labels, band labels (including "Detractors / Neutral / Promoters"), metric names (CSAT, CES, NPS), "RSM الكويت", "RSM in Kuwait", "Voice of Client(s)", or the voice host script.
- Fixes below are layout, styling, behaviour, direction (RTL) and accessibility only.
- If a fix seems to need new or changed text, stop and list it under "Needs a wording decision" in your report. Do not invent copy.
- The duplicate heading on typed step 1 is already fixed. Leave it alone.

## Fixes

### 1. Rating sliders (CSAT, CES, NPS steps)
- Problem: the handle starts at a mid value (3, 4 or 5) while the page shows "Not rated yet" and "–". It looks pre-answered.
- Fix: when nothing is selected, render the slider with no active value (hide or ghost the handle, no filled track). The handle appears only after the user taps a number or drags. The accessibility value must match what is shown (no aria-valuenow until rated).
- Keep the existing validation: Continue stays blocked until a rating is chosen.

### 2. Step badges
- Problem: badges read "01", "02", then "3" on the voice ready page, and the "3" is a small green square unlike the others.
- Fix: use the same two-digit format and the same badge component and style on every step ("03").

### 3. Arabic mode: voice connection error
- Problem: in Arabic mode the error alert "We were unable to start the voice survey…" still renders in English, with the full stop on the wrong side.
- Fix: the alert must read from the active-language string table like the rest of the page and re-render when the language toggles. If an Arabic string for this alert already exists in the code, use it. If it does not exist, do not write one; report it under "Needs a wording decision".
- The "Try again" button label in Arabic is long. Do not change its text; make sure the button grows or wraps cleanly without clipping.

### 4. RTL punctuation and wrapping
- In Arabic mode, the English sample bubble shows ".Hello, I'm Sara". Wrap embedded English text in an element with dir="ltr" (or use <bdi>) so punctuation sits correctly. Apply the same to any other English string shown inside Arabic layouts.
- On the Arabic landing intro, the line breaks right after "بـ", leaving it alone at the line end. Keep "بـ" attached to the following word (non-breaking join, e.g. wrap "بـRSM في الكويت" segment in a nowrap span) and apply text-wrap: balance (or pretty) to the intro paragraph.

### 5. Top intro line showing on every page
- Problem: the small grey intro ("Thank you for taking a few minutes with us…") stays visible on every step and on the thank-you page, so "Thank you" appears three times there.
- Fix: show this intro on the landing page only. Hide it on the voice pages, typed steps, review and thank-you pages. Do not change the text.

### 6. Thank-you page hierarchy
- The "Thank you" heading is smaller than the message under it. Make the heading the largest text on the card and the message body text size. No text changes.
- "Review your testimonial" opens in a background tab, so clicking seems to do nothing. Open it in the same tab (remove target="_blank"), or if a new tab is required, keep it but add a visible new-tab icon and an aria-label hint via existing text only.

### 7. Review page (typed step 5)
- The RSM logo is missing from the left panel. Render the same logo block as steps 1 to 4.
- "Respondent" and "Please review your answers" each appear twice (left panel and form card). Hide the duplicate inside the form card on desktop (keep it on mobile if the panel collapses). Do not reword.
- The job line shows "QA, QA Test" (designation and company joined by a comma). Render designation and company on separate lines using the existing field labels from step 1.
- Increase the size of the small card labels and the "No comment provided" text to body-small, not caption.

### 8. Typed step 1 layout
- Remove the large empty gap between the Designation field and the Back/Continue buttons (buttons follow the form, standard spacing).
- Mark required fields with an asterisk and aria-required="true". If a legend is needed, use a symbol only; do not add new text.
- A hidden honeypot field labelled "Website" is present on every step. Keep it, but make sure it is aria-hidden="true", tabindex="-1" and autocomplete="off" so screen readers do not announce it.

### 9. Small and hard-to-read text
- Raise the "Drag the slider or tap a number" hint and the band labels under the sliders to a readable size (at least 13–14 px) with sufficient contrast.
- Make the band underline bars proportional to the ranges they represent, and use a consistent colour logic.
- Enlarge the language toggle icons (Aa / ع) and the "01" badge so they are readable, and pin the toggle to the same position on every page.

### 10. Landing page typed card
- The face preview runs happy to sad left to right, reverse of the 1 to 5 scale. Order the faces sad to happy (left to right in English, mirrored in Arabic).

### 11. Testimonial page (/testimonial/<token>)
- Bring it into the survey's visual system: same RSM header and footer, same background, same green primary button, same type scale.
- Widen the form column to match the survey card width, and centre it.
- Enlarge radio buttons and checkboxes to at least 20 px, align them with their labels, and add spacing between the options in "May we use your name?".
- Make "Your draft" a proper section heading size.
- No text changes, including the banner text and option labels.

## Check before you finish
- Test English and Arabic at 1280 px, 1920 px and a 390 px mobile width.
- Walk the typed survey end to end and the voice pages up to the connection step (including the error state) in both languages.
- Confirm no visible string changed: diff the English and Arabic string tables before and after; the diff must be empty.

## Report back
- What you changed, page by page.
- Anything under "Needs a wording decision", with the exact location.
