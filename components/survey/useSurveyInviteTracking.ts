"use client";

import { useEffect, useRef } from "react";

async function postInviteEvent(token: string, event: "open" | "start") {
  try {
    await fetch("/api/survey/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, event }),
    });
  } catch {
    // Tracking must not block the survey experience.
  }
}

export function useSurveyInviteTracking(inviteToken: string | null) {
  const openedRef = useRef(false);

  useEffect(() => {
    if (!inviteToken || openedRef.current) return;
    openedRef.current = true;
    void postInviteEvent(inviteToken, "open");
  }, [inviteToken]);

  function trackSurveyStart() {
    if (!inviteToken) return;
    void postInviteEvent(inviteToken, "start");
  }

  return { trackSurveyStart };
}
