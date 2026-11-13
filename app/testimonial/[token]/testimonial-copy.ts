import type { SurveyVoiceLanguage } from "@/lib/survey/voice-locale";

/**
 * Page copy for the private testimonial review page.
 *
 * The English strings are the approved copy that already shipped on this
 * page. The Arabic strings translate those same sentences using the wording
 * already approved for the survey UI ("صوت العملاء", "مشاركة شهادة",
 * "مراجعة شهادتكم" from `lib/survey/voice-locale.ts`). No new question or
 * testimonial content is introduced.
 */
export type TestimonialCopy = {
  eyebrow: string;
  title: string;
  /** Browser tab title; the page switches language client-side. */
  documentTitle: string;
  greetingNamed: string;
  greetingGeneric: string;
  intro: string;
  draftTitle: string;
  originalTitle: string;
  draftNote: string;
  originalNote: string;
  submittedNote: string;
  declinedNote: string;
  writtenLabel: string;
  videoLabel: string;
  consentNameLegend: string;
  consentYes: string;
  consentNo: string;
  publishLegend: string;
  publishWebsite: string;
  publishSocial: string;
  approveLabel: string;
  submit: string;
  submitting: string;
  decline: string;
  declining: string;
  genericError: string;
  lockedPublishedTitle: string;
  lockedPublishedNote: string;
  lockedClosedTitle: string;
  lockedClosedNote: string;
  footer: string;
  languageLabel: string;
  english: string;
  arabic: string;
};

export const TESTIMONIAL_COPY: Record<SurveyVoiceLanguage, TestimonialCopy> = {
  en: {
    eyebrow: "Voice of Clients",
    title: "Share a testimonial",
    documentTitle: "Testimonial · RSM in Kuwait",
    greetingNamed: "Dear {name},",
    greetingGeneric: "Hello,",
    intro:
      "Thank you again for sharing your feedback with RSM in Kuwait. If you are happy to, we would value a few words from you.",
    draftTitle: "Your draft",
    originalTitle: "Your testimonial",
    draftNote:
      "We have prepared this draft from your comments only. Please feel free to edit it so it reads in your own words.",
    originalNote:
      "You may write a short testimonial, share a link to a video or both.",
    submittedNote:
      "Thank you. We have received your testimonial. You may edit it until RSM in Kuwait publishes it.",
    declinedNote:
      "Thank you for letting us know. If you would like to share a testimonial later, you can do so from this page.",
    writtenLabel: "Written testimonial",
    videoLabel: "Video link (optional)",
    consentNameLegend: "May we use your name?",
    consentYes: "Yes, you may use my name",
    consentNo: "No, please do not use my name",
    publishLegend: "Where may we publish it?",
    publishWebsite: "RSM in Kuwait website",
    publishSocial: "RSM in Kuwait social media",
    approveLabel:
      "I approve RSM in Kuwait using this testimonial as described above.",
    submit: "Submit testimonial",
    submitting: "Sending…",
    decline: "Not at this time",
    declining: "Saving…",
    genericError: "We were unable to complete your request. Please try again.",
    lockedPublishedTitle: "Testimonial published",
    lockedPublishedNote:
      "This testimonial has been published and can no longer be edited.",
    lockedClosedTitle: "Testimonial closed",
    lockedClosedNote:
      "This testimonial has been closed and can no longer be changed.",
    footer: "© RSM in Kuwait · Voice of Clients",
    languageLabel: "Language",
    english: "English",
    arabic: "العربية",
  },
  ar: {
    eyebrow: "صوت العملاء",
    title: "مشاركة شهادة",
    documentTitle: "شهادة عميل · RSM الكويت",
    greetingNamed: "مرحباً {name}،",
    greetingGeneric: "مرحباً،",
    intro:
      "نشكركم مرة أخرى على مشاركة ملاحظاتكم مع RSM الكويت. وإن كنتم ترغبون، فسنقدّر كلمات قليلة منكم.",
    draftTitle: "مسودتكم",
    originalTitle: "شهادتكم",
    draftNote:
      "أعددنا هذه المسودة من ملاحظاتكم فقط. لا تترددوا في تعديلها لتعبّر عن أسلوبكم.",
    originalNote:
      "يمكنكم كتابة شهادة قصيرة، أو مشاركة رابط لفيديو، أو كليهما.",
    submittedNote:
      "شكراً لكم. لقد استلمنا شهادتكم، ويمكنكم تعديلها إلى أن تنشرها RSM الكويت.",
    declinedNote:
      "شكراً لإبلاغنا. إذا رغبتم في مشاركة شهادة لاحقاً، يمكنكم ذلك من هذه الصفحة.",
    writtenLabel: "الشهادة المكتوبة",
    videoLabel: "رابط الفيديو (اختياري)",
    consentNameLegend: "هل يمكننا استخدام اسمكم؟",
    consentYes: "نعم، يمكنكم استخدام اسمي",
    consentNo: "لا، يُرجى عدم استخدام اسمي",
    publishLegend: "أين يمكننا نشرها؟",
    publishWebsite: "موقع RSM الكويت",
    publishSocial: "حسابات RSM الكويت على وسائل التواصل الاجتماعي",
    approveLabel:
      "أوافق على استخدام RSM الكويت لهذه الشهادة على النحو الموضح أعلاه.",
    submit: "إرسال الشهادة",
    submitting: "جارٍ الإرسال...",
    decline: "ليس في الوقت الحالي",
    declining: "جارٍ الحفظ...",
    genericError: "تعذّر إكمال طلبكم. يُرجى المحاولة مرة أخرى.",
    lockedPublishedTitle: "تم نشر الشهادة",
    lockedPublishedNote: "تم نشر هذه الشهادة ولم يعد بالإمكان تعديلها.",
    lockedClosedTitle: "تم إغلاق الشهادة",
    lockedClosedNote: "تم إغلاق هذه الشهادة ولم يعد بالإمكان تغييرها.",
    footer: "© RSM الكويت · صوت العملاء",
    languageLabel: "اللغة",
    english: "English",
    arabic: "العربية",
  },
};
