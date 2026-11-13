/**
 * VoC walkthrough PDF — RSM design-system styling.
 * Part A: CX dashboard  |  Part B: Invite email, survey taker, thank-you + team emails
 * Portrait A4 · one screenshot per section · richer write-up.
 *
 * Tokens from rsm-design-system.html (navy / green / blue).
 * Run: node docs/dashboard-walkthrough/build-guide-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { jsPDF } from "jspdf";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const shotsDir = path.join(__dirname, "screenshots");
const outPath = path.join(__dirname, "RSM_VoC_Dashboard_Walkthrough.pdf");
const logoSrc = path.join(repoRoot, "public", "RSM Logo - White.png");

/** Official white wordmark, trimmed + sized for PDF embed. */
async function loadLogoPng(targetWidthPx) {
  if (!fs.existsSync(logoSrc)) {
    throw new Error(`Missing RSM logo: ${logoSrc}`);
  }
  return sharp(logoSrc)
    .trim({ threshold: 10 })
    .resize({ width: targetWidthPx, withoutEnlargement: true })
    .png()
    .toBuffer();
}

/** RSM UAE design system */
const C = {
  navy: [0, 21, 61],
  green: [63, 156, 53],
  blue: [0, 156, 222],
  charcoal: [35, 31, 32],
  body: [99, 102, 106],
  mid: [145, 144, 147],
  logoGrey: [136, 139, 141],
  white: [255, 255, 255],
  pageBg: [246, 246, 246],
  blueTint: [229, 245, 252],
  greenTint: [235, 245, 234],
  border: [209, 211, 212],
};

/**
 * One entry = one section = one screenshot.
 * Filters / CSV / Table tabs are described in copy, not extra image pages.
 */
