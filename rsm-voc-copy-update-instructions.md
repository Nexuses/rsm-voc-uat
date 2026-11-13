# Copy update instructions: RSM in Kuwait Voice of Clients survey

Site: https://rsm-voc-survey-eng.vercel.app/survey (and the testimonial page at /testimonial/...)

## Your task

Update the user-facing text on the welcome page, the screens between steps and the closing pages. Make the tone warmer and more human, and fix grammar and punctuation. Keep each piece of text short. The reader should be able to scan it in a few seconds.

Apply every change in both English and Arabic. Change text only. Do not change layout, logic, styling or data fields.

---

## 1. What you must NOT change

Leave these exactly as they are, word for word:

1. **All survey questions and answers.** This means:
   - the CSAT, CES and NPS question text
   - the scale numbers and scale labels ("Low", "High", "Not likely", "Extremely likely")
   - the "Detractors / Passives / Promoters" labels
   - the form field labels inside the steps (Full name, Email address, Business or company name, Designation)
   - the Arabic versions of all of the above
2. **"RSM الكويت"** in the Arabic privacy note. This wording is a client request. Do not add "في".
3. **Product and metric names**: CSAT, CES, NPS, Voice of Clients.
4. **The voice host's spoken script and confirmation lines.** These are managed separately.
5. **Variables and placeholders**, such as `{name}`, `{company}`, `{designation}`, `{min}` and `{max}`.

If you are unsure whether a piece of text is part of the survey itself, do not change it.

---

## 2. Writing rules for everything you change

- **Tone:** warm, polite and human, like a thoughtful colleague. Stay professional. Do not be chatty, playful or salesy.
- **Length:** keep it short. Use one or two short sentences per block. No paragraph should be longer than 25 words.
- **Address:** speak to the respondent as "you", and say "we" for RSM in Kuwait. In Arabic, always use the polite plural form (أنتم: تفضلوا، يُرجى، شكراً لكم). Never use singular commands (اختر، حاول، اطلب).
- **Firm name:** in English, always write "RSM in Kuwait", never "RSM Kuwait" or "RSM" on its own. The only exception is the Arabic "RSM الكويت" noted in section 1.
- **Punctuation:**
  - Never put a comma before "and". Write "A, B and C", not "A, B, and C".
  - No em-dashes (—). Use a colon, comma or full stop instead.
  - No exclamation marks.
- **Spelling:** use British spelling, for example "authorised" and "organisation".
- **Numbers:** write numbers under 10 as words, for example "three minutes" and "five steps".
- **Words to avoid:**
  - ensure, guarantee, best, leading, exceptional, seamless
  - very, extremely, truly
  - "Something went wrong"
  - "No thanks"
  - slang

---

## 3. Text changes

Replace the "Current" text with the "New" text. If you find other text on these pages that breaks the rules in section 2, fix it in the same style.

### 3.1 Welcome page

| Item | Current (EN) | New (EN) | New (AR) |
|---|---|---|---|
| Page title | Post-Engagement Satisfaction Survey \| Voice of Clients | Post-Engagement Satisfaction Survey \| Voice of Clients | استبيان الرضا بعد إنجاز المهمة \| صوت العميل |
| Meta description | Tell us about your recent service experience with RSM in Kuwait. | We would value your views on your recent experience with RSM in Kuwait. | يسعدنا التعرّف على آرائكم حول تجربتكم الأخيرة مع RSM في الكويت. |
| Intro | A short, confidential survey about service quality, ease of working with us, and your likelihood to recommend RSM in Kuwait. | Thank you for taking a few minutes with us. This short, confidential survey asks about the quality of our service, how easy we were to work with and how likely you are to recommend RSM in Kuwait. | شكراً لتخصيصكم بضع دقائق لنا. يتناول هذا الاستبيان القصير والسري جودة خدماتنا وسهولة التعامل معنا ومدى احتمال توصيتكم بـ RSM في الكويت. |
| Choice heading | Choose how you would like to respond | How would you like to share your feedback? | كيف تفضّلون مشاركة ملاحظاتكم؟ |
| Choice subtext | Choose the format that feels most natural. Both options collect the same three service metrics. | Please choose whichever suits you best. Both options ask the same three questions. | يُرجى اختيار ما يناسبكم. يتضمن الخياران الأسئلة الثلاثة ذاتها. |
| Voice card time | About 3 minutes | About three minutes | حوالي ثلاث دقائق |
| Voice card text | Talk with our RSM in Kuwait survey host | Share your feedback in a short spoken conversation with our survey host | شاركونا ملاحظاتكم في محادثة صوتية قصيرة مع مضيفة الاستبيان |
| Typed card steps | Five guided steps | Five short steps | خمس خطوات قصيرة |
| Typed card text | Complete each question at your own pace | Answer each question in your own time | أجيبوا عن كل سؤال في الوقت الذي يناسبكم |
| Privacy note | Your privacy matters. Voice audio is handled by our voice service provider. Your identity and feedback are available only to the authorized RSM in Kuwait CX team. | We treat your responses as confidential. Our voice service provider processes voice audio, and only the authorised RSM in Kuwait client experience team can see your name and feedback. | Keep "RSM الكويت" exactly. Make only these fixes: replace "خصوصيتكم مهمة" with "نتعامل مع إجاباتكم بسرية"; keep the rest of the sentence unchanged. |

