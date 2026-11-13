# CX Dashboard Walkthrough

Live guide for the RSM Voice of Clients CX dashboard on `https://voc.rsm.com.kw`.

## Deliverable

`docs/dashboard-walkthrough/RSM_VoC_Dashboard_Walkthrough.pdf`

Portrait guide styled from `rsm-design-system.html` (navy / green / blue).

- **Part A** — CX dashboard (one screenshot per sidebar section)
- **Part B** — Invite email, survey UI (typed + voice overview), client thank-you, team completion email

Screenshots + PDF are **gitignored** (live client data).

## Rebuild PDF

```bash
node docs/dashboard-walkthrough/build-guide-pdf.mjs
```

Needs PNGs in `screenshots/` (see paths in `build-guide-pdf.mjs`) plus `jspdf` and `sharp`.