const dashboardSections = [
  {
    id: "01",
    title: "Sign in",
    route: "/login",
    path: "00-login.png",
    purpose:
      "The CX dashboard is credentials-protected. Every session starts with email and password, then a one-time code emailed to you (MFA). Only authorised RSM Voice of Clients users can open analytics, invites, and settings.",
    steps: [
      "Go to https://voc.rsm.com.kw/login.",
      "Enter your work email and password, then Continue.",
      "Open the 6-digit code from your inbox, enter it, and Sign in.",
      "If the code expires, use Resend code. Back returns to the password step.",
    ],
    features: [
      "Email OTP on every login (not optional).",
      "Failed password attempts never skip MFA.",
      "After a successful sign-in you land on Overview (CX Intelligence).",
    ],
  },
  {
    id: "02",
    title: "Overview",
    route: "/dashboard",
    path: "01-overview-filters.png",
    purpose:
      "Overview is the CX home. It summarises outreach volume and the three Voice of Clients scores—CSAT, NPS, and CES—for the filters you choose. From here you can generate an optional AI narrative and download the annual CX PDF, or jump into a metric report.",
    steps: [
      "Open Overview from the left sidebar (or land here after login).",
      "Expand Filters to set period (All time / Last 90 days / This year), optional From–To dates, company, respondent, department, service, partner, and managers.",
      "Read the KPI cards and charts for the selected slice of data.",
      "Optionally click Generate AI narrative, then PDF Download for the branded annual report.",
      "Use See full report on a metric card—or the sidebar—to open CSAT, NPS, or CES.",
    ],
    features: [
      "Surveys sent vs completed responses for the period.",
      "CSAT (1–5), NPS (0–10), and CES (1–7) with distributions and trend.",
      "Sentiment / risk mix and leading themes from enriched responses.",
      "Open client survey launches the public /survey experience.",
      "The same filter pattern is reused on report and responses pages.",
    ],
  },
  {
    id: "03",
    title: "CSAT report",
    route: "/dashboard/reports/csat",
    path: "02-csat-report.png",
    purpose:
      "Customer Satisfaction is scored 1–5. This dedicated report is for deep-dives when Overview is not enough—same filters as Overview, focused charts and commentary for satisfaction only.",
    steps: [
      "Choose CSAT report in the sidebar (or See full report from Overview).",
      "Apply Filters if you need a department, partner, company, or date slice.",
      "Review average CSAT, rating mix, and related visuals for that slice.",
    ],
    features: [
      "Native 1–5 scale aligned with the Voice of Clients survey.",
      "Shared period / client / RSM team filters.",
      "Export controls when available on the report toolbar.",
    ],
  },
  {
    id: "04",
    title: "NPS report",
    route: "/dashboard/reports/nps",
    path: "03-nps-report.png",
    purpose:
      "Net Promoter Score (0–10) shows how likely clients are to recommend RSM. The report surfaces promoter / passive / detractor context for the filtered period.",
    steps: [
      "Open NPS report from the sidebar.",
      "Set Filters to the engagement or team you care about.",
      "Interpret the NPS score and category breakdown together—not the score alone.",
    ],
    features: [
      "0–10 recommend scale from the live survey.",
      "Trend and distribution views for the selected filters.",
      "Same filter model as Overview and the other metric reports.",
    ],
  },
  {
    id: "05",
    title: "CES report",
    route: "/dashboard/reports/ces",
    path: "04-ces-report.png",
    purpose:
      "Customer Effort Score (1–7) measures how easy the engagement felt. Use it beside CSAT and NPS when effort—not just satisfaction—is the story.",
    steps: [
      "Open CES report from the sidebar.",
      "Filter by period, client, or RSM team attribution as needed.",
      "Compare CES with CSAT/NPS on Overview when briefing partners.",
    ],
    features: [
      "Native 1–7 effort scale.",
      "Dedicated visuals so CES is not buried inside Overview alone.",
      "Shared filters with the rest of the CX analytics pages.",
    ],
  },
  {
    id: "06",
    title: "Responses",
    route: "/dashboard/responses",
    path: "05-responses.png",
    purpose:
      "The responses ledger is the row-level record of every completed (and enriched) survey. Use it when a KPI on Overview needs the underlying client, scores, comments, or AI insight.",
    steps: [
      "Open Responses in the sidebar.",
      "Apply Filters (same family as Overview) to narrow the list.",
      "Switch view mode if offered (for example by email vs by recency).",
      "Open a row for scored answers; voice surveys also show conversation turns.",
      "Export the filtered set as CSV or Excel when you need offline analysis.",
    ],
    features: [
      "Identity, CSAT / CES / NPS, comments, and stored GPT insights.",
      "Pagination for large result sets.",
      "Transcript / score detail for voice and typed paths.",
    ],
  },
  {
    id: "07",
    title: "Testimonials",
    route: "/dashboard/testimonials",
    path: "06-testimonials.png",
    purpose:
      "Testimonials tracks client-approved quotes drawn from positive surveys. Publishing here records internal approval—it does not automatically post to the public reviews widget or social channels.",
    steps: [
      "Open Testimonials from the sidebar.",
      "Use the status tabs (All, Requested, Submitted, Declined, Published, Archived) to find the right queue.",
      "Review quote text and source survey context before changing status.",
      "Mark Published only when the quote is approved for internal reuse.",
    ],
    features: [
      "Workflow tabs for request → decision → publish / archive.",
      "Clear separation from the public website reviews embed.",
      "Requires testimonials.manage to work this page.",
    ],
  },
  {
    id: "08",
    title: "Escalations",
    route: "/dashboard/escalations",
    path: "07-escalations-kanban.png",
    purpose:
      "Escalations holds recovery cases for low-score surveys that need CX follow-up. The default Kanban board lets you drag a case between stages without refreshing. A Table tab is available for a denser list of the same cases.",
    steps: [
      "Open Escalations from the sidebar.",
      "Work the Kanban columns for day-to-day recovery (drag cards between stages).",
      "Switch to Table when you need a spreadsheet-style scan of the same cases.",
      "Use Refresh if another teammate updated stages and your board looks stale.",
    ],
    features: [
      "Optimistic drag updates via the cases API.",
      "cases.read to view; cases.manage to move / update.",
      "Built for needs-attention surveys, not the full responses ledger.",
    ],
  },
  {
    id: "09",
    title: "Website widgets",
    route: "/dashboard/widget",
    path: "08-widget.png",
    purpose:
      "Widget preview is how CX shares public, PII-safe embeds. One embed shows aggregate CSAT / CES / NPS; another showcases recent commented reviews with optional name and company—never email or phone.",
    steps: [
      "Open Widget in the sidebar.",
      "Preview metrics (All / CSAT only / CES only / NPS only) as needed.",
      "Copy link or Copy code for the metrics embed.",
      "Copy link or Copy code for the recent-reviews showcase embed.",
      "Hand the snippet to web owners; embeds call only /api/public/*.",
    ],
    features: [
      "Public metrics API — aggregates only.",
      "Reviews showcase — sanitized comments; contact fields never included.",
      "Standalone public pages also exist at /widget and /widget/reviews.",
    ],
  },
  {
    id: "10",
    title: "Send survey",
    route: "/dashboard/invite",
    path: "09-send-survey.png",
    purpose:
      "Send survey emails a branded Voice of Clients invitation with a unique tracked link. Use Single recipient for one client, or switch to CSV upload for a bulk campaign. Directory fields (department, service, partner, managers) power both suggestions and later dashboard filters.",
    steps: [
      "Open Send survey from the sidebar.",
      "On Single recipient: enter email, pick or type directory fields, fill optional client details and subject, then Send invitation.",
      "For many clients: open the CSV upload tab, download the sample CSV, upload your file, then Send bulk invitations.",
      "New department / service / person names typed on send are stored in Settings → Directory for next time.",
    ],
    features: [
      "Unique /survey?invite=… link per recipient.",
      "Automatic reminders follow Settings → Reminders (Kuwait business days).",
      "Requires invite.send. Track progress afterward on Invite tracker.",
    ],
  },
  {
    id: "11",
    title: "Invite tracker",
    route: "/dashboard/invite-tracker",
    path: "10-invite-tracker.png",
    purpose:
      "Invite tracker is the outreach control room: every invitation’s send, open, start, completion, and reminder state. Use it to chase non-responders, add notes, send a manual follow-up, or export a list for partners.",
    steps: [
      "Open Invite tracker from the sidebar.",
      "Filter by sent date and status (including not completed).",
      "Open a row for timeline, notes, and manual follow-up send.",
      "Export CSV or Excel—including non-openers and non-responders—when reporting outward.",
    ],
    features: [
      "Next reminder date and stop reasons when applicable.",
      "Manual follow-ups count toward the configured max.",
      "Requires invite.tracker. Linked feedback appears when a survey is completed.",
    ],
  },
  {
    id: "12",
    title: "Insights",
    route: "/dashboard/insights",
    path: "11-insights.png",
    purpose:
      "Insights is the RAG assistant over stored feedback and invite outreach. Ask in plain language; answers cite sources and can attach charts when the question is data-heavy. It also understands invite totals and per-email outreach status when you ask.",
    steps: [
      "Open Insights from the sidebar.",
      "Pick a reporting period (All time / Last 90 days / This year).",
      "Click a suggested question, or type your own and Send (Enter to send).",
      "Read the cited answer; expand charts when the assistant includes them.",
    ],
    features: [
      "Grounded on stored insights / embeddings—not free invention.",
      "Invite-aware: outreach totals and linked survey feedback when relevant.",
      "Requires dashboard.insights.",
    ],
  },
  {
    id: "13",
    title: "Leaderboard",
    route: "/dashboard/leaderboard",
    path: "12-leaderboard.png",
    purpose:
      "Leaderboard ranks teams by survey scores for a chosen period. Dimensions are Department, Partner, Business manager, and Job manager. Ranks use invite attribution; a group needs at least three responses to appear.",
    steps: [
      "Open Leaderboard from the sidebar.",
      "Choose a dimension tab (Department / Partner / Business manager / Job manager).",
      "Toggle CSAT, CES, or NPS as the ranking metric.",
      "Adjust Filters / period so the ranking matches the briefing you need.",
    ],
    features: [
      "Minimum sample size of three responses per group.",
      "Invite-linked attribution—not free-text guessing.",
      "Uses the same operational period idea as Overview analytics.",
    ],
  },
  {
    id: "14",
    title: "Settings",
    route: "/dashboard/settings",
    path: "14-settings-directory.png",
    purpose:
      "Settings is the admin strip for the CX portal. Anyone who can open Settings can change their own password (Account) and maintain the survey Directory. Users, Roles, Audit, and Reminders appear when your role includes the matching permissions.",
    steps: [
      "Open Settings from the sidebar—you land on the first tab you are allowed to see.",
      "Account: change your password (current + new + confirm).",
      "Directory: add or remove departments, services, partners, managers, and team leaders used on Send survey.",
      "Users / Roles (if permitted): create users, assign roles, edit the permission matrix.",
      "Audit (if permitted): filter and export login / invite / role activity.",
      "Reminders (if permitted): set interval and max automatic follow-ups (Sun–Thu Kuwait).",
    ],
    features: [
      "Account + Directory: available to every Settings-capable user.",
      "Users / Roles / Audit / Reminders: gated by users.manage, roles.manage, audit.read.",
      "Password and role changes are written to the audit log.",
      "Directory edits do not rewrite invitations already sent.",
    ],
  },
];