**Arabic mode bug:** when the page is in Arabic, the intro text shows in English. Show the Arabic intro instead.

### 3.2 Voice survey screens (before and around the call)

| Item | Current (EN) | New (EN) | New (AR) |
|---|---|---|---|
| Host choice heading | Choose your voice host | Which language would you prefer? | بأي لغة تفضّلون المشاركة؟ |
| Host choice subtext | Select the language for your voice survey host. | Our survey host can speak with you in English or Arabic. | يمكن لمضيفة الاستبيان التحدث معكم بالإنجليزية أو العربية. |
| English card | Talk with our English survey host | Continue in English | المتابعة بالإنجليزية |
| Arabic card | Talk with our Arabic survey host | Continue in Arabic | المتابعة بالعربية |
| Ready heading | Ready when you are | Before you begin | قبل أن تبدأوا |
| Ready text | The host will ask for your full name, company, designation, and three feedback ratings. | Our host will first ask for your name, company and designation, then three short rating questions. It takes about three minutes. | ستطلب المضيفة أولاً اسمكم والشركة والمسمى الوظيفي، ثم ثلاثة أسئلة تقييم قصيرة. يستغرق ذلك حوالي ثلاث دقائق. |
| In-call status | The host is guiding you through identity, CSAT, CES, and NPS. | Our host is taking you through your details and the three questions. | تقوم المضيفة بمرافقتكم خلال بياناتكم والأسئلة الثلاثة. |
| Start button | Start voice survey | Start voice survey (no change) | (no change) |
| Switch buttons | "Use typed survey" and "Switch to typed survey" | Use one label in both places: "Use the typed survey instead" | استخدام الاستبيان المكتوب بدلاً من ذلك |
| Microphone message | Microphone access is needed for the voice survey. Please allow access and try again. | The voice survey needs access to your microphone. Please allow access and try again. | يحتاج الاستبيان الصوتي إلى الوصول إلى الميكروفون. يُرجى السماح بالوصول والمحاولة مرة أخرى. |
| Error heading | Connection issue | Unable to connect | تعذّر الاتصال |
| Start error | We could not start the voice survey. Please try again or use the typed survey. | We were unable to start the voice survey. Please try again, or use the typed survey if you prefer. | تعذّر بدء الاستبيان الصوتي. يُرجى المحاولة مرة أخرى أو استخدام الاستبيان المكتوب إن كنتم تفضلون ذلك. |
| Interrupted | The voice connection was interrupted. Please try again. | The connection was interrupted. Please try again. | انقطع الاتصال. يُرجى المحاولة مرة أخرى. |
| Credits error | Voice survey credits are exhausted. Please use the typed survey, or ask the CX team to top up ElevenLabs. | The voice survey is not available at the moment. Please use the typed survey. | الاستبيان الصوتي غير متاح حالياً. يُرجى استخدام الاستبيان المكتوب. |
| Retry button (AR) | حاول مرة أخرى | (EN no change: "Try again") | يُرجى المحاولة مرة أخرى |

**Arabic mode bug:** the connection error shows in English when the page is in Arabic. Show the Arabic text instead.

### 3.3 Typed survey: text around the questions only

Change only the step headings, intros, helper text, buttons and messages listed here. Do not touch the questions, scales, scale labels or field labels.

