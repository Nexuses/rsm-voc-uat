"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnDef } from "@tanstack/react-table";
import CompactDataTable from "@/components/dashboard/CompactDataTable";
import DashboardReportFilters from "@/components/dashboard/DashboardReportFilters";
import { useHasPermission } from "@/components/dashboard/DashboardPermissions";
import SmileyIcon from "@/components/dashboard/SmileyIcon";
import { collectInviteFilterOptions, emptyDashboardOrgFilters, filterDashboardInsights } from "@/lib/dashboard-report-filters";
import {
  DASHBOARD_INSIGHTS_EXPORT_LIMIT,
  downloadDashboardInsightsCsv,
  downloadDashboardInsightsExcel,
  groupDashboardInsightsByEmail,
  matchesDashboardInsightSearch,
  sortDashboardInsightsByRecency,
} from "@/lib/dashboard-responses-export";
import type { SmileyTone } from "@/lib/rating-visuals";
import styles from "./dashboard.module.css";
import type {
  DashboardInsight,
  DashboardMood,
  DashboardSentiment,
  DashboardWindow,
} from "./types";
import { useDashboardInsights } from "./useDashboardInsights";

type ResponseListView = "email" | "recent";
type ResponsePageSize = 25 | 50 | 100;

const RESPONSE_PAGE_SIZES: ResponsePageSize[] = [25, 50, 100];

const moodOptions: Array<{
  label: string;
  value: DashboardMood;
  tone?: SmileyTone;
}> = [
  { label: "Show all responses", value: "all" },
  { label: "Show satisfied responses", value: "happy", tone: "positive" },
  { label: "Show neutral responses", value: "neutral", tone: "neutral" },
  { label: "Show dissatisfied responses", value: "unhappy", tone: "negative" },
];

const COMMENT_PREVIEW_LENGTH = 140;
const TOOLTIP_HIDE_DELAY_MS = 120;