/**
 * Part B journey: invite email -> survey UI -> client thank-you -> team notice.
 * Survey UI shots are light (no full completion).
 */
const surveySections = [
  {
    id: "S1",
    title: "Invitation email",
    route: "Email (client invite)",
    path: "30-email-invite.png",
    purpose:
      "When CX sends a survey from the dashboard (or an integration triggers one), the client receives a branded RSM invitation. The message explains mid- or post-engagement context, lists the engagement metadata, and includes a unique tracked link to /survey?invite=...",
    steps: [
      "CX uses Send survey (single or CSV) or the invite API to create the invitation.",
      "The client opens the email from RSM in Kuwait in their inbox.",
      "They click the survey CTA / link to open the Voice of Clients experience.",
    ],
    features: [
      "Branded header (Satisfaction Survey / engagement stage).",
      "Personal greeting and short copy (under five minutes).",
      "Service context box: department, team, and related invite fields.",
      "Tracked link powers open / start / complete status on Invite tracker.",
    ],
  },
  {
    id: "S2",
    title: "Survey home",
    route: "/survey",
    path: "20-survey-intro.png",
    purpose:
      "Clients open a tracked invite link or the public survey URL. The home screen introduces the Voice of Clients survey, offers English or Arabic UI, and asks how they want to respond - voice or typed. Both paths collect the same three metrics: CSAT, CES, and NPS.",
    steps: [
      "Open the unique link from the invitation email (or https://voc.rsm.com.kw/survey).",
      "Optionally switch language with English / Arabic in the top corner.",
      "Choose Take voice survey or Take typed survey.",
    ],
    features: [
      "Same CSAT (1-5), CES (1-7), and NPS (0-10) in both modes.",
      "Privacy note on every step; CX team login link for staff.",
      "Invite tokens (when present) track open / start / complete for outreach.",
    ],
  },
  {
    id: "S3",
    title: "Typed survey",
    route: "/survey (typed)",
    path: "21-survey-typed.png",
    purpose:
      "Typed mode walks the client through guided steps at their own pace. It starts by capturing who is responding (name, email, company, designation), then moves through the three metric questions with optional comments. This guide only shows the identity step - enough to recognise the flow.",
    steps: [
      "From Survey home, choose Take typed survey.",
      "Complete identity fields, then Continue through CSAT, CES, and NPS steps.",
      "Use Back anytime to return to the mode chooser without submitting.",
    ],
    features: [
      "Five guided steps; email is required on the typed path.",
      "Optional comment per metric.",
      "Same scoring scales as the voice conversation.",
    ],
  },
  {
    id: "S4",
    title: "Voice host language",
    route: "/survey (voice host)",
    path: "22-survey-voice-host.png",
    purpose:
      "After choosing voice, the client picks an English or Arabic survey host. Arabic sessions use the allowlisted Arabic TTS voice; English uses the agent default. The page UI language switcher remains available separately.",
    steps: [
      "From Survey home, choose Take voice survey.",
      "Select English or Arabic for the voice host.",
      "Back returns to the mode chooser.",
    ],
    features: [
      "Host language is chosen before the microphone session starts.",
      "Both hosts run on the same ElevenLabs agent with language overrides.",
      "About three minutes for a typical voice completion.",
    ],
  },
  {
    id: "S5",
    title: "Voice survey ready",
    route: "/survey (voice)",
    path: "23-survey-voice-ready.png",
    purpose:
      "The voice stage shows the host orb and controls before anything is recorded. The client starts when ready; they can also switch to typed survey. This screenshot stops before Start voice survey so no live call is opened in the guide.",
    steps: [
      "After choosing a host, review what the host will ask (name, company, designation, three ratings).",
      "Click Start voice survey only when ready to speak (browser will request microphone access).",
      "Use Use typed survey if they prefer the form instead.",
    ],
    features: [
      "Live conversation with the RSM survey host; session ends when the agent finishes or after silence fallback.",
      "Typed fallback remains available from this screen.",
      "Audio is handled by the voice provider; identity stays with the CX team.",
    ],
  },
  {
    id: "S6",
    title: "Client thank-you email",
    route: "Email (client thank-you)",
    path: "31-email-thank-you.png",
    purpose:
      "After a tracked invite is completed with CSAT, CES, and NPS present, the client receives a branded thank-you message. It confirms their submission and summarises the scores (and optional comments) they provided.",
    steps: [
      "Client finishes the voice or typed survey successfully.",
      "The platform sends the thank-you email to the respondent address on the invite.",
      "Client can review their score summary in the message body.",
    ],
    features: [
      "Branded Voice of Clients header.",
      "YOUR RESPONSES block with CSAT / CES / NPS (and comments when given).",
      "Sent only after a proper completion - not on invite open alone.",
    ],
  },
  {
    id: "S7",
    title: "Team completion email",
    route: "Email (CX team notice)",
    path: "32-email-team-response.png",
    purpose:
      "The CX / engagement team gets an internal completion notice when a survey is finished. It flags Positive vs needs-attention results, shows respondent and company context, and lists the RSM team attributed on the invite so partners can follow up.",
    steps: [
      "A respondent completes the assessment (typed or voice).",
      "Team mailbox and attributed partners / managers receive the notice.",
      "Use the detail block (company, channel, project, scores context) to decide next actions; low scores also feed Escalations.",
    ],
    features: [
      "Subject includes company, respondent, and result tone (e.g. Positive).",
      "Client block: company, name, designation, email, channel, submitted time.",
      "RSM team block: department, partner, managers, project ID.",
      "Goes to the configured feedback mailbox plus invite staff emails.",
    ],
  },
];

