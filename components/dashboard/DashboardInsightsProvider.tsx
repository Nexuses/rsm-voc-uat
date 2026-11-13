"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SurveyInviteRecord } from "@/lib/survey-outreach";
import type { DashboardInsight } from "./types";

const INSIGHTS_TIMEOUT_MS = 45_000;

type DashboardInsightsContextValue = {
  items: DashboardInsight[];
  inviteRecords: SurveyInviteRecord[];
  loading: boolean;
  loadingHint: boolean;
  error: string;
  retryInsights: () => void;
};

const DashboardInsightsContext =
  createContext<DashboardInsightsContextValue | null>(null);

export function DashboardInsightsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DashboardInsight[]>([]);
  const [inviteRecords, setInviteRecords] = useState<SurveyInviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHint, setLoadingHint] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const loadInsights = useCallback(
    async (signal: AbortSignal, hasCachedItems: boolean) => {
      if (!hasCachedItems) {
        setLoading(true);
      }
      setError("");

      const timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          setLoadingHint(true);
        }
      }, 5000);

      try {
        const [insightsResponse, inviteStatsResponse] = await Promise.all([
          fetch("/api/insights", { signal }),
          fetch("/api/survey/invite-stats", { signal }),
        ]);

        if (inviteStatsResponse.ok) {
          const inviteData = (await inviteStatsResponse.json()) as {
            invites?: SurveyInviteRecord[];
          };
          setInviteRecords(inviteData.invites ?? []);
        }

        if (insightsResponse.status === 403) {
          setItems([]);
          setError("");
          return;
        }

        const data = (await insightsResponse.json()) as
          | DashboardInsight[]
          | { error?: string };
        if (!insightsResponse.ok) {
          const message =
            typeof data === "object" &&
            data &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unable to load insights.";
          throw new Error(message);
        }

        setItems(data as DashboardInsight[]);
        setError("");
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? `${fetchError.message} Try again in a moment.`
            : "Unable to load insights. Please refresh the page."
        );
      } finally {
        clearTimeout(timeoutId);
        setLoadingHint(false);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      INSIGHTS_TIMEOUT_MS
    );

    void loadInsights(controller.signal, items.length > 0);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    // Only refetch when explicitly retried; items.length is read for stale-while-revalidate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadInsights, reloadToken]);

  function retryInsights() {
    setReloadToken((value) => value + 1);
  }

  return (
    <DashboardInsightsContext.Provider
      value={{
        items,
        inviteRecords,
        loading,
        loadingHint,
        error,
        retryInsights,
      }}
    >
      {children}
    </DashboardInsightsContext.Provider>
  );
}

export function useDashboardInsights() {
  const context = useContext(DashboardInsightsContext);
  if (!context) {
    throw new Error(
      "useDashboardInsights must be used within DashboardInsightsProvider"
    );
  }
  return context;
}