function ResponseComments({
  answers,
}: {
  answers: DashboardInsight["answers"];
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const comments = answers.filter((answer) => answer.comments);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = 300;
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - tooltipWidth - 12
    );

    setPosition({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  const showTooltip = useCallback(() => {
    clearHideTimer();
    updatePosition();
    setOpen(true);
  }, [clearHideTimer, updatePosition]);

  const hideTooltip = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!pinned) {
        setOpen(false);
      }
    }, TOOLTIP_HIDE_DELAY_MS);
  }, [clearHideTimer, pinned]);

  const closeTooltip = useCallback(() => {
    clearHideTimer();
    setPinned(false);
    setOpen(false);
  }, [clearHideTimer]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => updatePosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTooltip();
      }
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeTooltip, open, updatePosition]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  if (!comments.length) {
    return <span className={styles.noComments}>—</span>;
  }

  const commentLabel =
    comments.length === 1 ? "1 comment" : `${comments.length} comments`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.commentTrigger}
        aria-label={`${commentLabel}. Hover or click to read survey comments.`}
        aria-expanded={open}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) {
            return;
          }
          if (!pinned) {
            hideTooltip();
          }
        }}
        onClick={() => {
          if (open && pinned) {
            closeTooltip();
            return;
          }
          setPinned(true);
          showTooltip();
        }}
      >
        <CommentIcon className={styles.commentTriggerIcon} />
        <span>{comments.length}</span>
      </button>
      {open
        ? createPortal(
            <div
              className={styles.commentTooltip}
              role="tooltip"
              style={{
                top: position.top,
                left: position.left,
              }}
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              {comments.map((answer) => (
                <p key={answer.questionNumber} className={styles.commentEntry}>
                  <strong>
                    {answer.metric?.toUpperCase() ?? `Q${answer.questionNumber}`}
                  </strong>
                  <span>{answer.comments}</span>
                </p>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

type TranscriptPayload = {
  answers: Array<{
    metric: string;
    question: string;
    score: number | null;
    comment: string | null;
  }>;
  turns: Array<{ role: "agent" | "user"; message: string }>;
};

function ResponseTranscript({ responseId }: { responseId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [transcript, setTranscript] = useState<TranscriptPayload | null>(null);

  const loadTranscript = useCallback(async () => {
    setOpen(true);
    if (transcript || loading) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/responses/${responseId}/transcript`);
      const data = (await response.json().catch(() => ({}))) as TranscriptPayload & {
        error?: string;
      };
      if (!response.ok) {
        setErrorMessage(data.error ?? "Could not load the transcript.");
        return;
      }
      setTranscript(data);
    } catch {
      setErrorMessage("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, responseId, transcript]);

  return (
    <>
      <button
        type="button"
        className={styles.commentTrigger}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          void loadTranscript();
        }}
      >
        Transcript
      </button>
      {open
        ? createPortal(
            <div className={styles.transcriptBackdrop} role="presentation">
              <div
                className={styles.transcriptPanel}
                role="dialog"
                aria-modal="true"
                aria-label="Survey transcript"
              >
                <div className={styles.transcriptHeader}>
                  <strong>Survey transcript</strong>
                  <button type="button" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
                {loading ? <p>Loading transcript…</p> : null}
                {errorMessage ? <p role="alert">{errorMessage}</p> : null}
                {transcript ? (
                  <>
                    {transcript.answers.map((answer) => (
                      <article key={answer.metric} className={styles.transcriptAnswer}>
                        <p>
                          <strong>{answer.metric.toUpperCase()}</strong>
                          {answer.score == null ? "" : ` · ${answer.score}`}
                        </p>
                        <p>{answer.question}</p>
                        <p>{answer.comment ? `Comment: ${answer.comment}` : "Comment: —"}</p>
                      </article>
                    ))}
                    {transcript.turns.length ? (
                      <div className={styles.transcriptTurns}>
                        {transcript.turns.map((turn, index) => (
                          <p key={`${turn.role}-${index}`}>
                            <strong>{turn.role === "agent" ? "RSM" : "Client"}:</strong>{" "}
                            {turn.message}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default function DashboardResponses() {
  const { items, inviteRecords, loading, loadingHint, error, retryInsights } =
    useDashboardInsights();
  const canManage = useHasPermission("responses.manage");
  const [window, setWindow] = useState<DashboardWindow>("all");
  const [org, setOrg] = useState(emptyDashboardOrgFilters);
  const filterOptions = useMemo(
    () => collectInviteFilterOptions([...inviteRecords, ...items]),
    [inviteRecords, items]
  );
  const [sentiment, setSentiment] = useState<"" | DashboardSentiment>("");
  const [mood, setMood] = useState<DashboardMood>("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [listView, setListView] = useState<ResponseListView>("recent");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<ResponsePageSize>(25);
  const [pageIndex, setPageIndex] = useState(0);

  const windowItems = useMemo(
    () => filterDashboardInsights(items, window, org),
    [items, org, window]
  );
  const filteredItems = useMemo(
    () =>
      windowItems.filter((item) => {
        if (sentiment && item.sentiment !== sentiment) return false;
        if (riskOnly && item.riskSignals.length === 0) return false;
        const csat = metricValue(item, "csat");
        if (mood === "happy" && (csat === null || csat < 4)) return false;
        if (mood === "neutral" && csat !== 3) return false;
        if (mood === "unhappy" && (csat === null || csat > 2)) return false;
        if (!matchesDashboardInsightSearch(item, search)) return false;
        return true;
      }),
    [mood, riskOnly, search, sentiment, windowItems]
  );

  const groupedItems = useMemo(
    () => groupDashboardInsightsByEmail(filteredItems),
    [filteredItems]
  );
  const recentItems = useMemo(
    () => sortDashboardInsightsByRecency(filteredItems),
    [filteredItems]
  );

  const pageItemCount =
    listView === "recent" ? recentItems.length : groupedItems.length;
  const pageCount = Math.max(1, Math.ceil(pageItemCount / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, pageItemCount);
  const pagedRecentItems = useMemo(
    () => recentItems.slice(pageStart, pageStart + pageSize),
    [pageSize, pageStart, recentItems]
  );
  const pagedGroupedItems = useMemo(
    () => groupedItems.slice(pageStart, pageStart + pageSize),
    [groupedItems, pageSize, pageStart]
  );

  useEffect(() => {
    setPageIndex(0);
  }, [listView, mood, org, pageSize, riskOnly, search, sentiment, window]);

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageCount, pageIndex]);

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Response ledger</span>
          <h1>Client feedback detail</h1>
        </div>
      </header>
      <DashboardReportFilters
        window={window}
        onWindowChange={setWindow}
        org={org}
        onOrgChange={setOrg}
        options={filterOptions}
      />

      {loading ? (
        <DashboardMessage>
          Loading insights...
          {loadingHint ? (
            <>
              {" "}
              The database may be waking up — this can take up to a minute on
              the first load.
            </>
          ) : null}
        </DashboardMessage>
      ) : null}
      {error ? (
        <DashboardMessage tone="error">
          {error}{" "}
          <button type="button" className={styles.retryButton} onClick={retryInsights}>
            Retry
          </button>
        </DashboardMessage>
      ) : null}

      {!loading && !error ? (
        <section className={styles.responseSection}>
          <div className={styles.sectionTitle}>
            <div>
              <span>Filtered view</span>
              <h2>Survey responses</h2>
            </div>
            <div className={styles.topbarActions}>
              <strong>{filteredItems.length} shown</strong>
              <button
                type="button"
                className={styles.inviteSecondaryButton}
                disabled={!filteredItems.length}
                onClick={() =>
                  downloadDashboardInsightsCsv(
                    filteredItems,
                    "voc-responses.csv"
                  )
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className={styles.inviteSecondaryButton}
                disabled={!filteredItems.length}
                onClick={() =>
                  downloadDashboardInsightsExcel(
                    filteredItems,
                    "voc-responses.xls"
                  )
                }
              >
                Export Excel
              </button>
            </div>
          </div>
          {items.length >= DASHBOARD_INSIGHTS_EXPORT_LIMIT ? (
            <p className={styles.inviteCsvHint}>
              Showing the latest {DASHBOARD_INSIGHTS_EXPORT_LIMIT} responses.
              Export uses this filtered table only.
            </p>
          ) : null}
          <div className={styles.filters}>
            <label className={styles.responseSearch}>
              <span>Search</span>
              <input
                type="search"
                value={search}
                placeholder="Name, email, company…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className={styles.moodPicker} aria-label="Filter by CSAT">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={option.value === "all" ? styles.moodAll : undefined}
                  aria-label={option.label}
                  aria-pressed={mood === option.value}
                  onClick={() => setMood(option.value)}
                >
                  {option.value === "all" ? (
                    <span>All</span>
                  ) : (
                    <SmileyIcon tone={option.tone!} className={styles.moodIcon} />
                  )}
                </button>
              ))}
            </div>
            <label>
              <span>Sentiment</span>
              <select
                value={sentiment}
                onChange={(event) =>
                  setSentiment(event.target.value as "" | DashboardSentiment)
                }
              >
                <option value="">All sentiment</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </label>
            <label className={styles.riskFilter}>
              <input
                type="checkbox"
                checked={riskOnly}
                onChange={(event) => setRiskOnly(event.target.checked)}
              />
              Risk signals only
            </label>
            <div className={styles.viewToggle} role="group" aria-label="Response layout">
              <button
                type="button"
                aria-pressed={listView === "email"}
                onClick={() => setListView("email")}
              >
                By email
              </button>
              <button
                type="button"
                aria-pressed={listView === "recent"}
                onClick={() => setListView("recent")}
              >
                By recency
              </button>
            </div>
          </div>
          <p className={styles.inviteCsvHint}>
            Quarterly overwrite keeps the latest response per respondent email
            (UTC quarter). Voice answers without an email or invite match are
            not merged — check the Email column / By email view.
          </p>
          {filteredItems.length ? (
            <>
              <ResponsesPagination
                pageIndex={safePageIndex}
                pageCount={pageCount}
                pageSize={pageSize}
                itemCount={pageItemCount}
                pageStart={pageStart}
                pageEnd={pageEnd}
                unit={listView === "recent" ? "responses" : "email groups"}
                onPageIndexChange={setPageIndex}
                onPageSizeChange={setPageSize}
              />
              {listView === "recent" ? (
                <div className={styles.responseGroup}>
                  <ResponseDataTable
                    items={pagedRecentItems}
                    ariaLabel="Survey responses by recency"
                    canManage={canManage}
                    onManaged={retryInsights}
                  />
                </div>
              ) : (
                <div className={styles.responseGroups}>
                  {pagedGroupedItems.map((group) => (
                    <section
                      key={group.key}
                      className={styles.responseGroup}
                      aria-label={group.label}
                    >
                      <div className={styles.responseGroupHeader}>
                        <div>
                          <strong>{group.label}</strong>
                          <span>
                            {group.items.length} response
                            {group.items.length === 1 ? "" : "s"}
                            {" · "}
                            latest CSAT {group.latest.metrics.csat ?? "—"} / CES{" "}
                            {group.latest.metrics.ces ?? "—"} / NPS{" "}
                            {group.latest.metrics.nps ?? "—"}
                          </span>
                        </div>
                        {group.items.length > 1 ? (
                          <button
                            type="button"
                            className={styles.inviteTableAction}
                            onClick={() =>
                              downloadDashboardInsightsCsv(
                                group.items,
                                "voc-email-history.csv"
                              )
                            }
                          >
                            Export group
                          </button>
                        ) : null}
                      </div>
                      <ResponseDataTable
                        items={group.items}
                        ariaLabel={`Survey responses for ${group.label}`}
                        canManage={canManage}
                        onManaged={retryInsights}
                      />
                    </section>
                  ))}
                </div>
              )}
              {pageCount > 1 ? (
                <ResponsesPagination
                  pageIndex={safePageIndex}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  itemCount={pageItemCount}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  unit={listView === "recent" ? "responses" : "email groups"}
                  onPageIndexChange={setPageIndex}
                  onPageSizeChange={setPageSize}
                />
              ) : null}
            </>
          ) : (
            <DashboardMessage>No responses match these filters.</DashboardMessage>
          )}
        </section>
      ) : null}
    </>
  );
}

function ResponsesPagination({
  pageIndex,
  pageCount,
  pageSize,
  itemCount,
  pageStart,
  pageEnd,
  unit,
  onPageIndexChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageCount: number;
  pageSize: ResponsePageSize;
  itemCount: number;
  pageStart: number;
  pageEnd: number;
  unit: string;
  onPageIndexChange: (page: number) => void;
  onPageSizeChange: (size: ResponsePageSize) => void;
}) {
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;
  const from = itemCount === 0 ? 0 : pageStart + 1;

  return (
    <div className={styles.tablePagination} role="navigation" aria-label="Table pagination">
      <label className={styles.tablePaginationSize}>
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(event) =>
            onPageSizeChange(Number(event.target.value) as ResponsePageSize)
          }
        >
          {RESPONSE_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.tablePaginationStatus}>
        {from}–{pageEnd} of {itemCount} {unit}
      </p>
      <div className={styles.tablePaginationControls}>
        <button
          type="button"
          className={styles.inviteSecondaryButton}
          disabled={!canPrev}
          onClick={() => onPageIndexChange(0)}
          aria-label="First page"
        >
          First
        </button>
        <button
          type="button"
          className={styles.inviteSecondaryButton}
          disabled={!canPrev}
          onClick={() => onPageIndexChange(pageIndex - 1)}
          aria-label="Previous page"
        >
          Previous
        </button>
        <span className={styles.tablePaginationPage}>
          Page {pageIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          className={styles.inviteSecondaryButton}
          disabled={!canNext}
          onClick={() => onPageIndexChange(pageIndex + 1)}
          aria-label="Next page"
        >
          Next
        </button>
        <button
          type="button"
          className={styles.inviteSecondaryButton}
          disabled={!canNext}
          onClick={() => onPageIndexChange(pageCount - 1)}
          aria-label="Last page"
        >
          Last
        </button>
      </div>
    </div>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

function TruncatedText({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > COMMENT_PREVIEW_LENGTH;
  const preview = shouldTruncate
    ? `${text.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}…`
    : text;

  if (!shouldTruncate) {
    return <span className={styles.commentText}>{text}</span>;
  }

  return (
    <span className={styles.commentText}>
      {expanded ? text : preview}{" "}
      <button
        type="button"
        className={styles.commentToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Show less" : "Show more"} for ${label}`}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "View less" : "View more"}
      </button>
    </span>
  );
}

function ResponseDataTable({
  items,
  ariaLabel = "Survey responses",
  canManage = false,
  onManaged,
}: {
  items: DashboardInsight[];
  ariaLabel?: string;
  canManage?: boolean;
  onManaged?: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function excludeResponse(responseId: string) {
    if (
      !window.confirm(
        "Exclude this response from KPIs and public aggregates? It will remain in the audit trail."
      )
    ) {
      return;
    }
    setBusyId(responseId);
    setActionError("");
    try {
      const response = await fetch(`/api/responses/${responseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Excluded by admin from dashboard" }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Unable to exclude response.");
      }
      onManaged?.();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to exclude response."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteResponse(responseId: string) {
    if (
      !window.confirm(
        "Permanently delete this survey response? This cannot be undone."
      )
    ) {
      return;
    }
    setBusyId(responseId);
    setActionError("");
    try {
      const response = await fetch(`/api/responses/${responseId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Unable to delete response.");
      }
      onManaged?.();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete response."
      );
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<ColumnDef<DashboardInsight, unknown>[]>(
    () => [
      {
        id: "submitted",
        header: "Submitted",
        meta: { width: "92px" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <>
              <strong>{formatDate(item.submittedAt)}</strong>
              <small>{formatTime(item.submittedAt)}</small>
            </>
          );
        },
      },
      {
        id: "respondent",
        header: "Respondent",
        meta: { width: "118px" },
        cell: ({ row }) => (
          <strong className={styles.tableCellText}>
            {row.original.client?.name ?? "Not provided"}
          </strong>
        ),
      },
      {
        id: "company",
        header: "Company",
        meta: { width: "108px" },
        cell: ({ row }) => (
          <span className={styles.tableCellText}>
            {row.original.client?.company ?? "Not provided"}
          </span>
        ),
      },
      {
        id: "designation",
        header: "Designation",
        meta: { width: "100px" },
        cell: ({ row }) => (
          <span className={styles.tableCellText}>
            {row.original.client?.designation ?? "Not provided"}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        meta: { width: "140px" },
        cell: ({ row }) => (
          <span className={styles.tableCellText}>
            {row.original.client?.email?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "source",
        header: "Source",
        meta: { width: "68px" },
        cell: ({ row }) => (
          <span className={styles.channel}>{row.original.source}</span>
        ),
      },
      {
        id: "csat",
        header: "CSAT score",
        meta: { width: "64px", cellClassName: styles.scoreCell },
        cell: ({ row }) =>
          scoreBadge(metricValue(row.original, "csat"), 5),
      },
      {
        id: "ces",
        header: "CES score",
        meta: { width: "64px", cellClassName: styles.scoreCell },
        cell: ({ row }) =>
          scoreBadge(metricValue(row.original, "ces"), 7),
      },
      {
        id: "nps",
        header: "NPS score",
        meta: { width: "64px", cellClassName: styles.scoreCell },
        cell: ({ row }) =>
          scoreBadge(metricValue(row.original, "nps"), 10),
      },
      {
        id: "comments",
        header: "Comments",
        meta: { width: "72px" },
        cell: ({ row }) => (
          <ResponseComments answers={row.original.answers} />
        ),
      },
      {
        id: "transcript",
        header: "Transcript",
        meta: { width: "96px" },
        cell: ({ row }) => (
          <ResponseTranscript responseId={row.original.responseId} />
        ),
      },
      {
        id: "insight",
        header: "Insight",
        meta: { width: "130px" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <details>
              <summary>{item.sentiment ?? "Pending"}</summary>
              {item.summary ? (
                <TruncatedText text={item.summary} label="AI insight summary" />
              ) : (
                <p>Insight enrichment pending</p>
              )}
              {item.riskSignals.length ? (
                <small>Risk: {item.riskSignals.join(", ")}</small>
              ) : null}
              {item.nextSteps.length ? (
                <small>Next: {item.nextSteps.join(", ")}</small>
              ) : null}
            </details>
          );
        },
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "Admin",
              meta: { width: "120px" },
              cell: ({ row }: { row: { original: DashboardInsight } }) => {
                const responseId = row.original.responseId;
                const busy = busyId === responseId;
                return (
                  <div className={styles.responseAdminActions}>
                    <button
                      type="button"
                      className={styles.inviteTableAction}
                      disabled={busy}
                      onClick={() => void excludeResponse(responseId)}
                    >
                      Exclude
                    </button>
                    <button
                      type="button"
                      className={styles.inviteTableAction}
                      disabled={busy}
                      onClick={() => void deleteResponse(responseId)}
                    >
                      Delete
                    </button>
                  </div>
                );
              },
            } satisfies ColumnDef<DashboardInsight, unknown>,
          ]
        : []),
    ],
    [busyId, canManage]
  );

  return (
    <>
      {actionError ? (
        <p className={styles.message} data-tone="error">
          {actionError}
        </p>
      ) : null}
      <CompactDataTable
        ariaLabel={ariaLabel}
        columns={columns}
        data={items}
        getRowId={(item) => item.responseId}
        minWidth={0}
        maxHeight="none"
      />
    </>
  );
}

function scoreBadge(value: number | null, max: number) {
  return (
    <span className={styles.ratingBadge}>
      {value === null ? "—" : `${value}/${max}`}
    </span>
  );
}

function DashboardMessage({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <p className={styles.message} data-tone={tone}>
      {children}
    </p>
  );
}

function metricValue(item: DashboardInsight, metric: "csat" | "ces" | "nps") {
  const direct = item.metrics?.[metric];
  if (typeof direct === "number") return direct;
  const answer = item.answers.find(
    (candidate) =>
      candidate.metric === metric ||
      candidate.questionNumber ===
        ({ csat: 1, ces: 2, nps: 3 } as const)[metric]
  );
  return answer?.rating ?? null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