| Item | Current (EN) | New (EN) | New (AR) |
|---|---|---|---|
| Step 1 heading | About you | A little about you | نبذة عنكم |
| Step 1 intro | First, tell us who is sharing this feedback, including the best email for the record. | To begin, please share a few details about yourself and the email address you would like us to use. | للبدء، يُرجى مشاركة بعض البيانات عنكم وعنوان البريد الإلكتروني الذي تفضلون استخدامه. |
| Email error | Enter a valid email address. | Please enter a valid email address. | (no change) |
| Comment helper | Add context that would help our team understand your rating. | If you wish, please add a few words to help us understand your rating. | إن رغبتم، يُرجى إضافة بضع كلمات تساعدنا على فهم تقييمكم. |
| Review heading | Review your answers | Please review your answers | يُرجى مراجعة إجاباتكم |
| Empty comment | No comment added | No comment provided | لم تُضف ملاحظة (no change) |
| Submitting | Submitting... | Submitting… (use the single "…" character) | (no change) |
| Save error | We could not save your feedback. Your answers are still here; please try again. | We were unable to save your feedback. Your answers have been kept, so please try again. | تعذّر حفظ ملاحظاتكم. تم الاحتفاظ بإجاباتكم، يُرجى المحاولة مرة أخرى. |

**Arabic mode bug:** the progress-bar labels ("Step 2", "Step 3" and so on) stay in English. Translate them as "الخطوة ٢" and so on.

### 3.4 Thank-you page

| Item | Current (EN) | New (EN) | New (AR) |
|---|---|---|---|
| Heading | Thank you | Thank you | شكراً لكم |
| Body line 1 | Thank you for your feedback. | We appreciate you taking the time to share your feedback. | نقدّر الوقت الذي خصصتموه لمشاركة ملاحظاتكم. |
| Body line 2 | Your input helps us continue improving our service. | Your views help us keep improving the way we work with you. | تساعدنا آراؤكم على مواصلة تحسين طريقة عملنا معكم. |
| Testimonial button | Share a testimonial | Share a testimonial (no change) | مشاركة شهادة (no change) |
| Icon alt text | Live voice orb | Submission received | تم استلام الإجابة |
| Testimonial review (AR) | مراجعة شهادتك | (EN no change) | مراجعة شهادتكم |

Also fix these on the thank-you page:
- The step number shows "4". Remove it, or make it match the five-step flow.
- In Arabic, "مشاركة شهادة" looks faded. Give it the same style as the English button.

### 3.5 Testimonial page

| Item | Current (EN) | New (EN) |
|---|---|---|
| Banner alt text | RSM in Kuwait \| Voice Of Client — Share a testimonial | RSM in Kuwait \| Voice of Clients: Share a testimonial |
| Greeting | Dear {name}, thank you again for your feedback about RSM in Kuwait. This page is only for you. | Dear {name}, thank you again for sharing your feedback with RSM in Kuwait. If you are happy to, we would value a few words from you. |
| Instructions | Write a short testimonial, or paste a link to a video. You can do both. | You may write a short testimonial, share a link to a video or both. |
| Draft note | This draft uses only your comments. Edit anything that does not sound like you. | We have prepared this draft from your comments only. Please feel free to edit it so it reads in your own words. |
| Name consent | Yes, use my name / No, do not use my name | Yes, you may use my name / No, please do not use my name |
| Publish options | Website / Social | RSM in Kuwait website / RSM in Kuwait social media |
| Approval checkbox | I approve this testimonial for RSM in Kuwait to use as described above. | I approve RSM in Kuwait using this testimonial as described above. |
| Decline button | No thanks | Not at this time |
| Submitted message | Thank you. We have your testimonial. You can still edit it until RSM publishes it. | Thank you. We have received your testimonial. You may edit it until RSM in Kuwait publishes it. |
| Declined message | You declined this request. You can still send a testimonial from this page if you change your mind. | Thank you for letting us know. If you would like to share a testimonial later, you can do so from this page. |
| Locked labels | Already in use / No longer open | Testimonial published / Testimonial closed |
| Locked text | This testimonial has been published/closed and can no longer be changed. | This testimonial has been published and can no longer be edited. (Use "closed" for the closed state.) |
| Generic error | Something went wrong. Please try again. | We were unable to complete your request. Please try again. |
| Sending/Saving | Sending… / Saving… | No change. Use the single "…" character. |

**Missing Arabic version:** the testimonial page has no Arabic version. Add Arabic text for every string above, following the rules in section 2 (polite plural, no singular commands). Open the page in the language the respondent used for the survey.

---

## 4. Layout changes to fill empty space

