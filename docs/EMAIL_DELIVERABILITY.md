# Email deliverability — remove Outlook “outside RSM Kuwait” warnings

**Sender used by VOC:** `FROM_EMAIL` (production: `survey-noreply@rsm.com.kw`)  
**Transport:** SendGrid Mail Send API  

Outlook’s yellow banner  
(“Caution: This email originated from outside of RSM Kuwait…”)  
is applied by **RSM Microsoft 365** to mail that did not originate inside the
RSM Kuwait Exchange tenant. VOC sends through **SendGrid**, so those messages
are always “external” unless RSM IT allowlists them or mail is sent through
Microsoft 365 instead.

App code alone cannot remove that banner. Do the steps below.

---

## 1. SendGrid domain authentication (required)

In SendGrid → **Settings → Sender Authentication**:

1. Authenticate domain **`rsm.com.kw`** (not only a single-sender verify).
2. Add the DNS records SendGrid shows (CNAME for DKIM; SPF/`include` as directed).
3. Wait until SendGrid marks the domain **Verified**.
4. Confirm `FROM_EMAIL` is an address on that authenticated domain  
   (e.g. `survey-noreply@rsm.com.kw`).

Check from [MXToolbox](https://mxtoolbox.com/) or similar:

- SPF for `rsm.com.kw` allows SendGrid  
- DKIM passes on a test message  
- DMARC policy exists and aligns (`p=none` is fine to start)

Without this, Outlook/Microsoft may also treat the From address as spoofed.

---

## 2. RSM Microsoft 365 — external email warning exception (required for internal mailboxes)

For OTP, invites, and follow-ups **to** `@rsm.com.kw` (and other RSM Kuwait
mailboxes), ask RSM IT to update the **External Email Warning** transport rule
(or equivalent):

**Exception when any of:**

- From address is `survey-noreply@rsm.com.kw` (exact `FROM_EMAIL`), **or**
- Message passes DKIM for `rsm.com.kw` and SPF includes SendGrid, **or**
- Sending IP is in SendGrid’s published ranges for the authenticated domain

Goal: stop stamping the yellow “outside of RSM Kuwait” banner on authenticated
VOC mail.

---

## 3. What the app already does

- From display name: **RSM in Kuwait**
- Reply-To on client-facing mail: first address from `SURVEY_COMPLETION_NOTIFY_TO` when set
- **Click / open / subscription tracking disabled** on every SendGrid send so
  survey and OTP links stay on `voc.rsm.com.kw` / `rsm.com.kw` and are not
  rewritten through `sendgrid.net`
- **Outlook-safe HTML** for all production VoC templates under
  `templates/email/voc-*.html` (invite, day-3/day-5 follow-ups, login OTP,
  thank-you, team notify, team action-required): table layout + inline
  styles, Arial/Helvetica. Modern CSS (variables, flex, Google Fonts,
  class-only cards) blanks in Outlook desktop even when the M365 yellow
  external caution still shows.

---

## 4. Optional long-term (if banner must never appear)

Send VOC mail through **RSM Microsoft 365** (SMTP AUTH or Graph) so messages
originate inside the tenant. That is an IT + env change (new credentials), not
a template change.

---

## 5. Quick verification

1. Complete SendGrid domain auth (§1).  
2. Ask IT to apply the M365 exception (§2).  
3. Trigger a login OTP to an RSM Kuwait mailbox.  
4. Confirm: no yellow external caution; message headers show SPF=pass, DKIM=pass.
