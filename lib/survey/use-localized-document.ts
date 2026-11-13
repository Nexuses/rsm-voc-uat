"use client";

import { useEffect } from "react";

type LocalizedDocumentOptions = {
  /** Text for the browser tab. */
  title: string;
  /** BCP-47 language tag for `<html lang>`. */
  lang: string;
  /**
   * Writing direction for `<html dir>`. Left unset by default because the survey
   * and testimonial shells set `dir` on their own layout containers; changing
   * the root direction as well would mirror those containers twice.
   */
  dir?: "ltr" | "rtl";
};

/**
 * Keeps the document shell in sync with the language the respondent is
 * actually reading.
 *
 * Route metadata is rendered on the server, before a language can be known, so
 * it can only describe one locale. Language selection happens on the client
 * (the survey switcher, or the language stored on a testimonial request), so
 * the tab title and `<html lang>` are corrected here as soon as the active
 * locale is known.
 */
export function useLocalizedDocument({
  title,
  lang,
  dir,
}: LocalizedDocumentOptions) {
  useEffect(() => {
    document.title = title;
    const root = document.documentElement;
    root.lang = lang;
    if (dir) root.dir = dir;
  }, [title, lang, dir]);
}
