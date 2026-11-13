import { SURVEY_QUESTIONS } from "@/lib/survey/constants";

export type SurveyVoiceLanguage = "en" | "ar";

export const SURVEY_VOICE_LANGUAGES = ["en", "ar"] as const;

export type LocalizedSurveyQuestion = {
  metric: (typeof SURVEY_QUESTIONS)[number]["metric"];
  question: string;
  min: number;
  max: number;
};

export type VoiceLocaleCopy = {
  shell: {
    brandSubtitle: string;
    brandTitle: string;
    headerNote: string;
    /** Browser tab title. Server metadata can only render one language, so the
     * client corrects `document.title` from this value as soon as the
     * respondent picks a language. */
    documentTitle: string;
    /** Alt text for the banner art; the artwork itself is language-neutral. */
    bannerAlt: string;
    introTitle: string;
    introBody: string;
    privacy: string;
    privacyLinkLabel: string;
    cxLogin: string;
  };
  languageSwitcher: {
    label: string;
    english: string;
    arabic: string;
  };
  modeChooser: {
    heading: string;
    copy: string;
    voiceTitle: string;
    voiceHint: string;
    voiceDuration: string;
    typedTitle: string;
    typedHint: string;
    typedDuration: string;
  };
  voicePicker: {
    heading: string;
    copy: string;
    back: string;
    englishTitle: string;
    englishHint: string;
    arabicTitle: string;
    arabicHint: string;
    /** Screen-reader action labels for each sample tile. */
    chooseEnglish: string;
    chooseArabic: string;
  };
  typed: {
    heading: string;
    stepLabel: string;
    progressLabel: string;
    identityIntro: string;
    fullName: string;
    email: string;
    company: string;
    designation: string;
    scale: string;
    /** Full metric names (CSAT/CES/NPS) shown under the step acronym heading. */
    metricFullNames: Record<"csat" | "ces" | "nps", string>;
    ratingLow: string;
    ratingNeutral: string;
    ratingHigh: string;
    /** Per-score labels for the slider readout (low → high). */
    csatRatingLabels: Record<number, string>;
    cesRatingLabels: Record<number, string>;
    npsRatingLabels: Record<number, string>;
    ratingNotLikely: string;
    ratingExtremelyLikely: string;
    npsDetractors: string;
    npsPassives: string;
    npsPromoters: string;
    npsPickExact: string;
    csatBandLow: string;
    csatBandHigh: string;
    cesBandHard: string;
    cesBandEasy: string;
    identityTitle: string;
    identityFormHeading: string;
    identityFormSubtitle: string;
    reviewTitle: string;
    commentLabel: string;
    commentPlaceholder: string;
    respondent: string;
    noComment: string;
    back: string;
    continue: string;
    review: string;
    submitting: string;
    submit: string;
    reviewError: string;
    submitError: string;
    fullNameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    companyRequired: string;
    designationRequired: string;
    ratingRequired: string;
    questions: LocalizedSurveyQuestion[];
  };
  voice: {
    heading: string;
    /** Accessible name for the animated orb (role="img"). */
    orbLabel: string;
    statusReady: string;
    statusConnecting: string;
    statusSpeaking: string;
    statusListening: string;
    statusMuted: string;
    statusOnHold: string;
    statusError: string;
    agentIdle: string;
    agentActive: string;
    micDenied: string;
    sessionFailed: string;
    creditsExhausted: string;
    connectionInterrupted: string;
    back: string;
    start: string;
    starting: string;
    tryAgain: string;
    mute: string;
    unmute: string;
    hold: string;
    resume: string;
    endSurvey: string;
    callTimerLabel: string;
    useTyped: string;
    switchTyped: string;
  };
  complete: {
    heading: string;
    title: string;
    body: string;
    submitAnother: string;
    shareTestimonial: string;
    reviewTestimonial: string;
    iconAlt: string;
  };
};

