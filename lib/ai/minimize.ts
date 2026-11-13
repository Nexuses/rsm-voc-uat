const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// International or local numbers with 8+ digits, allowing spaces, dashes, dots, and parentheses.
// Boundaries exclude UUID segments and ISO timestamps.
const PHONE = /(?<![\w/.:-])\+?\d[\d\s().-]{6,}\d(?![\w/:-])/g;
const DATE_LIKE = /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/;

function looksLikePhone(value: string) {
  return value.replace(/\D/g, "").length >= 8 && !DATE_LIKE.test(value.trim());
}

/**
 * Replaces emails and phone numbers with stable aliases before text reaches
 * the model. `rehydrate` restores them in the answer for callers allowed to
 * see contact details; everyone else keeps the alias.
 */
export class ContactAliaser {
  private readonly byValue = new Map<string, string>();
  private readonly byAlias = new Map<string, string>();

  private alias(kind: "contact" | "phone", value: string) {
    const key = value.toLowerCase();
    const existing = this.byValue.get(key);
    if (existing) return existing;
    const alias = `[${kind}-${this.byValue.size + 1}]`;
    this.byValue.set(key, alias);
    this.byAlias.set(alias, value);
    return alias;
  }

  redact(text: string) {
    return text
      .replace(EMAIL, (match) => this.alias("contact", match))
      .replace(PHONE, (match) => (looksLikePhone(match) ? this.alias("phone", match.trim()) : match));
  }

  rehydrate(text: string) {
    let result = text;
    for (const [alias, value] of this.byAlias) {
      result = result.split(alias).join(value);
    }
    return result;
  }

  get size() {
    return this.byAlias.size;
  }
}

/** Respondent text goes in as quoted data, never as instructions. */
export function quoteUntrusted(label: string, text: string) {
  const cleaned = text.replace(/<\/?untrusted[^>]*>/gi, "");
  return `<untrusted source="${label}">\n${cleaned}\n</untrusted>`;
}