Goal: on these four screens, remove the large empty gaps so each screen looks balanced and filled, but not crowded. Use the order **title and options on top, animation in the middle, a one-line "how it works" at the bottom**.

Rules:
- Change only layout and the text listed here. Keep colours, fonts, the banner and the brand style.
- Make each change in both English and Arabic. Arabic is the mirror image, laid out right-to-left.
- Keep every new line to one sentence of no more than 15 words.
- The text in this section replaces the matching rows in section 3, where it overlaps.
- Leave at least 24 px between blocks so nothing feels cramped.
- The survey questions, scales and field labels still must not change (see section 1).

### 4.1 Welcome page (voice or typed choice)

Current problem: each of the two option cards has about 190 px of empty space between the CSAT/CES/NPS pills at the top and the title at the bottom. The heading block is also squeezed tight under the intro line.

New structure for **each** option card, top to bottom:
1. **Title and caption** (moved up from the bottom of the card)
2. **Animation**: the waveform on the voice card, or the 1 to 5 step boxes on the typed card. Centre it in the card and make it about 1.5 times larger.
3. **How it works**: one line in small grey text.
4. **Time or steps pill and the arrow button**, on one row at the bottom. The pill goes on the left and the arrow on the right (the reverse in Arabic).

Remove the CSAT/CES/NPS pills from both cards. The survey still uses these metrics; only the pills are removed. Then reduce the card height so that no gap is taller than about 40 px.

Above the cards, add 24 px of space between the intro line and the heading block.

| Element | English | Arabic |
|---|---|---|
| Heading | How would you like to share your feedback? | كيف تفضّلون مشاركة ملاحظاتكم؟ |
| Subtext | Please choose whichever suits you best. Both options ask the same three questions. | يُرجى اختيار ما يناسبكم. يتضمن الخياران الأسئلة الثلاثة ذاتها. |
| Voice card title | Take voice survey | الاستبيان الصوتي |
| Voice card caption | Share your feedback in a short conversation with our survey host. | شاركونا ملاحظاتكم في محادثة قصيرة مع مضيفة الاستبيان. |
| Voice card how it works | Choose a language, allow your microphone and simply speak your answers. | اختاروا اللغة واسمحوا بالوصول إلى الميكروفون ثم أجيبوا بصوتكم. |
| Voice card pill | About three minutes | حوالي ثلاث دقائق |
| Typed card title | Take typed survey | الاستبيان المكتوب |
| Typed card caption | Answer each question in your own time. | أجيبوا عن كل سؤال في الوقت الذي يناسبكم. |
| Typed card how it works | Share your details, rate three questions, then review and submit. | شاركوا بياناتكم وقيّموا ثلاثة أسئلة ثم راجعوا إجاباتكم وأرسلوها. |
| Typed card pill | Five short steps | خمس خطوات قصيرة |

Below both cards, add one centred line in small grey text:
- **English:** "Both options take only a few minutes, and your responses remain confidential."
- **Arabic:** "يستغرق كلا الخيارين بضع دقائق فقط، وتبقى إجاباتكم سرية."

### 4.2 Voice survey: language choice page

Current problem: there is the same empty gap of about 190 px in each language card. The CSAT/CES/NPS pills are repeated on both cards. The Back link sits alone below the cards.

New structure for **each** language card, top to bottom:
1. **Language name** (English, or العربية) with a one-line caption under it
2. **Animation**: the waveform lines. Centre them and make them about 1.5 times larger.
3. **Arrow button**, at the bottom right (bottom left in Arabic)

Remove the CSAT/CES/NPS pills. Reduce the card height to match the welcome page cards.

Below the cards, show the Back link on the left and the "how it works" line on the right, on one row. In Arabic, reverse the order.

| Element | English | Arabic |
|---|---|---|
| Heading | Which language would you prefer? | بأي لغة تفضّلون المشاركة؟ |
| Subtext | Our survey host can speak with you in English or Arabic. | يمكن لمضيفة الاستبيان التحدث معكم بالإنجليزية أو العربية. |
| English card caption | Continue in English | المتابعة بالإنجليزية |
| Arabic card caption | Continue in Arabic | المتابعة بالعربية |
| How it works line | After you choose, we will ask for microphone access before the host begins. | بعد اختياركم، سنطلب الوصول إلى الميكروفون قبل أن تبدأ المضيفة. |

Also align the two caption lines to the same baseline. They are currently 1 px apart.

### 4.3 Voice survey: "Before you begin" page