const sections = [...dashboardSections, ...surveySections];

function rgb(doc, arr) {
  doc.setTextColor(arr[0], arr[1], arr[2]);
}

function fill(doc, arr) {
  doc.setFillColor(arr[0], arr[1], arr[2]);
}

function draw(doc, arr) {
  doc.setDrawColor(arr[0], arr[1], arr[2]);
}

/** jsPDF Helvetica is WinAnsi — Unicode arrows/dashes letter-space the rest of the line. */
function ascii(text) {
  return String(text)
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[→︎➡➜⟶]/gu, "->")
    .replace(/[←⬅]/gu, "<-")
    .replace(/[•●▪▸►]/gu, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function wrap(doc, text, x, y, maxW, lh) {
  doc.setFont("helvetica", doc.getFont().fontStyle === "bold" ? "bold" : "normal");
  const lines = doc.splitTextToSize(ascii(text), maxW);
  doc.text(lines, x, y);
  return y + lines.length * lh;
}

/**
 * One desktop fold only. Tall CDP captures (3600px+) painted the same page
 * multiple times because min-h-screen tracked the oversized viewport — never
 * embed past the first fold.
 */
const FIRST_FOLD_PX = 1100;

async function oneShotForSlot(filePath, maxWidthPx, maxHeightPx) {
  const meta = await sharp(filePath).metadata();
  const width = meta.width ?? 1920;
  const srcH = meta.height ?? 1080;

  // Hard cap: top fold only (ignores duplicated paints further down)
  let extractH = Math.min(srcH, FIRST_FOLD_PX);

  // Also respect the PDF slot height so we don't crush a tall fold into a postage stamp
  const scale = maxWidthPx / width;
  const slotCap = Math.floor(maxHeightPx / scale);
  if (slotCap > 400) {
    extractH = Math.min(extractH, slotCap);
  }

  return sharp(filePath)
    .extract({
      left: 0,
      top: 0,
      width,
      height: Math.max(480, extractH),
    })
    .resize({ width: maxWidthPx, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

const HEADER_H = 22; // mm — padded navy bar for wordmark
const HEADER_GREEN = 2;
const FOOTER_H = 14; // mm reserved at bottom of content pages

function headerBar(doc, pageW, logoBuf) {
  fill(doc, C.navy);
  doc.rect(0, 0, pageW, HEADER_H, "F");
  if (logoBuf) {
    // Right-aligned; keep ~4mm padding above/below inside the bar
    const maxLogoH = HEADER_H - 8;
    const props = doc.getImageProperties(logoBuf);
    const logoH = maxLogoH;
    const drawW = (props.width * logoH) / props.height;
    const x = pageW - 16 - drawW;
    const y = (HEADER_H - logoH) / 2;
    doc.addImage(logoBuf, "PNG", x, y, drawW, logoH, undefined, "FAST");
  }
  fill(doc, C.green);
  doc.rect(0, HEADER_H, pageW, HEADER_GREEN, "F");
}

function footer(doc, pageW, pageH, pageNum, total) {
  // Stay on the white page body — never draw over Part divider accent bars
  const yLine = pageH - FOOTER_H + 2;
  draw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(16, yLine, pageW - 16, yLine);
  rgb(doc, C.mid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("RSM in Kuwait  |  Voice of Clients  |  Walkthrough Guide", 16, pageH - 5);
  doc.text(`${pageNum} / ${total}`, pageW - 16, pageH - 5, { align: "right" });
}

async function build() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 16;
  const contentW = pageW - m * 2;

  const logoCover = await loadLogoPng(1400);
  const logoHeader = await loadLogoPng(600);

  // ——— Cover ———
  fill(doc, C.navy);
  doc.rect(0, 0, pageW, pageH, "F");
  // Official white RSM wordmark (grey / green / blue bars + RSM)
  {
    const logoW = 72;
    const props = doc.getImageProperties(logoCover);
    const logoH = (props.height * logoW) / props.width;
    doc.addImage(logoCover, "PNG", m, 40, logoW, logoH, undefined, "FAST");
  }
  doc.setFontSize(11);
  rgb(doc, [141, 163, 199]);
  doc.setFont("helvetica", "normal");
  doc.text("VOICE OF CLIENT", m, 88);
  fill(doc, C.green);
  doc.rect(m, 92, 36, 1.5, "F");
  rgb(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Voice of Clients", m, 112);
  doc.text("Walkthrough Guide", m, 124);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  rgb(doc, [141, 163, 199]);
  const coverBlurb =
    "Part A covers the authenticated CX dashboard. Part B follows the client journey: invitation email, survey UI (typed and voice overview), then the client thank-you and internal team completion emails.";
  wrap(doc, coverBlurb, m, 140, contentW * 0.92, 5.5);
  doc.setFontSize(10);
  doc.text("Live host   https://voc.rsm.com.kw", m, 172);
  doc.text("Captured   27 Oct 2026", m, 180);
  doc.text("Audience   CX team  |  Partners  |  Nexuses handoff", m, 188);
  fill(doc, C.green);
  doc.rect(0, pageH - 8, pageW, 8, "F");

  // ——— How to use this guide ———
  doc.addPage();
  headerBar(doc, pageW, logoHeader);
  rgb(doc, C.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("How to use this guide", m, 32);
  fill(doc, C.green);
  doc.rect(m, 35, 28, 1.2, "F");

  rgb(doc, C.body);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  let y = 46;
  y = wrap(
    doc,
    "Each chapter is one section with purpose, numbered steps, features, and a single desktop screenshot (top fold only). The guide has two parts so CX analytics and the client survey stay clearly separated.",
    m,
    y,
    contentW,
    5.2
  );
  y += 6;
  rgb(doc, C.charcoal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Part A - CX dashboard (sidebar)", m, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, C.body);
  const map = [
    "Sign in, Overview, CSAT / NPS / CES reports",
    "Responses, Testimonials, Escalations, Widget",
    "Send survey, Invite tracker, Insights, Leaderboard, Settings",
  ];
  for (const line of map) {
    fill(doc, C.green);
    doc.circle(m + 1.2, y - 1.2, 0.9, "F");
    y = wrap(doc, line, m + 5, y, contentW - 5, 5);
    y += 2.2;
  }
  y += 5;
  rgb(doc, C.charcoal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Part B - Client journey (email + survey)", m, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, C.body);
  const mapB = [
    "Invitation email the client receives",
    "Survey home, typed identity, voice host, voice-ready (no full submit)",
    "Client thank-you email with score summary",
    "Internal team completion notice for CX / partners",
  ];
  for (const line of mapB) {
    fill(doc, C.blue);
    doc.circle(m + 1.2, y - 1.2, 0.9, "F");
    y = wrap(doc, line, m + 5, y, contentW - 5, 5);
    y += 2.2;
  }
  y += 6;
  fill(doc, C.blueTint);
  doc.roundedRect(m, y, contentW, 28, 2, 2, "F");
  rgb(doc, C.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Security note", m + 4, y + 8);
  rgb(doc, C.body);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  wrap(
    doc,
    "Public website widgets and /api/public/* never expose emails, phones, or raw private response tables. Dashboard pages behind login may show client identity—treat screenshots as confidential.",
    m + 4,
    y + 14,
    contentW - 8,
    4.6
  );

  // ——— TOC ———
  doc.addPage();
  headerBar(doc, pageW, logoHeader);
  rgb(doc, C.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Contents", m, 32);
  fill(doc, C.green);
  doc.rect(m, 35, 22, 1.2, "F");
  y = 46;

  function tocGroup(label, list, accent) {
    rgb(doc, accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, m, y);
    y += 8;
    doc.setFontSize(11);
    for (const s of list) {
      rgb(doc, C.blue);
      doc.setFont("helvetica", "bold");
      doc.text(s.id, m, y);
      rgb(doc, C.charcoal);
      doc.setFont("helvetica", "normal");
      doc.text(ascii(s.title), m + 14, y);
      rgb(doc, C.mid);
      doc.setFontSize(9);
      doc.text(ascii(s.route), m + 14, y + 4.5);
      doc.setFontSize(11);
      y += 12;
      if (y > pageH - 24) {
        doc.addPage();
        headerBar(doc, pageW, logoHeader);
        y = 32;
      }
    }
    y += 4;
  }

  tocGroup("Part A - CX dashboard", dashboardSections, C.green);
  tocGroup("Part B - Client journey (email + survey)", surveySections, C.blue);

  const pagesWithoutFooter = new Set([1]); // cover

  async function renderPartDivider(title, subtitle, tint) {
    doc.addPage();
    pagesWithoutFooter.add(doc.getNumberOfPages());
    fill(doc, C.navy);
    doc.rect(0, 0, pageW, pageH, "F");
    fill(doc, tint);
    doc.rect(m, 78, 42, 1.8, "F");
    rgb(doc, [141, 163, 199]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("VOICE OF CLIENT WALKTHROUGH", m, 58);
    rgb(doc, C.white);
    doc.setFontSize(28);
    doc.text(title, m, 98);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    rgb(doc, [141, 163, 199]);
    wrap(doc, subtitle, m, 116, contentW * 0.85, 6);
    // Wordmark top-right with comfortable padding (no footer on this page)
    if (logoHeader) {
      const logoW = 48;
      const props = doc.getImageProperties(logoHeader);
      const logoH = (props.height * logoW) / props.width;
      doc.addImage(
        logoHeader,
        "PNG",
        pageW - m - logoW,
        28,
        logoW,
        logoH,
        undefined,
        "FAST"
      );
    }
    fill(doc, tint);
    doc.rect(0, pageH - 10, pageW, 10, "F");
  }

  async function renderSectionPages(list, stripTint, accent) {
    const sectionStripTop = HEADER_H + HEADER_GREEN;
    for (const s of list) {
      doc.addPage();
      headerBar(doc, pageW, logoHeader);

      fill(doc, stripTint);
      doc.rect(0, sectionStripTop, pageW, 10, "F");
      rgb(doc, accent);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`SECTION ${s.id}`, m, sectionStripTop + 6.5);
      rgb(doc, C.mid);
      doc.setFont("helvetica", "normal");
      doc.text(ascii(s.route), pageW - m, sectionStripTop + 6.5, {
        align: "right",
      });

      rgb(doc, C.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(ascii(s.title), m, sectionStripTop + 22);

      rgb(doc, C.body);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = wrap(doc, s.purpose, m, sectionStripTop + 30, contentW, 5);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      rgb(doc, C.navy);
      doc.text("How to use it", m + 3, y + 5);
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      rgb(doc, C.charcoal);
      for (let i = 0; i < s.steps.length; i++) {
        fill(doc, C.navy);
        doc.circle(m + 5, y - 1.1, 2.2, "F");
        rgb(doc, C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(String(i + 1), m + 5, y - 0.2, { align: "center" });
        rgb(doc, C.charcoal);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        y = wrap(doc, s.steps[i], m + 10, y, contentW - 12, 4.5);
        y += 3;
      }
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      rgb(doc, C.navy);
      doc.text("What you get", m + 3, y + 2);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      rgb(doc, C.body);
      for (const f of s.features) {
        fill(doc, accent);
        doc.rect(m + 3, y - 2.2, 1.4, 1.4, "F");
        y = wrap(doc, f, m + 7, y, contentW - 10, 4.4);
        y += 2.4;
      }
      y += 5;

      const shotPath = path.join(shotsDir, s.path);
      if (!fs.existsSync(shotPath)) {
        throw new Error(`Missing screenshot: ${shotPath}`);
      }
      const slotBottom = pageH - FOOTER_H - 4;
      const slotHmm = Math.max(55, slotBottom - y);
      const slotWmm = contentW;
      const pxPerMm = 150 / 25.4;
      const maxWpx = Math.round(slotWmm * pxPerMm);
      const maxHpx = Math.round(slotHmm * pxPerMm);

      const jpeg = await oneShotForSlot(shotPath, maxWpx, maxHpx);
      const props = doc.getImageProperties(jpeg);
      let drawW = slotWmm;
      let drawH = (props.height * drawW) / props.width;
      if (drawH > slotHmm) {
        drawH = slotHmm;
        drawW = (props.width * drawH) / props.height;
      }

      rgb(doc, C.mid);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Screenshot  |  desktop top fold (1920px wide)", m, y);
      y += 3;

      draw(doc, C.border);
      doc.setLineWidth(0.4);
      doc.rect(m, y, drawW, drawH);
      doc.addImage(jpeg, "JPEG", m, y, drawW, drawH, undefined, "FAST");
    }
  }

  await renderPartDivider(
    "Part A",
    "CX dashboard - sign in through Settings. Authenticated analytics, outreach, and admin.",
    C.green
  );
  await renderSectionPages(dashboardSections, C.greenTint, C.green);

  await renderPartDivider(
    "Part B",
    "Client journey - invitation email, public survey (typed + voice overview), client thank-you, and team completion notice.",
    C.blue
  );
  await renderSectionPages(surveySections, C.blueTint, C.blue);

  // Page numbers on content pages only (skip cover + Part A/B dividers)
  const total = doc.getNumberOfPages();
  const contentPages = [];
  for (let i = 1; i <= total; i++) {
    if (!pagesWithoutFooter.has(i)) contentPages.push(i);
  }
  contentPages.forEach((pageIndex, idx) => {
    doc.setPage(pageIndex);
    footer(doc, pageW, pageH, idx + 1, contentPages.length);
  });

  doc.save(outPath);
  const stat = fs.statSync(outPath);
  console.log(
    "Wrote",
    outPath,
    `(${Math.round(stat.size / 1024)} KB, ${total} pages, ${sections.length} sections)`
  );
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
