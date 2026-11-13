import type { VoiceInviteContext } from "@/lib/survey/invite-context";

const EN_GREETING =
  "Hello, I'm Sara, the Voice of Clients host for RSM Kuwait. Thank you for taking the time to share your feedback with us.";

const AR_GREETING =
  "مرحبًا، أنا سارة، مقدمة برنامج صوت العميل لـ RSM في الكويت. شكرًا لك على تخصيص الوقت لمشاركة ملاحظاتك معنا.";

function hasInviteIdentity(context: VoiceInviteContext) {
  return Boolean(context.fullName || context.company || context.designation);
}

function buildEnglishConfirmDetails(context: VoiceInviteContext) {
  if (context.fullName && context.company && context.designation) {
    return `I have your details as ${context.fullName} from ${context.company}, with the position ${context.designation}. Is that correct?`;
  }

  const parts: string[] = [];
  if (context.fullName) parts.push(`your name as ${context.fullName}`);
  if (context.company) parts.push(`your company as ${context.company}`);
  if (context.designation) {
    parts.push(`your position as ${context.designation}`);
  }

  if (parts.length === 1) {
    return `I have ${parts[0]}. Is that correct?`;
  }
  if (parts.length === 2) {
    return `I have ${parts[0]} and ${parts[1]}. Is that correct?`;
  }
  return `I have ${parts[0]}, ${parts[1]}, and ${parts[2]}. Is that correct?`;
}

function buildArabicConfirmDetails(context: VoiceInviteContext) {
  if (context.fullName && context.company && context.designation) {
    return `لدي تفاصيلكم كالتالي: ${context.fullName} من ${context.company}، والمنصب ${context.designation}. هل هذا صحيح؟`;
  }

  const parts: string[] = [];
  if (context.fullName) parts.push(`اسمكم كـ ${context.fullName}`);
  if (context.company) parts.push(`اسم الشركة كـ ${context.company}`);
  if (context.designation) parts.push(`منصبكم كـ ${context.designation}`);

  if (parts.length === 1) {
    return `لدي ${parts[0]}. هل هذا صحيح؟`;
  }
  if (parts.length === 2) {
    return `لدي ${parts[0]} و${parts[1]}. هل هذا صحيح؟`;
  }
  return `لدي ${parts[0]}، و${parts[1]}، و${parts[2]}. هل هذا صحيح؟`;
}

/**
 * Second sentence of the agent greeting, injected via the `invite_opening`
 * dynamic variable (language is already chosen in the UI).
 */
export function buildVoiceInviteOpening(
  language: "en" | "ar",
  context: VoiceInviteContext
): string {
  if (language === "ar") {
    if (!hasInviteIdentity(context)) {
      return "هل يمكنني معرفة اسمك الكامل، من فضلك؟";
    }
    return buildArabicConfirmDetails(context);
  }

  if (!hasInviteIdentity(context)) {
    return "May I have your full name, please?";
  }
  return buildEnglishConfirmDetails(context);
}

/** Full opening line (greeting + invite opening). Used in tests. */
export function buildVoiceFirstMessage(
  language: "en" | "ar",
  context: VoiceInviteContext
): string {
  const greeting = language === "ar" ? AR_GREETING : EN_GREETING;
  return `${greeting} ${buildVoiceInviteOpening(language, context)}`;
}