Current problem: the content sits in one narrow column in the middle of the panel. There are about 370 px of empty space on each side. The text card sits tight against the orb, and the Start button looks small next to the orb.

New structure: three columns inside the same panel.
- **Left column: "What to expect".** Show three short numbered lines.
- **Centre column: the orb animation**, at its current size.
- **Right column: "Before you start".** Show two short tips.

Below all three columns, centre the button row:
- The Start button, about 1.5 times its current size
- The Back link on its left
- The "Use the typed survey instead" link below the Start button

Leave at least 24 px between the orb's halo and any text. Remove the old text card above the orb, because its content moves into the left column.

On mobile, stack the columns in this order: centre column, then left, then right.

| Element | English | Arabic |
|---|---|---|
| Top pill | Before you begin | قبل أن تبدأوا |
| Badge label | Voice survey | الاستبيان الصوتي |
| Left column title | What to expect | ما الذي ينتظركم |
| Left line 1 | 1. Our host confirms your name, company and designation. | ١. تؤكد المضيفة اسمكم والشركة والمسمى الوظيفي. |
| Left line 2 | 2. You answer three short rating questions. | ٢. تجيبون عن ثلاثة أسئلة تقييم قصيرة. |
| Left line 3 | 3. You may add a comment if you wish. | ٣. يمكنكم إضافة ملاحظة إن رغبتم. |
| Right column title | Before you start | قبل البدء |
| Right line 1 | Please find a quiet place and allow microphone access. | يُرجى اختيار مكان هادئ والسماح بالوصول إلى الميكروفون. |
| Right line 2 | The conversation takes about three minutes. | تستغرق المحادثة حوالي ثلاث دقائق. |
| Start button | Start voice survey | بدء الاستبيان الصوتي |
| Back link | Back | رجوع |
| Switch link | Use the typed survey instead | استخدام الاستبيان المكتوب بدلاً من ذلك |

Left line 3 must describe what the voice host actually does. If the host does not invite comments, delete that line.

### 4.4 Typed survey: Step 1 page

Current problem: the left information column has about 500 px of empty space below its description. The heading "About you" appears twice, once in each column.

Changes:
- Remove the duplicate heading from the right column. Keep the heading in the left column only.
- Below the left column's description, add a short "What happens next" list. Use small grey text, with each step on its own line.
- Place a short reassurance line at the bottom of the left column.
- Do not change the form fields or their labels.

| Element | English | Arabic |
|---|---|---|
| Step label | Step 1 of 5 | الخطوة ١ من ٥ |
| Heading | A little about you | نبذة عنكم |
| Description | To begin, please share a few details about yourself and the email address you would like us to use. | للبدء، يُرجى مشاركة بعض البيانات عنكم وعنوان البريد الإلكتروني الذي تفضلون استخدامه. |
| List title | What happens next | الخطوات التالية |
| Step 2 line | Overall satisfaction | الرضا العام |
| Step 3 line | Ease of working with us | سهولة التعامل معنا |
| Step 4 line | Likelihood to recommend | احتمال التوصية |
| Step 5 line | Review and submit | المراجعة والإرسال |
| Reassurance line | Your details are used only to record your feedback. | تُستخدم بياناتكم فقط لتسجيل ملاحظاتكم. |

The step list lines are labels for the steps only. Do not change the wording of the questions on those steps.

### 4.5 All four screens

- Make the progress dots or stepper labels match the language. In Arabic, use "الخطوة ٢" and so on.
- Use the same badge format on every screen: 01, 02, 03 and 04.
- Check the result at 1280 px and 1920 px wide, and on mobile. No block should touch another, and no gap should be taller than about 40 px.

---

## 5. Final check before you finish

- [ ] No survey question, scale, scale label, field label or metric name was changed.
- [ ] "RSM الكويت" in the Arabic privacy note is untouched.
- [ ] No comma before "and" anywhere you edited.
- [ ] No em-dashes and no exclamation marks.
- [ ] Every English mention of the firm reads "RSM in Kuwait".
- [ ] Numbers under 10 are written as words in the text you edited.
- [ ] Arabic uses the polite plural throughout.
- [ ] Arabic mode shows Arabic text for the intro, connection errors and step labels.
- [ ] Each text block is still one or two short sentences.
- [ ] The welcome, language choice, "Before you begin" and Step 1 screens follow section 4, and have no large empty gaps and no crowding.

When you are done, list every string you changed, showing the old and new text in English and Arabic.