export const VOICE_LOCALES: Record<SurveyVoiceLanguage, VoiceLocaleCopy> = {
  en: {
    shell: {
      brandSubtitle: "Voice of Clients",
      brandTitle: "RSM in Kuwait",
      headerNote: "Client feedback",
      documentTitle: "Post-Engagement Satisfaction Survey | Voice of Clients",
      bannerAlt: "RSM in Kuwait Voice of Clients banner",
      introTitle: "Voice of Clients",
      introBody:
        "Thank you for taking a few minutes with us. This short, confidential survey asks about the quality of our service, how easy we were to work with and how likely you are to recommend RSM in Kuwait.",
      privacy:
        "Confidential. Voice audio goes to our provider. Only authorised RSM Kuwait CX team sees your feedback.",
      privacyLinkLabel: "Read our Privacy Notice",
      cxLogin: "CX team login",
    },
    languageSwitcher: {
      label: "Language",
      english: "English",
      arabic: "العربية",
    },
    modeChooser: {
      heading: "How would you like to share your feedback?",
      copy: "Please choose whichever suits you best. Both options ask the same three questions.",
      voiceTitle: "Take voice survey",
      voiceHint: "Share your feedback in a short spoken conversation with our survey host",
      voiceDuration: "About three minutes",
      typedTitle: "Take typed survey",
      typedHint: "Answer each question in your own time",
      typedDuration: "Five short steps",
    },
    voicePicker: {
      heading: "Which language would you prefer?",
      copy: "Our survey host can speak with you in English or Arabic.",
      back: "Back",
      englishTitle: "English",
      englishHint: "Continue in English",
      arabicTitle: "Arabic",
      arabicHint: "Continue in Arabic",
      chooseEnglish: "Choose English",
      chooseArabic: "Choose Arabic",
    },
    typed: {
      heading: "Typed survey",
      stepLabel: "Step {step} of {total}",
      progressLabel: "Survey progress: step {step} of {total}",
      identityIntro: "Your name, company and role help us place your feedback in context. We'll use your email for future communication.",
      fullName: "Full name",
      email: "Email address",
      company: "Business or company name",
      designation: "Designation",
      scale: "{min}–{max} scale",
      metricFullNames: {
        csat: "Client Satisfaction Score",
        ces: "Customer Effort Score",
        nps: "Net Promoter Score",
      },
      ratingLow: "Low",
      ratingNeutral: "Neutral",
      ratingHigh: "High",
      csatRatingLabels: {
        1: "Dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very Satisfied",
      },
      cesRatingLabels: {
        1: "Very Difficult",
        2: "Difficult",
        3: "Difficult",
        4: "Neutral",
        5: "Easy",
        6: "Very Easy",
        7: "Very Easy",
      },
      npsRatingLabels: {
        0: "Detractors",
        1: "Detractors",
        2: "Detractors",
        3: "Detractors",
        4: "Detractors",
        5: "Detractors",
        6: "Detractors",
        7: "Neutral",
        8: "Neutral",
        9: "Promoters",
        10: "Promoters",
      },
      ratingNotLikely: "Not likely",
      ratingExtremelyLikely: "Extremely likely",
      npsDetractors: "Detractors",
      npsPassives: "Passives",
      npsPromoters: "Promoters",
      npsPickExact: "Choose an exact score",
      csatBandLow: "Dissatisfied",
      csatBandHigh: "Satisfied",
      cesBandHard: "Difficult",
      cesBandEasy: "Easy",
      identityTitle: "Who are we hearing from?",
      identityFormHeading: "Your details",
      identityFormSubtitle: "Please complete all four fields.",
      reviewTitle: "Please review your answers",
      commentLabel: "Optional comment about {metric}",
      commentPlaceholder:
        "If you wish, please add a few words to help us understand your rating.",
      respondent: "Respondent",
      noComment: "No comment provided",
      back: "Back",
      continue: "Continue",
      review: "Review answers",
      submitting: "Submitting…",
      submit: "Submit feedback",
      reviewError: "Please review your response and try again.",
      submitError:
        "We were unable to save your feedback. Your answers have been kept, so please try again.",
      fullNameRequired: "Full name is required.",
      emailRequired: "Email address is required.",
      emailInvalid: "Enter a valid email address.",
      companyRequired: "Company name is required.",
      designationRequired: "Designation is required.",
      ratingRequired: "A rating is required.",
      questions: SURVEY_QUESTIONS.map((definition) => ({
        metric: definition.metric,
        question: definition.question,
        min: definition.min,
        max: definition.max,
      })),
    },
    voice: {
      heading: "Voice survey",
      orbLabel: "Live voice orb",
      statusReady: "Ready when you are",
      statusConnecting: "Connecting",
      statusSpeaking: "Speaking",
      statusListening: "Listening",
      statusMuted: "Microphone muted",
      statusOnHold: "On hold",
      statusError: "Unable to connect",
      agentIdle:
        "Our host will first ask for your name, company and designation, then three short rating questions. It takes about three minutes. When you are ready, choose Start voice survey to begin.",
      agentActive:
        "Our host is taking you through your details and the three questions.",
      micDenied:
        "The voice survey needs access to your microphone. Please allow access and try again.",
      sessionFailed:
        "We were unable to start the voice survey. Please try again, or use the typed survey if you prefer.",
      creditsExhausted:
        "The voice survey is not available at the moment. Please use the typed survey.",
      connectionInterrupted:
        "The connection was interrupted. Please try again.",
      back: "Back",
      start: "Start voice survey",
      starting: "Connecting...",
      tryAgain: "Try again",
      mute: "Mute",
      unmute: "Unmute",
      hold: "Hold",
      resume: "Resume",
      endSurvey: "End survey",
      callTimerLabel: "Call duration",
      useTyped: "Use the typed survey instead",
      switchTyped: "Use the typed survey instead",
    },
    complete: {
      heading: "Thank you",
      title: "We appreciate you taking the time to share your feedback.",
      body: "Your views help us keep improving the way we work with you.",
      submitAnother: "Submit another response",
      shareTestimonial: "Share a testimonial",
      reviewTestimonial: "Review your testimonial",
      iconAlt: "Submission received",
    },
  },
  ar: {
    shell: {
      brandSubtitle: "صوت العملاء",
      brandTitle: "RSM الكويت",
      headerNote: "ملاحظات العملاء",
      documentTitle: "استبيان الرضا بعد إتمام الخدمة | صوت العملاء",
      bannerAlt: "لافتة RSM الكويت — صوت العملاء",
      introTitle: "صوت العملاء",
      introBody:
        "شكراً لتخصيصكم بضع دقائق لنا. يتناول هذا الاستبيان القصير والسري جودة خدماتنا وسهولة التعامل معنا ومدى احتمال توصيتكم بـ RSM الكويت.",
      privacy:
        "سري. يُعالج الصوت لدى مزوّد الخدمة الصوتية. لا يطّلع على ملاحظاتكم سوى فريق CX المعتمد في RSM الكويت.",
      privacyLinkLabel: "اقرأوا إشعار الخصوصية",
      cxLogin: "تسجيل دخول فريق تجربة العملاء",
    },
    languageSwitcher: {
      label: "اللغة",
      english: "English",
      arabic: "العربية",
    },
    modeChooser: {
      heading: "كيف تفضّلون مشاركة ملاحظاتكم؟",
      copy: "يُرجى اختيار ما يناسبكم. يتضمن الخياران الأسئلة الثلاثة ذاتها.",
      voiceTitle: "الاستبيان الصوتي",
      voiceHint: "شاركونا ملاحظاتكم في محادثة صوتية قصيرة مع مضيفة الاستبيان",
      voiceDuration: "حوالي ثلاث دقائق",
      typedTitle: "الاستبيان المكتوب",
      typedHint: "أجيبوا عن كل سؤال في الوقت الذي يناسبكم",
      typedDuration: "خمس خطوات قصيرة",
    },
    voicePicker: {
      heading: "بأي لغة تفضّلون المشاركة؟",
      copy: "يمكن لمضيفة الاستبيان التحدث معكم بالإنجليزية أو العربية.",
      back: "رجوع",
      englishTitle: "الإنجليزية",
      englishHint: "المتابعة بالإنجليزية",
      arabicTitle: "العربية",
      arabicHint: "المتابعة بالعربية",
      chooseEnglish: "اختر الإنجليزية",
      chooseArabic: "اختر العربية",
    },
    typed: {
      heading: "الاستبيان المكتوب",
      stepLabel: "الخطوة {step} من {total}",
      progressLabel: "تقدم الاستبيان: الخطوة {step} من {total}",
      identityIntro:
        "تساعدنا بياناتكم عن الاسم والشركة والمسمى الوظيفي على فهم ملاحظاتكم في سياقها، وسنستخدم بريدكم الإلكتروني للتواصل معكم مستقبلاً.",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      company: "اسم الشركة أو المؤسسة",
      designation: "المسمى الوظيفي",
      scale: "مقياس {min}–{max}",
      metricFullNames: {
        csat: "درجة رضا العميل",
        ces: "درجة بذل الجهد",
        nps: "مؤشر صافي الترويج",
      },
      ratingLow: "منخفض",
      ratingNeutral: "محايد",
      ratingHigh: "مرتفع",
      csatRatingLabels: {
        1: "غير راضٍ",
        2: "غير راضٍ",
        3: "محايد",
        4: "راضٍ",
        5: "راضٍ جداً",
      },
      cesRatingLabels: {
        1: "صعب جداً",
        2: "صعب",
        3: "صعب",
        4: "محايد",
        5: "سهل",
        6: "سهل جداً",
        7: "سهل جداً",
      },
      npsRatingLabels: {
        0: "غير المروّجين",
        1: "غير المروّجين",
        2: "غير المروّجين",
        3: "غير المروّجين",
        4: "غير المروّجين",
        5: "غير المروّجين",
        6: "غير المروّجين",
        7: "محايد",
        8: "محايد",
        9: "المروجون",
        10: "المروجون",
      },
      ratingNotLikely: "غير محتمل",
      ratingExtremelyLikely: "محتمل جداً",
      npsDetractors: "غير المروّجين",
      npsPassives: "المحايدون",
      npsPromoters: "المروجون",
      npsPickExact: "اختروا درجة دقيقة",
      csatBandLow: "غير راضٍ",
      csatBandHigh: "راضٍ",
      cesBandHard: "صعب",
      cesBandEasy: "سهل",
      identityTitle: "من نتحدث إليه؟",
      identityFormHeading: "بياناتكم",
      identityFormSubtitle: "يُرجى إكمال الحقول الأربعة كاملة.",
      reviewTitle: "يُرجى مراجعة إجاباتكم",
      commentLabel: "تعليق اختياري حول {metric}",
      commentPlaceholder:
        "إن رغبتم، يُرجى إضافة بضع كلمات تساعدنا على فهم تقييمكم.",
      respondent: "المشارك",
      noComment: "لم تُضف ملاحظة",
      back: "رجوع",
      continue: "متابعة",
      review: "مراجعة الإجابات",
      submitting: "جارٍ الإرسال...",
      submit: "إرسال الملاحظات",
      reviewError: "يرجى مراجعة إجابتكم والمحاولة مرة أخرى.",
      submitError:
        "تعذّر حفظ ملاحظاتكم. تم الاحتفاظ بإجاباتكم، يُرجى المحاولة مرة أخرى.",
      fullNameRequired: "الاسم الكامل مطلوب.",
      emailRequired: "البريد الإلكتروني مطلوب.",
      emailInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
      companyRequired: "اسم الشركة مطلوب.",
      designationRequired: "المسمى الوظيفي مطلوب.",
      ratingRequired: "التقييم مطلوب.",
      questions: [
        {
          metric: "csat",
          question:
            "ما مدى رضاكم عن الجودة الشاملة للخدمات المقدمة من RSM الكويت؟",
          min: 1,
          max: 5,
        },
        {
          metric: "ces",
          question:
            "إلى أي مدى توافقون على أن RSM الكويت سهّلت لكم الحصول على الخدمة والدعم الذي احتجتموه؟",
          min: 1,
          max: 7,
        },
        {
          metric: "nps",
          question:
            "على مقياس من 0 إلى 10، ما مدى احتمالية توصيتكم بـ RSM الكويت لزميل أو شريك عمل؟",
          min: 0,
          max: 10,
        },
      ],
    },
    voice: {
      heading: "الاستبيان الصوتي",
      orbLabel: "الواجهة الصوتية المباشرة",
      statusReady: "جاهزون عندما تكونون مستعدين",
      statusConnecting: "جارٍ الاتصال",
      statusSpeaking: "المضيفة تتحدث",
      statusListening: "المضيفة تستمع",
      statusMuted: "الميكروفون مكتوم",
      statusOnHold: "في الانتظار",
      statusError: "تعذّر الاتصال",
      agentIdle:
        "ستطلب المضيفة أولاً اسمكم والشركة والمسمى الوظيفي، ثم ثلاثة أسئلة تقييم قصيرة. يستغرق ذلك حوالي ثلاث دقائق. عندما تكونون مستعدين، اختاروا «بدء الاستبيان الصوتي» للبدء.",
      agentActive:
        "تقوم المضيفة بمرافقتكم خلال بياناتكم والأسئلة الثلاثة.",
      micDenied:
        "يحتاج الاستبيان الصوتي إلى الوصول إلى الميكروفون. يُرجى السماح بالوصول والمحاولة مرة أخرى.",
      sessionFailed:
        "تعذّر بدء الاستبيان الصوتي. يُرجى المحاولة مرة أخرى أو استخدام الاستبيان المكتوب إن كنتم تفضلون ذلك.",
      creditsExhausted:
        "الاستبيان الصوتي غير متاح حالياً. يُرجى استخدام الاستبيان المكتوب.",
      connectionInterrupted: "انقطع الاتصال. يُرجى المحاولة مرة أخرى.",
      back: "رجوع",
      start: "بدء الاستبيان الصوتي",
      starting: "جارٍ الاتصال...",
      tryAgain: "يُرجى المحاولة مرة أخرى",
      mute: "كتم",
      unmute: "إلغاء الكتم",
      hold: "انتظار",
      resume: "متابعة",
      endSurvey: "إنهاء الاستبيان",
      callTimerLabel: "مدة المكالمة",
      useTyped: "استخدام الاستبيان المكتوب بدلاً من ذلك",
      switchTyped: "استخدام الاستبيان المكتوب بدلاً من ذلك",
    },
    complete: {
      heading: "شكراً لكم",
      title: "نقدّر الوقت الذي خصصتموه لمشاركة ملاحظاتكم.",
      body: "تساعدنا آراؤكم على مواصلة تحسين طريقة عملنا معكم.",
      submitAnother: "إرسال رد آخر",
      shareTestimonial: "مشاركة شهادة",
      reviewTestimonial: "مراجعة شهادتكم",
      iconAlt: "تم استلام الإجابة",
    },
  },
};

export function getVoiceLocale(language: SurveyVoiceLanguage): VoiceLocaleCopy {
  return VOICE_LOCALES[language];
}

export function getVoiceConversationLanguage(
  uiLanguage: SurveyVoiceLanguage
): SurveyVoiceLanguage {
  return uiLanguage === "ar" ? "ar" : "en";
}

export function formatLocaleCopy(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

export function isRtlVoiceLanguage(language: SurveyVoiceLanguage): boolean {
  return language === "ar";
}
